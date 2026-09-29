const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  
  console.log(`\n--- FINAL DIAGNOSTIC REPORT ---`);
  
  // 1. INVITATION
  console.log(`\nINVITATION\n----------`);
  // Look for latest invitation
  const { data: inv, error: invErr } = await supabase
    .from('workspace_invitations')
    .select('id, email, status, created_at, expires_at, metadata, token')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invErr) {
    console.log(`exists: ERROR (${invErr.message})`);
  } else if (!inv) {
    console.log(`exists: NO`);
  } else {
    console.log(`exists: YES`);
    console.log(`invitation id: ${inv.id}`);
    console.log(`email: ${inv.email}`);
    console.log(`status: ${inv.status || 'N/A'}`);
    console.log(`created_at: ${inv.created_at}`);
    console.log(`expires_at: ${inv.expires_at}`);
    console.log(`metadata:`, inv.metadata);
    console.log(`token existence only: ${!!inv.token}`);
  }

  // 2. EMAIL JOB
  console.log(`\nEMAIL JOB\n---------`);
  const { data: jobs, error: jobErr } = await supabase
    .from('integration_jobs')
    .select('id, event_id, provider, event_type, status, attempts, max_attempts, next_attempt_at, last_error, created_at, updated_at, processed_at, idempotency_key, payload')
    .eq('event_id', eventId)
    .eq('provider', 'email')
    .order('created_at', { ascending: false })
    .limit(1); 

  if (jobErr) {
    console.log(`exists: ERROR (${jobErr.message})`);
  } else if (!jobs || jobs.length === 0) {
    console.log(`exists: NO`);
  } else {
    const job = jobs[0];
    console.log(`exists: YES`);
    console.log(`id: ${job.id}`);
    console.log(`event_type: ${job.event_type}`);
    console.log(`status: ${job.status}`);
    console.log(`attempts: ${job.attempts}`);
    console.log(`max_attempts: ${job.max_attempts}`);
    console.log(`next_attempt_at: ${job.next_attempt_at}`);
    console.log(`last_error: ${job.last_error || 'null'}`);
    console.log(`created_at: ${job.created_at}`);
    console.log(`updated_at: ${job.updated_at}`);
    console.log(`processed_at: ${job.processed_at}`);
    console.log(`idempotency_key: ${job.idempotency_key}`);
    console.log(`payload keys:`, Object.keys(job.payload || {}));
  }

  // 3. EMAIL CONFIG
  console.log(`\nEMAIL CONFIG\n------------`);
  const { data: config, error: confErr } = await supabase
    .from('event_integrations')
    .select('id, is_active, config')
    .eq('event_id', eventId)
    .eq('provider', 'email')
    .maybeSingle();

  if (confErr) {
    console.log(`integration exists: ERROR (${confErr.message})`);
  } else if (!config) {
    console.log(`integration exists: NO`);
  } else {
    console.log(`integration exists: YES`);
    console.log(`active: ${config.is_active ? 'YES' : 'NO'}`);
    const c = config.config || {};
    console.log(`SMTP host configured: ${!!c.host ? 'YES' : 'NO'}`);
    console.log(`SMTP port configured: ${!!c.port ? 'YES' : 'NO'}`);
    console.log(`SMTP username configured: ${!!c.user ? 'YES' : 'NO'}`);
    console.log(`SMTP password configured: ${!!c.pass ? 'YES' : 'NO'}`);
    
    let passwordEncrypted = false;
    if (c.pass && c.pass.includes(':')) {
      passwordEncrypted = true;
    }
    console.log(`password encrypted: ${passwordEncrypted ? 'YES' : 'NO'}`);
  }
  
  console.log(`ENCRYPTION_KEY configured: ${!!process.env.ENCRYPTION_KEY ? 'YES' : 'NO'}`);
}

runDiagnostics().catch(console.error);
