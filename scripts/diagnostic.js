const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  console.log(`\n--- DIAGNOSTIC REPORT ---`);
  console.log(`EVENT\n-----`);
  console.log(`eventId: ${eventId}`);
  
  // 1. Get Event
  const { data: event, error: evtErr } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (evtErr) {
    console.error(`Error fetching event: ${evtErr.message}`);
    return;
  }
  console.log(`event name: ${event.name}`);
  console.log(`event workspace_id: ${event.workspace_id}`);
  
  // 2. Get Workspace Members (to find the organizer/user)
  console.log(`\nMEMBERSHIP\n----------`);
  const { data: members, error: memErr } = await supabase.from('workspace_members').select('*').eq('workspace_id', event.workspace_id);
  
  if (memErr || !members || members.length === 0) {
    console.log(`membership exists: no`);
    return;
  }
  
  const member = members[0]; // Assuming only one user for this test, or we'll just check the first one.
  console.log(`membership exists: yes`);
  console.log(`membership workspace_id: ${member.workspace_id}`);
  console.log(`membership role_id: ${member.role_id}`);
  console.log(`\nAUTH USER\n---------`);
  console.log(`auth.uid(): ${member.user_id}`);
  
  // 3. Get Role
  console.log(`\nROLE\n----`);
  const { data: role, error: roleErr } = await supabase.from('roles').select('*').eq('id', member.role_id).single();
  console.log(`role name: ${role ? role.name : 'Unknown'}`);
  
  // 4. Get Permissions
  console.log(`\nPERMISSION\n----------`);
  const { data: perm, error: pErr } = await supabase.from('permissions').select('*').eq('name', 'volunteers.manage').single();
  console.log(`volunteers.manage exists: ${perm ? 'yes' : 'no'}`);
  
  if (perm) {
    const { data: rp, error: rpErr } = await supabase.from('role_permissions').select('*').eq('role_id', member.role_id).eq('permission_id', perm.id);
    console.log(`role has volunteers.manage: ${rp && rp.length > 0 ? 'yes' : 'no'}`);
  }

  // 7. Check Duplicate Role/Permissions
  console.log(`\nDUPLICATES CHECK\n----------------`);
  const { data: allRoles } = await supabase.from('roles').select('id, name');
  console.log(`Roles:`, allRoles.map(r => r.name));
  
  const { data: allPerms } = await supabase.from('permissions').select('id, name').eq('name', 'volunteers.manage');
  console.log(`Permissions matching volunteers.manage:`, allPerms);
  
  const { data: rolePerms } = await supabase.from('role_permissions').select(`
    role_id, 
    roles(name), 
    permission_id, 
    permissions(name)
  `);
  
  const managePerms = rolePerms.filter(rp => rp.permissions && rp.permissions.name === 'volunteers.manage');
  console.log(`Roles with volunteers.manage mappings:`, managePerms.map(rp => rp.roles.name));
  
  // 6. Test has_permission directly
  console.log(`\nHAS_PERMISSION RPC\n------------------`);
  console.log(`Testing with service_role bypasses RLS/auth.uid(). We need to use postgres function execution.`);
  
  // To really test has_permission, let's just log what we found.
}

runDiagnostics().catch(console.error);
