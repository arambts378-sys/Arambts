import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { integrationsService } from '@/services/integrations';
import { scannerSessionsService } from '@/services/scannerSessions';
import crypto from 'crypto';
import { encryptSecret } from '@/utils/encryption';

async function resolveOrCreateVolunteerAuthUser(adminClient: any, email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const maskedEmail = cleanEmail.substring(0, 3) + '***@' + cleanEmail.split('@')[1];
  
  console.log(`[VOLUNTEER_DIAG] AUTH_LOOKUP_START for ${maskedEmail}`);

  // 1. Search for existing user BEFORE attempting to create
  let existingUser = null;
  let page = 1;
  const perPage = 1000;
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
    
    if (listError) {
      throw new Error(`Failed to list users during auth lookup: ${listError.message}`);
    }

    if (!usersData || !usersData.users || usersData.users.length === 0) {
      break;
    }

    const found = usersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
    if (found) {
      existingUser = found;
      break;
    }

    if (usersData.users.length < perPage) {
      break;
    }

    page++;
  }

  const hostUrl = adminClient.supabaseUrl ? new URL(adminClient.supabaseUrl).hostname : 'unknown-host';
  console.log(`[VOLUNTEER_DIAG] AUTH_LOOKUP_RESULT host=${hostUrl} found=${!!existingUser} userId=${existingUser?.id || 'none'} pagesChecked=${page <= MAX_PAGES ? page : MAX_PAGES}`);

  // 2. Return if user already exists
  if (existingUser) {
    return { user: existingUser, created: false, maskedEmail };
  }

  // 3. Attempt to create the user if not found
  console.log(`[VOLUNTEER_DIAG] AUTH_CREATE_START for ${maskedEmail}`);
  const { data: newAuthUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email: cleanEmail,
    email_confirm: true,
    user_metadata: { source: 'volunteer_scanner_invite' }
  });

  // 4. Handle creation failure
  if (createUserError) {
    const errMessage = String(createUserError.message || createUserError);
    console.log(`[VOLUNTEER_DIAG] AUTH_CREATE_ERROR msg="${errMessage}"`);
    
    // We do one final fallback lookup without relying on specific error codes
    let raceExistingUser = null;
    let racePage = 1;
    
    console.log(`[VOLUNTEER_DIAG] AUTH_FINAL_LOOKUP start`);
    while (racePage <= MAX_PAGES) {
      const { data: raceUsersData, error: raceListError } = await adminClient.auth.admin.listUsers({ page: racePage, perPage });
      if (raceListError) break;
      if (!raceUsersData || !raceUsersData.users || raceUsersData.users.length === 0) break;

      const raceFound = raceUsersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
      if (raceFound) {
        raceExistingUser = raceFound;
        break;
      }
      if (raceUsersData.users.length < perPage) break;
      racePage++;
    }

    if (raceExistingUser) {
      console.log(`[VOLUNTEER_DIAG] AUTH_FINAL_LOOKUP found user=${raceExistingUser.id}`);
      return { user: raceExistingUser, created: false, maskedEmail };
    }

    throw new Error('Failed to create volunteer account: ' + errMessage);
  }

  return { user: newAuthUser.user, created: true, maskedEmail };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  let globalEventId = 'unknown';

  try {
    const { eventId } = await params;
    globalEventId = eventId;
    console.log(`[VOLUNTEER_DIAG] REQUEST_START event=${eventId}`);
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

    // 4. Resolve Auth User
    const adminClient = createAdminClient();
    const { user: targetUser, created: isNewUser } = await resolveOrCreateVolunteerAuthUser(adminClient, email);
    const targetUserId = targetUser.id;

    // 5. Handle Profile
    let recipientName = null;
    const { data: existingProfile } = await supabase.from('profiles').select('full_name').eq('id', targetUserId).single();
    
    if (existingProfile) {
      recipientName = existingProfile.full_name;
    } else {
      // Create minimal profile if it doesn't exist
      await adminClient.from('profiles').upsert({
        id: targetUserId,
        full_name: 'Volunteer'
      }, { onConflict: 'id' });
      recipientName = 'Volunteer';
    }

    console.log(`[VOLUNTEER_DIAG] PROFILE_RESOLVED`);

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

    // Ensure workspace membership if needed by the architecture
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

    // 6. Handle Idempotent Assignments
    const { data: existingAssignments } = await supabase
      .from('event_staff_assignments')
      .select('access_zone_id')
      .eq('event_id', eventId)
      .eq('user_id', targetUserId)
      .eq('active', true);

    const existingZoneIds = new Set(existingAssignments?.map(a => a.access_zone_id) || []);
    const newZoneIds = zoneIds.filter((zId: string) => !existingZoneIds.has(zId));

    if (newZoneIds.length === 0) {
      console.log(`[VOLUNTEER_DIAG] ASSIGNMENT_SUCCESS`);
      console.log(`[VOLUNTEER_DIAG] INVITE_SUCCESS`);
      return NextResponse.json({ 
        success: true, 
        existingUser: !isNewUser, 
        assignmentCreated: false,
        message: 'Volunteer is already assigned to all requested zones' 
      });
    }

    // Create ONLY missing assignments
    const assignmentsToInsert = newZoneIds.map((zId: string) => ({
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

    if (assignError) {
      throw new Error('Failed to assign volunteer to zones: ' + assignError.message);
    }
    
    console.log(`[VOLUNTEER_DIAG] ASSIGNMENT_SUCCESS`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // 7. Scanner session
    const { rawToken } = await scannerSessionsService.createOrRotateScannerSession(eventId, targetUserId, expiryDate);
    
    console.log(`[VOLUNTEER_DIAG] SCANNER_SUCCESS`);

    // 8. Queue Email Job (only for new assignments)
    const assignmentId = assignedData && assignedData.length > 0 ? assignedData[0].id : targetUserId;
    const idempotencyKey = `${eventId}:${assignmentId}:${Date.now()}:volunteer_access_assigned`;

    const payload = {
      event_id: eventId,
      assignment_id: assignmentId,
      recipient_email: targetUser.email,
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

    if (jobErr) {
      throw new Error('Failed to create integration email job: ' + jobErr.message);
    }
    
    console.log(`[VOLUNTEER_DIAG] EMAIL_JOB_SUCCESS`);

    // Trigger background processor to pick up the newly created jobs immediately
    await integrationsService.triggerJobProcessor();

    console.log(`[VOLUNTEER_DIAG] INVITE_SUCCESS`);
    return NextResponse.json({ 
      success: true, 
      existingUser: !isNewUser,
      assignmentCreated: true,
      message: 'Volunteer assigned successfully' 
    });
  } catch (error: any) {
    console.error(`[VOLUNTEER_DIAG] ERROR for event ${globalEventId}:`, error.message || error);
    // Return actual operation error, not a generic "Failed to create account" wrapper for all stages
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
