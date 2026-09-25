-- 20260925000006_speaker_management.sql

-- 1. Create Permissions
INSERT INTO public.permissions (name) VALUES 
('speakers.view'),
('speakers.create'),
('speakers.update'),
('speakers.manage')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign Permissions to Roles
-- workspace_owner: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('speakers.view', 'speakers.create', 'speakers.update', 'speakers.manage')
ON CONFLICT DO NOTHING;

-- admin: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('speakers.view', 'speakers.create', 'speakers.update', 'speakers.manage')
ON CONFLICT DO NOTHING;

-- editor: view, create, update
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('speakers.view', 'speakers.create', 'speakers.update')
ON CONFLICT DO NOTHING;

-- member: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('speakers.view')
ON CONFLICT DO NOTHING;

-- viewer: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name IN ('speakers.view')
ON CONFLICT DO NOTHING;

-- 3. Update event_people person_type constraint
ALTER TABLE public.event_people DROP CONSTRAINT IF EXISTS event_people_person_type_check;
ALTER TABLE public.event_people ADD CONSTRAINT event_people_person_type_check CHECK (person_type IN ('attendee', 'staff', 'speaker'));

-- 4. Create event_speakers table
CREATE TABLE public.event_speakers (
  event_person_id UUID PRIMARY KEY REFERENCES public.event_people(id) ON DELETE CASCADE NOT NULL,
  headline TEXT,
  bio TEXT,
  website_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure that the referenced event_people record actually has person_type = 'speaker'
CREATE OR REPLACE FUNCTION public.check_event_speaker_type()
RETURNS TRIGGER AS $$
DECLARE
  v_person_type TEXT;
BEGIN
  SELECT person_type INTO v_person_type FROM public.event_people WHERE id = NEW.event_person_id;
  
  IF v_person_type != 'speaker' THEN
    RAISE EXCEPTION 'Data integrity violation: event_speakers must reference an event_people record with person_type = speaker';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_event_speaker_type
BEFORE INSERT OR UPDATE ON public.event_speakers
FOR EACH ROW EXECUTE FUNCTION public.check_event_speaker_type();

-- 5. RLS Policies
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;

-- We can deduce workspace_id via the event_people -> events relationship
-- We'll create a small helper for RLS brevity
CREATE OR REPLACE FUNCTION public.get_workspace_from_event_person(p_event_person_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT e.workspace_id 
  FROM public.event_people ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE ep.id = p_event_person_id;
$$;

-- Event Speakers: Select
CREATE POLICY "Enable read access for event_speakers" ON public.event_speakers
  FOR SELECT USING (
    public.is_workspace_member(public.get_workspace_from_event_person(event_person_id)) AND
    public.has_permission(public.get_workspace_from_event_person(event_person_id), 'speakers.view')
  );

-- Event Speakers: Insert
CREATE POLICY "Enable insert for event_speakers" ON public.event_speakers
  FOR INSERT WITH CHECK (
    public.is_workspace_member(public.get_workspace_from_event_person(event_person_id)) AND
    public.has_permission(public.get_workspace_from_event_person(event_person_id), 'speakers.create')
  );

-- Event Speakers: Update
CREATE POLICY "Enable update for event_speakers" ON public.event_speakers
  FOR UPDATE USING (
    public.is_workspace_member(public.get_workspace_from_event_person(event_person_id)) AND
    public.has_permission(public.get_workspace_from_event_person(event_person_id), 'speakers.update')
  ) WITH CHECK (
    public.is_workspace_member(public.get_workspace_from_event_person(event_person_id)) AND
    public.has_permission(public.get_workspace_from_event_person(event_person_id), 'speakers.update')
  );

-- Event Speakers: Delete
CREATE POLICY "Enable delete for event_speakers" ON public.event_speakers
  FOR DELETE USING (
    public.is_workspace_member(public.get_workspace_from_event_person(event_person_id)) AND
    public.has_permission(public.get_workspace_from_event_person(event_person_id), 'speakers.manage')
  );
