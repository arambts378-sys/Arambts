-- 20260926000001_attendee_imports.sql

CREATE TABLE public.event_attendee_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  existing_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_attendee_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read imports for organizers" ON public.event_attendee_imports
  FOR SELECT USING (
    public.is_workspace_member(workspace_id) AND
    public.has_permission(workspace_id, 'people.view')
  );

CREATE OR REPLACE FUNCTION public.import_attendees(
  p_workspace_id UUID,
  p_event_id UUID,
  p_file_name TEXT,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN;
  v_event_workspace_id UUID;
  v_row JSONB;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_organization TEXT;
  v_job_title TEXT;
  
  v_person_id UUID;
  v_event_person_id UUID;
  v_registration_id UUID;
  v_registration_number TEXT;
  
  -- Metrics
  v_total_rows INTEGER := 0;
  v_imported_count INTEGER := 0;
  v_existing_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_error_count INTEGER := 0;
  
  v_errors JSONB := '[]'::jsonb;
  v_processed_emails TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Authentication & Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT workspace_id INTO v_event_workspace_id FROM public.events WHERE id = p_event_id;
  IF v_event_workspace_id != p_workspace_id THEN
    RAISE EXCEPTION 'Event does not belong to the specified workspace';
  END IF;

  v_has_permission := public.has_permission(p_workspace_id, 'people.create');
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied. Requires people.create';
  END IF;

  -- 2. Process Rows
  IF jsonb_typeof(p_rows) != 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;
  
  v_total_rows := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    BEGIN
      -- Extract and normalize
      v_email := lower(trim(v_row->>'email'));
      v_first_name := trim(v_row->>'first_name');
      v_last_name := trim(v_row->>'last_name');
      v_phone := trim(v_row->>'phone');
      v_organization := trim(v_row->>'organization');
      v_job_title := trim(v_row->>'job_title');

      -- Validation
      IF v_email IS NULL OR v_email = '' THEN
        RAISE EXCEPTION 'Missing email';
      END IF;
      
      IF v_first_name IS NULL OR v_first_name = '' THEN
        RAISE EXCEPTION 'Missing first name';
      END IF;

      -- Check in-file duplicates
      IF v_email = ANY(v_processed_emails) THEN
        v_duplicate_count := v_duplicate_count + 1;
        -- Skip to next row
        CONTINUE;
      END IF;
      
      v_processed_emails := array_append(v_processed_emails, v_email);

      -- Find or Create Person
      SELECT id INTO v_person_id 
      FROM public.people 
      WHERE workspace_id = p_workspace_id AND email = v_email;

      IF NOT FOUND THEN
        INSERT INTO public.people (workspace_id, first_name, last_name, email, phone, organization, job_title)
        VALUES (p_workspace_id, v_first_name, v_last_name, v_email, v_phone, v_organization, v_job_title)
        RETURNING id INTO v_person_id;
        v_imported_count := v_imported_count + 1;
      ELSE
        v_existing_count := v_existing_count + 1;
        -- Do not overwrite existing person data unless empty, to prevent malicious updates
      END IF;

      -- Find or Create event_people
      SELECT id INTO v_event_person_id 
      FROM public.event_people 
      WHERE event_id = p_event_id AND person_id = v_person_id AND person_type = 'attendee';

      IF NOT FOUND THEN
        INSERT INTO public.event_people (event_id, person_id, person_type, status)
        VALUES (p_event_id, v_person_id, 'attendee', 'active')
        RETURNING id INTO v_event_person_id;
      END IF;

      -- Create Registration (without consuming capacity)
      -- Check if they already have an active registration
      IF NOT EXISTS (
        SELECT 1 FROM public.registrations 
        WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
      ) THEN
        v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));
        
        INSERT INTO public.registrations (
          event_id, person_id, event_person_id, registration_number, 
          status, confirmation_status, confirmed_at, metadata
        ) VALUES (
          p_event_id, v_person_id, v_event_person_id, v_registration_number,
          'confirmed', 'confirmed', now(), '{"source": "import"}'::jsonb
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'email', v_row->>'email',
        'first_name', v_row->>'first_name',
        'error', SQLERRM
      );
    END;
  END LOOP;

  -- 3. Log Audit Record
  INSERT INTO public.event_attendee_imports (
    event_id, workspace_id, imported_by, file_name, 
    total_rows, imported_count, existing_count, duplicate_count, error_count
  ) VALUES (
    p_event_id, p_workspace_id, v_user_id, p_file_name,
    v_total_rows, v_imported_count, v_existing_count, v_duplicate_count, v_error_count
  );

  RETURN jsonb_build_object(
    'success', true,
    'metrics', jsonb_build_object(
      'total_rows', v_total_rows,
      'imported_count', v_imported_count,
      'existing_count', v_existing_count,
      'duplicate_count', v_duplicate_count,
      'error_count', v_error_count
    ),
    'errors', v_errors
  );
END;
$$;
