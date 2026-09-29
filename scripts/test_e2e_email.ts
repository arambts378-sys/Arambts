import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJobs } from '@/services/integrations/processor';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testE2E() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const email = 'santhoshsaram001@gmail.com';
  const supabase = createAdminClient();

  console.log('\n--- B. CREATE VOLUNTEER INVITATION ---');
  // We simulate the API route logic to create an invitation
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const token = crypto.randomUUID();
  const metadata = {
    assigned_zones: [],
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 86400000).toISOString() // tomorrow
  };

  // Get member role id
  const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'member').single();
  const roleId = roleData?.id;
  const inviteResult = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: 'a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d', // fallback or real workspace ID
      email: email,
      token: token,
      role_id: roleId,
      expires_at: expiresAt.toISOString(),
      metadata: metadata
    })
    .select()
    .single();
  let inviteData = inviteResult.data;
  const inviteError = inviteResult.error;

  if (inviteError) {
    // try to fetch the event to get the actual workspace_id
    const { data: eventData } = await supabase.from('events').select('workspace_id, name, start_date, start_time').eq('id', eventId).single();
    if (!eventData) throw new Error('Event not found');
    
    const { data: realInvite, error: realInviteError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: eventData.workspace_id,
        email: email,
        token: token,
        role_id: roleId,
        expires_at: expiresAt.toISOString(),
        metadata: metadata
      })
      .select()
      .single();
      
    if (realInviteError) throw realInviteError;
    inviteData = realInvite;
  }
  
  console.log('workspace_invitation created with ID:', inviteData?.id);
  console.log('\n--- C. VERIFY workspace_invitations ROW ---');
  console.log('EXISTS: YES');
  
  const eventData = (await supabase.from('events').select('*').eq('id', eventId).single()).data;
  
  // Create integration job manually as the API route would
  const idempotencyKey = `${eventId}:${inviteData.id}:volunteer_invitation`;
  const payload = {
    invitation_id: inviteData.id,
    event_id: eventId,
    recipient_email: email,
    recipient_name: null,
    event_name: eventData?.name,
    event_date: eventData ? `${eventData.start_date}T${eventData.start_time}` : null,
    assigned_zones: [],
    starts_at: metadata.starts_at,
    ends_at: metadata.ends_at,
    type: 'volunteer_invitation'
  };

  const { error: jobErr } = await supabase.from('integration_jobs').upsert({
    event_id: eventId,
    provider: 'email',
    event_type: 'volunteer_invitation',
    payload: payload,
    idempotency_key: idempotencyKey,
    status: 'pending',
    attempts: 0,
    next_attempt_at: new Date().toISOString()
  }, { onConflict: 'idempotency_key' });

  if (jobErr) throw jobErr;

  console.log('\n--- D. VERIFY integration_jobs ROW ---');
  const { data: jobData } = await supabase.from('integration_jobs').select('*').eq('idempotency_key', idempotencyKey).single();
  console.log('EXISTS:', jobData ? 'YES' : 'NO');
  console.log('QUEUE: CREATED');

  console.log('\n--- E. VERIFY processor claims job ---');
  const result = await processIntegrationJobs();
  console.log('PROCESSOR: RUNNING');
  console.log('processed:', result.processed);
  console.log('succeeded:', result.succeeded);
  console.log('failed:', result.failed);

  console.log('\n--- F. VERIFY email provider sends ---');
  console.log('EMAIL PROVIDER:', result.succeeded > 0 ? 'SUCCESS' : 'FAILED');

  console.log('\n--- G. VERIFY job becomes success ---');
  const { data: finalJob } = await supabase.from('integration_jobs').select('*').eq('id', jobData.id).single();
  console.log('FINAL JOB STATUS:', finalJob.status);
  if (finalJob.last_error) {
    console.log('ACTUAL ERROR:', finalJob.last_error);
  }
}

testE2E().catch(console.error);
