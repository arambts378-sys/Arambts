-- 20260925000007_registration_management.sql

-- 1. Create Permissions
INSERT INTO public.permissions (name) VALUES 
('registrations.view'),
('registrations.create'),
('registrations.update'),
('registrations.manage')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign Permissions to Roles
-- workspace_owner: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('registrations.view', 'registrations.create', 'registrations.update', 'registrations.manage')
ON CONFLICT DO NOTHING;

-- admin: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('registrations.view', 'registrations.create', 'registrations.update', 'registrations.manage')
ON CONFLICT DO NOTHING;

-- editor: view, create, update
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('registrations.view', 'registrations.create', 'registrations.update')
ON CONFLICT DO NOTHING;

-- member: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('registrations.view')
ON CONFLICT DO NOTHING;

-- viewer: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name IN ('registrations.view')
ON CONFLICT DO NOTHING;

-- 3. Registration Settings Table
CREATE TABLE public.event_registration_settings (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  description TEXT,
  capacity INTEGER NULL CHECK (capacity IS NULL OR capacity >= 1),
  confirmation_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Registrations Table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id),
  event_person_id UUID NOT NULL REFERENCES public.event_people(id),
  registration_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'failed')),
  confirmation_status TEXT NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'failed')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX idx_registrations_person_id ON public.registrations(person_id);
CREATE INDEX idx_registrations_event_person_id ON public.registrations(event_person_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
CREATE INDEX idx_registrations_registered_at ON public.registrations(registered_at);

-- Partial Unique Index to prevent multiple ACTIVE registrations
CREATE UNIQUE INDEX unique_active_registration ON public.registrations (event_id, person_id) WHERE status IN ('pending', 'confirmed');

-- 5. Trigger: Check event_people data integrity
CREATE OR REPLACE FUNCTION public.check_registration_attendee()
RETURNS TRIGGER AS $$
DECLARE
  v_person_type TEXT;
  v_ep_event_id UUID;
  v_ep_person_id UUID;
BEGIN
  SELECT person_type, event_id, person_id 
  INTO v_person_type, v_ep_event_id, v_ep_person_id 
  FROM public.event_people 
  WHERE id = NEW.event_person_id;
  
  IF v_person_type != 'attendee' THEN
    RAISE EXCEPTION 'Data integrity violation: Registration must reference an event_people record with person_type = attendee';
  END IF;

  IF v_ep_event_id != NEW.event_id THEN
    RAISE EXCEPTION 'Data integrity violation: Registration event_id must match event_people event_id';
  END IF;

  IF v_ep_person_id != NEW.person_id THEN
    RAISE EXCEPTION 'Data integrity violation: Registration person_id must match event_people person_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_registration_attendee
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.check_registration_attendee();

-- 6. RLS Policies

-- Settings RLS
ALTER TABLE public.event_registration_settings ENABLE ROW LEVEL SECURITY;

-- Helper to get workspace from event
CREATE OR REPLACE FUNCTION public.get_workspace_from_event(p_event_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM public.events WHERE id = p_event_id;
$$;

-- Organizer policies for settings
CREATE POLICY "Enable read settings for organizers" ON public.event_registration_settings
  FOR SELECT USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    public.has_permission(public.get_workspace_from_event(event_id), 'registrations.view')
  );

CREATE POLICY "Enable update settings for organizers" ON public.event_registration_settings
  FOR UPDATE USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    public.has_permission(public.get_workspace_from_event(event_id), 'registrations.manage')
  );
  
CREATE POLICY "Enable insert settings for organizers" ON public.event_registration_settings
  FOR INSERT WITH CHECK (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    public.has_permission(public.get_workspace_from_event(event_id), 'registrations.manage')
  );

-- Public policies for settings (Public users can view enabled settings)
CREATE POLICY "Enable read settings for public" ON public.event_registration_settings
  FOR SELECT USING (is_enabled = true);


-- Registrations RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Organizer policies for registrations
CREATE POLICY "Enable read registrations for organizers" ON public.registrations
  FOR SELECT USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    public.has_permission(public.get_workspace_from_event(event_id), 'registrations.view')
  );

CREATE POLICY "Enable update registrations for organizers" ON public.registrations
  FOR UPDATE USING (
    public.is_workspace_member(public.get_workspace_from_event(event_id)) AND
    public.has_permission(public.get_workspace_from_event(event_id), 'registrations.update')
  );

-- Note: We DO NOT add public INSERT/SELECT policies to registrations table directly.
-- Public users submit registrations ONLY via the secure RPC function below.

-- 7. Public Registration RPC Function
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
BEGIN
  -- 1. Validate event exists and get workspace
  SELECT workspace_id INTO v_workspace_id FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- 2. Lock Registration Settings for Capacity Enforcement
  -- If settings don't exist, we can't lock, so we check existence first.
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
  ELSE
    -- Optional: Update details if they exist but don't overwrite blindly
    -- For now, we reuse existing identity as-is to prevent malicious overwrites
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
  -- Format: ARAM-REG-XXXXXX
  v_registration_number := 'ARAM-REG-' || upper(substring(md5(random()::text), 1, 8));

  -- 9. Create Registration Record
  INSERT INTO public.registrations (
    event_id,
    person_id,
    event_person_id,
    registration_number,
    status,
    confirmation_status,
    confirmed_at
  ) VALUES (
    p_event_id,
    v_person_id,
    v_event_person_id,
    v_registration_number,
    'confirmed', -- Skip pending for simple public flow for now
    'confirmed',
    now()
  ) RETURNING id INTO v_registration_id;

  -- Return Result
  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_number', v_registration_number
  );
END;
$$;
