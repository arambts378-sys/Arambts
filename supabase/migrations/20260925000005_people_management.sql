-- 20260925000005_people_management.sql

-- 0. Helper Function for RBAC
CREATE OR REPLACE FUNCTION public.has_permission(workspace_id UUID, required_permission TEXT)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_members wm
    JOIN public.role_permissions rp ON wm.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE wm.workspace_id = $1 
    AND wm.user_id = auth.uid()
    AND p.name = $2
  );
$$;

-- 1. Create Permissions
INSERT INTO public.permissions (name) VALUES 
('people.view'),
('people.create'),
('people.update'),
('people.manage')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign Permissions to Roles
-- workspace_owner: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('people.view', 'people.create', 'people.update', 'people.manage')
ON CONFLICT DO NOTHING;

-- admin: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('people.view', 'people.create', 'people.update', 'people.manage')
ON CONFLICT DO NOTHING;

-- editor: view, create, update
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('people.view', 'people.create', 'people.update')
ON CONFLICT DO NOTHING;

-- member: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('people.view')
ON CONFLICT DO NOTHING;

-- viewer: view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name IN ('people.view')
ON CONFLICT DO NOTHING;

-- 3. Create Tables
CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  job_title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, email)
);

CREATE TABLE public.event_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('attendee', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(event_id, person_id, person_type)
);

-- 4. Cross-workspace Data Integrity Trigger
-- Ensure that when linking a person to an event, the person's workspace matches the event's workspace
CREATE OR REPLACE FUNCTION public.check_event_person_workspace_match()
RETURNS TRIGGER AS $$
DECLARE
  v_person_workspace_id UUID;
  v_event_workspace_id UUID;
BEGIN
  -- Get the workspace of the person
  SELECT workspace_id INTO v_person_workspace_id FROM public.people WHERE id = NEW.person_id;
  
  -- Get the workspace of the event
  SELECT workspace_id INTO v_event_workspace_id FROM public.events WHERE id = NEW.event_id;

  IF v_person_workspace_id != v_event_workspace_id THEN
    RAISE EXCEPTION 'Cross-workspace data integrity violation: person workspace % does not match event workspace %', v_person_workspace_id, v_event_workspace_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_event_person_workspace_match
BEFORE INSERT OR UPDATE ON public.event_people
FOR EACH ROW EXECUTE FUNCTION public.check_event_person_workspace_match();

-- 5. RLS Policies
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_people ENABLE ROW LEVEL SECURITY;

-- People: Select (Requires people.view permission)
CREATE POLICY "Enable read access for authorized users" ON public.people
  FOR SELECT USING (
    public.is_workspace_member(workspace_id) AND 
    public.has_permission(workspace_id, 'people.view')
  );

-- People: Insert (Requires people.create permission)
CREATE POLICY "Enable insert for authorized users" ON public.people
  FOR INSERT WITH CHECK (
    public.is_workspace_member(workspace_id) AND 
    public.has_permission(workspace_id, 'people.create')
  );

-- People: Update (Requires people.update permission)
CREATE POLICY "Enable update for authorized users" ON public.people
  FOR UPDATE USING (
    public.is_workspace_member(workspace_id) AND 
    public.has_permission(workspace_id, 'people.update')
  ) WITH CHECK (
    public.is_workspace_member(workspace_id) AND 
    public.has_permission(workspace_id, 'people.update')
  );

-- People: Delete (Requires people.manage permission)
CREATE POLICY "Enable delete for authorized users" ON public.people
  FOR DELETE USING (
    public.is_workspace_member(workspace_id) AND 
    public.has_permission(workspace_id, 'people.manage')
  );

-- Event People: Select
CREATE POLICY "Enable read access for event_people" ON public.event_people
  FOR SELECT USING (
    public.is_workspace_member((SELECT workspace_id FROM public.events WHERE id = event_id)) AND
    public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'people.view')
  );

-- Event People: Insert
CREATE POLICY "Enable insert for event_people" ON public.event_people
  FOR INSERT WITH CHECK (
    public.is_workspace_member((SELECT workspace_id FROM public.events WHERE id = event_id)) AND
    public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'people.create')
  );

-- Event People: Update
CREATE POLICY "Enable update for event_people" ON public.event_people
  FOR UPDATE USING (
    public.is_workspace_member((SELECT workspace_id FROM public.events WHERE id = event_id)) AND
    public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'people.update')
  ) WITH CHECK (
    public.is_workspace_member((SELECT workspace_id FROM public.events WHERE id = event_id)) AND
    public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'people.update')
  );

-- Event People: Delete
CREATE POLICY "Enable delete for event_people" ON public.event_people
  FOR DELETE USING (
    public.is_workspace_member((SELECT workspace_id FROM public.events WHERE id = event_id)) AND
    public.has_permission((SELECT workspace_id FROM public.events WHERE id = event_id), 'people.manage')
  );
