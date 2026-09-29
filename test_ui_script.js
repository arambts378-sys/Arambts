const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
// I don't have the user's JWT, so I will use service role to at least verify the JS logic.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const { data: jobsData, error } = await supabase
    .from('integration_jobs')
    .select('id, event_type, status, payload, idempotency_key')
    .eq('event_id', eventId)
    .in('event_type', ['volunteer_access_assigned', 'volunteer_invitation']);
    
  console.log('jobsData length:', jobsData ? jobsData.length : 0);
  
  const invId = 'f8a99395-40a9-431c-8f1a-e7cbcd8ef71d';
  const filtered = jobsData.filter(j => j.event_type === 'volunteer_invitation' && j.payload?.invitation_id === invId);
  console.log('filtered length:', filtered.length);
  
  if (filtered.length > 0) {
    const latestJob = filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
    const statusMap = { pending: 'Pending', processing: 'Sending', success: 'Sent', failed: 'Failed' };
    const emailStatus = latestJob ? statusMap[latestJob.status] || latestJob.status : 'Not Sent';
    console.log('emailStatus:', emailStatus);
  } else {
    console.log('emailStatus: Not Sent');
  }
}
run();
