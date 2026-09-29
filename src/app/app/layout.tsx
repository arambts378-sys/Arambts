import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 1. Check if user has any active volunteer assignments
    const { data: assignments } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (assignments && assignments.length > 0) {
      // 2. Check if user has normal BTS application access.
      // A normal BTS user has permissions beyond basic viewing.
      // We check if they have 'events.create' or 'volunteers.manage' across any workspace.
      const { data: elevatedPerms } = await supabase
        .from('workspace_members')
        .select(`
          roles!inner (
            role_permissions!inner (
              permissions!inner (name)
            )
          )
        `)
        .eq('user_id', user.id);

      let isElevated = false;
      if (elevatedPerms) {
        for (const wm of elevatedPerms) {
          const rps = (wm.roles as any)?.role_permissions || [];
          for (const rp of rps) {
            const permName = rp.permissions?.name;
            // Define elevated permissions that signify normal BTS organizer access
            if (['events.create', 'events.manage', 'volunteers.manage', 'workspace.update'].includes(permName)) {
              isElevated = true;
              break;
            }
          }
          if (isElevated) break;
        }
      }

      // 3. If they are an active volunteer and do NOT have elevated permissions, restrict them.
      if (!isElevated) {
        redirect('/volunteer');
      }
    }
  }

  return <>{children}</>;
}
