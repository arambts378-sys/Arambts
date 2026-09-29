-- 20260927000007_fix_volunteer_permissions.sql

-- Ensure permissions exist
INSERT INTO public.permissions (id, name) VALUES 
  (gen_random_uuid(), 'volunteers.view'),
  (gen_random_uuid(), 'volunteers.manage')
ON CONFLICT (name) DO NOTHING;

-- Safely map permissions to roles using ON CONFLICT DO NOTHING (assumes PRIMARY KEY (role_id, permission_id) exists on role_permissions)

-- workspace_owner gets view and manage
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- admin gets view and manage
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- editor gets view and manage
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('volunteers.view', 'volunteers.manage')
ON CONFLICT DO NOTHING;

-- member gets view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name = 'volunteers.view'
ON CONFLICT DO NOTHING;

-- viewer gets view only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name = 'volunteers.view'
ON CONFLICT DO NOTHING;
