import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { integrationsService } from '@/services/integrations';
import { scannerSessionsService } from '@/services/scannerSessions';
import crypto from 'crypto';
import { encryptSecret } from '@/utils/encryption';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { type, id, email } = body; // type is 'assignment' or 'invitation'

    if (!type || !id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Authenticate Current User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Event Details and Workspace
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name, start_date, start_time, workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const resolvedWorkspaceId = eventData.workspace_id;

    // 3. Verify organizer has 'volunteers.manage' in this workspace
    const { data: hasPerm, error: permError } = await supabase.rpc('has_permission', {
      workspace_id: resolvedWorkspaceId,
      required_permission: 'volunteers.manage'
    });

    if (permError || !hasPerm) {
      return NextResponse.json({ error: 'You do not have permission to manage volunteers.' }, { status: 403 });
    }

    const eventName = eventData?.name || 'Event';

    if (type === 'assignment') {
      // Find latest integration job for this assignment
      const { data: latestJob, error: jobSearchErr } = await adminClient
        .from('integration_jobs')
        .select('*')
        .eq('event_id', eventId)
        .eq('event_type', 'volunteer_access_assigned')
        .filter('payload->>assignment_id', 'eq', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestJob) {
        if (latestJob.status === 'success') {
          // Rotate token
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);
          const { rawToken } = await scannerSessionsService.createOrRotateScannerSession(eventId, latestJob.payload.assignment_id || latestJob.payload.user_id, expiryDate);
          
          // Create a new job with a new idempotency key
          const newIdempotencyKey = `${eventId}:${id}:volunteer_access_assigned:resend:${Date.now()}`;
          const newPayload = { ...latestJob.payload, protected_scanner_token: encryptSecret(rawToken) };
          delete newPayload.scanner_token;
          await supabase.from('integration_jobs').insert({
            event_id: eventId,
            provider: 'email',
            event_type: 'volunteer_access_assigned',
            payload: newPayload,
            idempotency_key: newIdempotencyKey,
            status: 'pending',
            attempts: 0,
            next_attempt_at: new Date().toISOString()
          });
        } else {
          const { error: updateErr } = await adminClient.from('integration_jobs').update({
            status: 'pending',
            next_attempt_at: new Date().toISOString()
          }).eq('id', latestJob.id);
          if (updateErr) throw new Error('Failed to update integration job: ' + updateErr.message);
        }
      } else {
        // Create job from scratch
        const { data: assignmentData, error: aErr } = await supabase
          .from('event_staff_assignments')
          .select('id, access_zone_id, starts_at, ends_at, user_id')
          .eq('id', id)
          .single();
          
        if (aErr || !assignmentData) throw new Error('Assignment not found');

        const { data: zonesData } = await supabase.from('access_zones').select('name').eq('id', assignmentData.access_zone_id);
        const assignedZones = zonesData || [];
        
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', assignmentData.user_id).single();
        const recipientName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        const { rawToken } = await scannerSessionsService.createOrRotateScannerSession(eventId, assignmentData.user_id, expiryDate);

        const idempotencyKey = `${eventId}:${id}:volunteer_access_assigned`;
        const { error: jobErr } = await adminClient.from('integration_jobs').insert({
          event_id: eventId,
          provider: 'email',
          event_type: 'volunteer_access_assigned',
          payload: {
            event_id: eventId,
            assignment_id: id,
            recipient_email: email,
            recipient_name: recipientName,
            event_name: eventName,
            event_date: eventData ? `${eventData.start_date}T${eventData.start_time}` : null,
            assigned_zones: assignedZones,
            starts_at: assignmentData.starts_at,
            ends_at: assignmentData.ends_at,
            type: 'volunteer_access_assigned',
            protected_scanner_token: encryptSecret(rawToken)
          },
          idempotency_key: idempotencyKey,
          status: 'pending',
          attempts: 0,
          next_attempt_at: new Date().toISOString()
        });
        if (jobErr) throw new Error('Failed to create integration job for resend assigned: ' + jobErr.message);
      }
    } else if (type === 'invitation') {
      const { data: invitation, error: invError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('id', id)
        .single();
        
      if (invError || !invitation) {
        throw new Error('Invitation not found');
      }

      const isExpired = new Date(invitation.expires_at) < new Date();

      if (isExpired) {
        // Regenerate invitation
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        const newToken = crypto.randomBytes(32).toString('hex');
        
        await supabase.from('workspace_invitations')
          .update({ expires_at: expiryDate.toISOString(), token: newToken })
          .eq('id', id);

        const newIdempotencyKey = `${eventId}:${id}:volunteer_invitation:regenerated:${Date.now()}`;
        
        // Fetch zone names
        const zoneIds = invitation.metadata?.assigned_zones || [];
        const { data: zonesData } = await supabase.from('access_zones').select('id, name').in('id', zoneIds);
        const assignedZones = zonesData ? zonesData.map((z: any) => ({ name: z.name })) : [];

        const { error: jobErr } = await adminClient.from('integration_jobs').insert({
          event_id: eventId,
          provider: 'email',
          event_type: 'volunteer_invitation',
          payload: {
            invitation_id: id,
            event_id: eventId,
            recipient_email: email,
            recipient_name: null,
            event_name: eventName,
            event_date: eventData ? `${eventData.start_date}T${eventData.start_time}` : null,
            assigned_zones: assignedZones,
            starts_at: invitation.metadata?.starts_at,
            ends_at: invitation.metadata?.ends_at,
            type: 'volunteer_invitation'
          },
          idempotency_key: newIdempotencyKey,
          status: 'pending',
          attempts: 0,
          next_attempt_at: new Date().toISOString()
        });
        if (jobErr) throw new Error('Failed to create integration job for regenerated invitation: ' + jobErr.message);
      } else {
        // Find latest integration job for this invitation
        const { data: latestJob, error: jobSearchErr } = await adminClient
          .from('integration_jobs')
          .select('*')
          .eq('event_id', eventId)
          .eq('event_type', 'volunteer_invitation')
          .filter('payload->>invitation_id', 'eq', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestJob) {
          if (latestJob.status === 'success') {
            const newIdempotencyKey = `${eventId}:${id}:volunteer_invitation:resend:${Date.now()}`;
            const { error: jobErr } = await adminClient.from('integration_jobs').insert({
              event_id: eventId,
              provider: 'email',
              event_type: 'volunteer_invitation',
              payload: latestJob.payload,
              idempotency_key: newIdempotencyKey,
              status: 'pending',
              attempts: 0,
              next_attempt_at: new Date().toISOString()
            });
            if (jobErr) throw new Error('Failed to create integration job for resent invitation: ' + jobErr.message);
          } else {
            const { error: updateErr } = await adminClient.from('integration_jobs').update({
              status: 'pending',
              next_attempt_at: new Date().toISOString()
            }).eq('id', latestJob.id);
            if (updateErr) throw new Error('Failed to update integration job: ' + updateErr.message);
          }
        } else {
          // Edge case: no job exists
          const zoneIds = invitation.metadata?.assigned_zones || [];
          const { data: zonesData } = await supabase.from('access_zones').select('id, name').in('id', zoneIds);
          const assignedZones = zonesData ? zonesData.map((z: any) => ({ name: z.name })) : [];

          const idempotencyKey = `${eventId}:${id}:volunteer_invitation`;
          const { error: jobErr } = await adminClient.from('integration_jobs').insert({
            event_id: eventId,
            provider: 'email',
            event_type: 'volunteer_invitation',
            payload: {
              invitation_id: id,
              event_id: eventId,
              recipient_email: email,
              recipient_name: null,
              event_name: eventName,
              event_date: eventData ? `${eventData.start_date}T${eventData.start_time}` : null,
              assigned_zones: assignedZones,
              starts_at: invitation.metadata?.starts_at,
              ends_at: invitation.metadata?.ends_at,
              type: 'volunteer_invitation'
            },
            idempotency_key: idempotencyKey,
            status: 'pending',
            attempts: 0,
            next_attempt_at: new Date().toISOString()
          });
          if (jobErr) throw new Error('Failed to create integration job for invitation edge case: ' + jobErr.message);
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Trigger background processor to pick up the newly created jobs immediately
    await integrationsService.triggerJobProcessor();

    return NextResponse.json({ success: true, message: 'Resend triggered' });
  } catch (error: any) {
    console.error('Error in resend API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
