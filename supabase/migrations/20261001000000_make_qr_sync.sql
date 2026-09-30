-- 20261001000000_make_qr_sync.sql

-- 1. Modify submit_event_registration to remove qr_generation job queuing
CREATE OR REPLACE FUNCTION public.submit_event_registration(
  p_event_id UUID,
  p_person_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_event RECORD;
  v_settings RECORD;
  v_active_count INTEGER;
  v_email TEXT;
  v_person_id UUID;
  v_event_person_id UUID;
  v_registration_id UUID;
  v_registration_number TEXT;
  v_distance_category_id UUID;
  v_distance_category RECORD;
  v_distance_active_count INTEGER;
  v_metadata JSONB;
  
  v_integration RECORD;
  v_idempotency_key TEXT;
  v_payload JSONB;
BEGIN
  -- 1. Validate event exists and get workspace
  SELECT id, workspace_id, type INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  v_workspace_id := v_event.workspace_id;

  -- 2. Lock Registration Settings for Capacity Enforcement
  SELECT * INTO v_settings 
  FROM public.event_registration_settings 
  WHERE event_id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RAISE EXCEPTION 'Registration is not enabled for this event';
  END IF;

  -- 3. Walkathon Specific Validation & Locking
  v_distance_category_id := (p_person_data->>'distance_category_id')::UUID;
  
  IF v_event.type = 'Walkathon' THEN
    IF v_distance_category_id IS NULL THEN
        RAISE EXCEPTION 'Distance category is required for Walkathon registrations';
    END IF;

    -- Lock the specific distance category for concurrency safety
    SELECT * INTO v_distance_category 
    FROM public.walkathon_distance_categories 
    WHERE id = v_distance_category_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Distance category not found';
    END IF;

    IF v_distance_category.event_id != p_event_id THEN
        RAISE EXCEPTION 'Distance category belongs to a different event';
    END IF;

    IF NOT v_distance_category.is_active THEN
        RAISE EXCEPTION 'This distance category is currently closed';
    END IF;

    -- Enforce Distance Category Capacity
    IF v_distance_category.capacity IS NOT NULL THEN
        SELECT COUNT(*) INTO v_distance_active_count 
        FROM public.registrations 
        WHERE distance_category_id = v_distance_category_id AND status IN ('pending', 'confirmed');

        IF v_distance_active_count >= v_distance_category.capacity THEN
            RAISE EXCEPTION 'Capacity reached for this distance category';
        END IF;
    END IF;
  ELSIF v_distance_category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Distance category can only be provided for Walkathon events';
  END IF;

  -- 4. Check Global Event Capacity
  IF v_settings.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count 
    FROM public.registrations 
    WHERE event_id = p_event_id AND status IN ('pending', 'confirmed');

    IF v_active_count >= v_settings.capacity THEN
      RAISE EXCEPTION 'Event capacity reached';
    END IF;
  END IF;

  -- 5. Normalize Email
  v_email := lower(trim(p_person_data->>'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- 6. Find or Create Person Identity
  SELECT id INTO v_person_id 
  FROM public.people 
  WHERE workspace_id = v_workspace_id AND email = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.people (
      workspace_id, 
      first_name, 
      last_name, 
      email, 
      phone, 
      organization, 
      job_title
    ) VALUES (
      v_workspace_id,
      p_person_data->>'first_name',
      p_person_data->>'last_name',
      v_email,
      p_person_data->>'phone',
      p_person_data->>'organization',
      p_person_data->>'job_title'
    ) RETURNING id INTO v_person_id;
  END IF;

  -- 7. Find or Create event_people relationship
  SELECT id INTO v_event_person_id 
  FROM public.event_people 
  WHERE event_id = p_event_id AND person_id = v_person_id AND person_type = 'attendee';

  IF NOT FOUND THEN
    INSERT INTO public.event_people (
      event_id,
      person_id,
      person_type,
      status
    ) VALUES (
      p_event_id,
      v_person_id,
      'attendee',
      'active'
    ) RETURNING id INTO v_event_person_id;
  END IF;

  -- 8. Check Duplicate Active Registration
  IF EXISTS (
    SELECT 1 FROM public.registrations 
    WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'An active registration already exists for this event.';
  END IF;

  -- 9. Generate Registration Number
  v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));

  -- 10. Extract unhandled fields to Metadata (if any)
  v_metadata := '{}'::jsonb;

  -- 11. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    registration_number,
    status,
    confirmation_status,
    confirmed_at,
    distance_category_id,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
    v_distance_category_id,
    v_metadata
  ) RETURNING id INTO v_registration_id;

  -- 12. Create walkathon_participants record if Walkathon
  IF v_event.type = 'Walkathon' THEN
    INSERT INTO public.walkathon_participants (
      registration_id,
      gender,
      date_of_birth,
      age,
      t_shirt_size,
      emergency_contact_name,
      emergency_contact_phone,
      city,
      medical_notes
    ) VALUES (
      v_registration_id,
      p_person_data->>'gender',
      (p_person_data->>'date_of_birth')::DATE,
      (p_person_data->>'age')::INTEGER,
      p_person_data->>'t_shirt_size',
      p_person_data->>'emergency_contact_name',
      p_person_data->>'emergency_contact_phone',
      p_person_data->>'city',
      p_person_data->>'medical_notes'
    );
  END IF;

  -- 13. Create general integration jobs (skip email, handled by QR delivery enqueue)
  v_payload := jsonb_build_object(
    'registrationId', v_registration_id,
    'registrationNumber', v_registration_number,
    'attendee', jsonb_build_object(
      'firstName', p_person_data->>'first_name',
      'lastName', p_person_data->>'last_name',
      'email', v_email,
      'phone', p_person_data->>'phone'
    )
  );

  FOR v_integration IN 
    SELECT provider FROM public.event_integrations 
    WHERE event_id = p_event_id AND is_active = true
  LOOP
    IF v_integration.provider = 'email' THEN
      CONTINUE;
    END IF;

    v_idempotency_key := p_event_id::text || ':' || v_registration_id::text || ':' || v_integration.provider || ':registration_confirmed';
    
    INSERT INTO public.integration_jobs (
      event_id,
      registration_id,
      provider,
      event_type,
      payload,
      idempotency_key,
      next_attempt_at
    ) VALUES (
      p_event_id,
      v_registration_id,
      v_integration.provider,
      'registration_confirmed',
      v_payload,
      v_idempotency_key,
      now() -- Attempt immediately
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  -- Return Result
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;


-- 2. Modify import_attendees to remove qr_generation job queuing
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
  v_event RECORD;
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
  v_distance_category_id UUID;
  v_distance_category RECORD;
  v_distance_active_count INTEGER;
  
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

  SELECT id, workspace_id, type INTO v_event FROM public.events WHERE id = p_event_id;
  IF v_event.workspace_id != p_workspace_id THEN
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
        CONTINUE;
      END IF;
      
      v_processed_emails := array_append(v_processed_emails, v_email);

      -- Walkathon Validations
      v_distance_category_id := (v_row->>'distance_category_id')::UUID;
      IF v_event.type = 'Walkathon' THEN
        IF v_distance_category_id IS NULL THEN
          RAISE EXCEPTION 'Distance category is required for Walkathon registrations';
        END IF;

        -- We lock here inside the loop for each valid row. 
        SELECT * INTO v_distance_category 
        FROM public.walkathon_distance_categories 
        WHERE id = v_distance_category_id FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Distance category not found';
        END IF;

        IF v_distance_category.event_id != p_event_id THEN
          RAISE EXCEPTION 'Distance category belongs to a different event';
        END IF;

        IF NOT v_distance_category.is_active THEN
          RAISE EXCEPTION 'This distance category is currently closed';
        END IF;

        IF v_distance_category.capacity IS NOT NULL THEN
          SELECT COUNT(*) INTO v_distance_active_count 
          FROM public.registrations 
          WHERE distance_category_id = v_distance_category_id AND status IN ('pending', 'confirmed');

          IF v_distance_active_count >= v_distance_category.capacity THEN
              RAISE EXCEPTION 'Capacity reached for this distance category';
          END IF;
        END IF;
      END IF;

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

      -- Create Registration
      IF NOT EXISTS (
        SELECT 1 FROM public.registrations 
        WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
      ) THEN
        v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));
        
        INSERT INTO public.registrations (
          event_id, person_id, event_person_id, registration_number, 
          status, confirmation_status, confirmed_at, distance_category_id, metadata
        ) VALUES (
          p_event_id, v_person_id, v_event_person_id, v_registration_number,
          'confirmed', 'confirmed', now(), v_distance_category_id, '{"source": "import"}'::jsonb
        ) RETURNING id INTO v_registration_id;

        IF v_event.type = 'Walkathon' THEN
            INSERT INTO public.walkathon_participants (
              registration_id,
              gender,
              date_of_birth,
              age,
              t_shirt_size,
              emergency_contact_name,
              emergency_contact_phone,
              city,
              medical_notes
            ) VALUES (
              v_registration_id,
              v_row->>'gender',
              (v_row->>'date_of_birth')::DATE,
              (v_row->>'age')::INTEGER,
              v_row->>'t_shirt_size',
              v_row->>'emergency_contact_name',
              v_row->>'emergency_contact_phone',
              v_row->>'city',
              v_row->>'medical_notes'
            );
        END IF;

        -- We do not enqueue qr_generation here anymore. We can generate them later synchronously or via separate API call.
      ELSE
        RAISE EXCEPTION 'Participant already has an active registration for this event';
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
