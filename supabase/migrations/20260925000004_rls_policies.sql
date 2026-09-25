-- 004_rls_policies.sql

-- Helper Function to avoid recursive RLS on workspace_members
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    WHERE wm.workspace_id = $1 
    AND wm.user_id = auth.uid()
  );
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- Profiles: Users can see their own profile. Anyone in the same workspace can see each other's profiles.
-- For simplicity: Users can read all profiles (safe standard in many SaaS, but let's restrict to own for now to be safe)
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING ( auth.uid() = id );
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING ( auth.uid() = id );

-- Roles and Permissions: Read-only for authenticated users
CREATE POLICY "Anyone can read roles" 
  ON public.roles FOR SELECT 
  USING ( auth.role() = 'authenticated' );
CREATE POLICY "Anyone can read permissions" 
  ON public.permissions FOR SELECT 
  USING ( auth.role() = 'authenticated' );
CREATE POLICY "Anyone can read role_permissions" 
  ON public.role_permissions FOR SELECT 
  USING ( auth.role() = 'authenticated' );

-- Workspaces: Users can view workspaces they are members of
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING ( public.is_workspace_member(id) );
-- Only owner can update the workspace
CREATE POLICY "Owners can update workspace"
  ON public.workspaces FOR UPDATE
  USING ( owner_id = auth.uid() );

-- Workspace Members: Users can view members of workspaces they belong to
CREATE POLICY "Users can view members of their workspaces"
  ON public.workspace_members FOR SELECT
  USING ( public.is_workspace_member(workspace_id) );
-- Users can leave a workspace
CREATE POLICY "Users can delete own membership"
  ON public.workspace_members FOR DELETE
  USING ( user_id = auth.uid() );

-- Events: Strict isolation by workspace
CREATE POLICY "Users can view events in their workspaces"
  ON public.events FOR SELECT
  USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "Users can insert events in their workspaces"
  ON public.events FOR INSERT
  WITH CHECK ( public.is_workspace_member(workspace_id) );

CREATE POLICY "Users can update events in their workspaces"
  ON public.events FOR UPDATE
  USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "Users can delete events in their workspaces"
  ON public.events FOR DELETE
  USING ( public.is_workspace_member(workspace_id) );
