-- 002_seed_roles_permissions.sql

-- Insert Roles
INSERT INTO public.roles (id, name) VALUES 
  (gen_random_uuid(), 'workspace_owner'),
  (gen_random_uuid(), 'admin'),
  (gen_random_uuid(), 'editor'),
  (gen_random_uuid(), 'member'),
  (gen_random_uuid(), 'viewer')
ON CONFLICT (name) DO NOTHING;

-- Insert Permissions
INSERT INTO public.permissions (id, name) VALUES 
  (gen_random_uuid(), 'workspace.read'),
  (gen_random_uuid(), 'workspace.update'),
  (gen_random_uuid(), 'members.read'),
  (gen_random_uuid(), 'members.invite'),
  (gen_random_uuid(), 'members.update'),
  (gen_random_uuid(), 'members.remove'),
  (gen_random_uuid(), 'events.read'),
  (gen_random_uuid(), 'events.create'),
  (gen_random_uuid(), 'events.update'),
  (gen_random_uuid(), 'events.delete'),
  (gen_random_uuid(), 'events.publish')
ON CONFLICT (name) DO NOTHING;

-- Map Permissions to Roles (Basic mapping)
-- workspace_owner gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'workspace_owner'
ON CONFLICT DO NOTHING;

-- admin gets most permissions (e.g. all but workspace.update)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'admin' AND p.name != 'workspace.update'
ON CONFLICT DO NOTHING;

-- editor gets event permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'editor' AND p.name IN ('workspace.read', 'events.read', 'events.create', 'events.update', 'events.publish')
ON CONFLICT DO NOTHING;

-- member gets basic read and manage events
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN ('workspace.read', 'events.read', 'events.create', 'events.update')
ON CONFLICT DO NOTHING;

-- viewer gets read only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'viewer' AND p.name IN ('workspace.read', 'events.read')
ON CONFLICT DO NOTHING;
