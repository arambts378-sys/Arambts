-- 20260926000004_integration_jobs.sql

-- 1. Create integration_jobs table
CREATE TABLE public.integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google_sheets', 'whatsapp', 'qr', 'crm', 'webhook')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMPTZ NULL,
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL
);

-- Indexes for efficient queuing
CREATE INDEX idx_integration_jobs_queue ON public.integration_jobs(status, next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_integration_jobs_event ON public.integration_jobs(event_id);
CREATE INDEX idx_integration_jobs_registration ON public.integration_jobs(registration_id);
CREATE INDEX idx_integration_jobs_stale ON public.integration_jobs(status, locked_at) WHERE status = 'processing';

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_integration_jobs
  BEFORE UPDATE ON public.integration_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. RLS for integration_jobs
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for event organizers" ON public.integration_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.view')
    )
  );

-- Only allow update for organizers (e.g., manual retry), but strictly limited
CREATE POLICY "Enable update for event organizers" ON public.integration_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id AND public.is_workspace_member(e.workspace_id)
      AND public.has_permission(e.workspace_id, 'events.manage')
    )
  );

-- No INSERT or DELETE from client. Insert happens via RPC, Delete is not allowed (audit trail).

-- 3. Modify submit_event_registration to atomically create jobs
CREATE OR REPLACE FUNCTION public.submit_event_registration(
  p_event_id UUID,
  p_person_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB owner to bypass RLS for this specific controlled operation
SET search_path = public -- Secure search path
AS $$
DECLARE
  v_workspace_id UUID;
  v_settings RECORD;
  v_active_count INTEGER;
  v_email TEXT;
  v_person_id UUID;
  v_event_person_id UUID;
  v_registration_id UUID;
  v_registration_number TEXT;
  v_integration RECORD;
  v_idempotency_key TEXT;
  v_payload JSONB;
BEGIN
  -- 1. Validate event exists and get workspace
  SELECT workspace_id INTO v_workspace_id FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Lock Registration Settings for Capacity Enforcement
  SELECT * INTO v_settings 
  FROM public.event_registration_settings 
  WHERE event_id = p_event_id 
  FOR UPDATE;

  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RAISE EXCEPTION 'Registration is not enabled for this event';
  END IF;

  -- 3. Check Capacity
  IF v_settings.capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active_count 
    FROM public.registrations 
    WHERE event_id = p_event_id AND status IN ('pending', 'confirmed');

    IF v_active_count >= v_settings.capacity THEN
      RAISE EXCEPTION 'Capacity reached';
    END IF;
  END IF;

  -- 4. Normalize Email
  v_email := lower(trim(p_person_data->>'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- 5. Find or Create Person Identity
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

  -- 6. Find or Create event_people relationship
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

  -- 7. Check Duplicate Active Registration
  IF EXISTS (
    SELECT 1 FROM public.registrations 
    WHERE event_id = p_event_id AND person_id = v_person_id AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'An active registration already exists for this event.';
  END IF;

  -- 8. Generate Registration Number
  v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));

  -- 9. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    registration_number,
    status,
    confirmation_status,
    confirmed_at,
    metadata
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_registration_number,
    'confirmed',
    'confirmed',
    now(),
    '{"source": "public"}'::jsonb
  ) RETURNING id INTO v_registration_id;

  -- 10. Automatically Create Integration Jobs for active providers
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
