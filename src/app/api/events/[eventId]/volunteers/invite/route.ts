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
    const { email, zoneIds, startsAt, endsAt } = body;

    if (!email || !zoneIds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

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

    // 3. Resolve email server-side
    // Search in profiles
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single();

    // Determine the role to assign (use 'member' by default)
    const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'member').single();
    if (!roleData) {
      return NextResponse.json({ error: 'Member role not found' }, { status: 500 });
    }

    const eventName = eventData?.name || 'Event';

    // Fetch Zone Names for payload
    const { data: zonesData } = await supabase.from('access_zones').select('id, name').in('id', zoneIds);
    const assignedZones = zonesData ? zonesData.map((z: any) => ({ name: z.name })) : [];

    const startDateTime = startsAt ? new Date(new Date().toDateString() + ' ' + startsAt).toISOString() : null;
    const endDateTime = endsAt ? new Date(new Date().toDateString() + ' ' + endsAt).toISOString() : null;

    let targetUserId = targetProfile?.id;
    let recipientName = targetProfile?.first_name ? `${targetProfile.first_name} ${targetProfile.last_name || ''}`.trim() : null;

    if (!targetProfile) {
      // User does NOT exist in ARAM BTS -> create a minimal account for them
      const adminClient = createAdminClient();
      const { data: newAuthUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { source: 'volunteer_scanner_invite' }
      });
      if (createUserError) throw new Error('Failed to create volunteer account: ' + createUserError.message);
      
      targetUserId = newAuthUser.user.id;
      
      // Upsert profile in case the trigger is slow or doesn't exist
      await adminClient.from('profiles').upsert({
        id: targetUserId,
        email: email
      }, { onConflict: 'id' });
    }

    // Ensure workspace membership
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', resolvedWorkspaceId)
      .eq('user_id', targetUserId)
      .single();

    if (!existingMember) {
      await supabase.from('workspace_members').insert({
        workspace_id: resolvedWorkspaceId,
        user_id: targetUserId,
        role_id: roleData.id
      });
    }

    // Create assignments
    const assignmentsToInsert = zoneIds.map((zId: string) => ({
      event_id: eventId,
      user_id: targetUserId,
      access_zone_id: zId,
      assigned_by: user.id,
      starts_at: startDateTime,
      ends_at: endDateTime,
      active: true
    }));

    const { data: assignedData, error: assignError } = await supabase
      .from('event_staff_assignments')
      .upsert(assignmentsToInsert, { onConflict: 'event_id,user_id,access_zone_id' })
      .select('id');

    if (assignError) throw assignError;

    // Set expiry to 7 days or event end, depending on logic. Let's use 7 days safety margin.
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Create or reuse scanner session
    const { rawToken } = await scannerSessionsService.createOrRotateScannerSession(eventId, targetUserId, expiryDate);

    // Generate integration job for existing user assignment
    // Use the first assignment ID as part of the idempotency key for this batch
    const assignmentId = assignedData && assignedData.length > 0 ? assignedData[0].id : targetUserId;
    const idempotencyKey = `${eventId}:${assignmentId}:volunteer_access_assigned`;

    const adminClient = createAdminClient();
    
    const payload = {
      event_id: eventId,
      assignment_id: assignmentId,
      recipient_email: email,
      recipient_name: recipientName,
      event_name: eventName,
      event_date: eventData ? `${eventData.start_date}T${eventData.start_time}` : null,
      assigned_zones: assignedZones,
      starts_at: startDateTime,
      ends_at: endDateTime,
      type: 'volunteer_access_assigned',
      protected_scanner_token: encryptSecret(rawToken)
    };

    const { error: jobErr } = await adminClient.from('integration_jobs').upsert({
      event_id: eventId,
      provider: 'email',
      event_type: 'volunteer_access_assigned',
      payload: payload,
      idempotency_key: idempotencyKey,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString()
    }, { onConflict: 'idempotency_key' });

    if (jobErr) console.error('Failed to create integration job:', jobErr);

    // Trigger background processor to pick up the newly created jobs immediately
    await integrationsService.triggerJobProcessor();

    return NextResponse.json({ success: true, message: 'Volunteer assigned successfully' });
  } catch (error: any) {
    console.error('Error in invite API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
