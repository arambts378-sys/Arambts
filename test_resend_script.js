const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const id = 'f8a99395-40a9-431c-8f1a-e7cbcd8ef71d'; // invitation id
  
  const { data: latestJob, error } = await supabase
    .from('integration_jobs')
    .select('*')
    .eq('event_id', eventId)
    .eq('event_type', 'volunteer_invitation')
    .filter('payload->>invitation_id', 'eq', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  console.log('latestJob:', latestJob ? latestJob.id + ' ' + latestJob.status : null);
  
  if (latestJob && latestJob.status === 'success') {
    const newIdempotencyKey = eventId + ':' + id + ':volunteer_invitation:resend:' + Date.now();
    const { data: inserted, error: jobErr } = await supabase.from('integration_jobs').insert({
      event_id: eventId,
      provider: 'email',
      event_type: 'volunteer_invitation',
      payload: latestJob.payload,
      idempotency_key: newIdempotencyKey,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString()
    }).select();
    
    if (jobErr) console.error('jobErr:', jobErr);
    else console.log('inserted job:', inserted[0].id);
  }
}
run();
