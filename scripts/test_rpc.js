const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // We'll test with anon key, but we need a valid JWT session

async function testRpc() {
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY); // use service_role just to see if argument matching throws an error

  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const resolvedWorkspaceId = '01ff58b8-dbbd-4365-912a-2127abeee80c';
  
  // Test 1: The current API way (wrong arguments)
  const { data: res1, error: err1 } = await supabase.rpc('has_permission', {
    p_workspace_id: resolvedWorkspaceId,
    p_permission_name: 'volunteers.manage'
  });
  console.log('Result with incorrect arg names:', { data: res1, error: err1?.message });

  // Test 2: The correct way
  const { data: res2, error: err2 } = await supabase.rpc('has_permission', {
    workspace_id: resolvedWorkspaceId,
    required_permission: 'volunteers.manage'
  });
  console.log('Result with correct arg names:', { data: res2, error: err2?.message });
}

testRpc().catch(console.error);
