-- 003_auth_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  owner_role_id UUID;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Organizer'),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Create Default Workspace
  new_workspace_id := gen_random_uuid();
  INSERT INTO public.workspaces (id, name, slug, owner_id)
  VALUES (
    new_workspace_id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Personal') || ' Workspace',
    'ws-' || substr(md5(random()::text), 1, 8),
    new.id
  );

  -- 3. Get the workspace_owner role id
  SELECT id INTO owner_role_id FROM public.roles WHERE name = 'workspace_owner' LIMIT 1;

  -- 4. Create Workspace Membership
  IF owner_role_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
    VALUES (new_workspace_id, new.id, owner_role_id);
  END IF;

  RETURN new;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
