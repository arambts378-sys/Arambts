const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Verifying Phase 10 Requirements...');
  
  // Checking tables via RPC or simple select
  let results = {};
  
  async function checkTable(tableName) {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error && error.code === '42P01') {
      return false; // Does not exist
    }
    return true; // Exists
  }

  results['event_staff_assignments'] = await checkTable('event_staff_assignments');
  results['volunteer_scanner_sessions'] = await checkTable('volunteer_scanner_sessions');
  results['check_ins'] = await checkTable('check_ins');
  results['access_zones'] = await checkTable('access_zones');

  console.log('Results:');
  console.log(`event_staff_assignments exists: ${results['event_staff_assignments']}`);
  console.log(`volunteer_scanner_sessions exists: ${results['volunteer_scanner_sessions']}`);
  console.log(`check_ins exists: ${results['check_ins']}`);
  console.log(`access_zones exists: ${results['access_zones']}`);
}

run().catch(console.error);
