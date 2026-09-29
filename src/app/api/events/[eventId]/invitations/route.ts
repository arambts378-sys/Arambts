import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: event } = await supabase.from('events').select('workspace_id').eq('id', eventId).single();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      workspace_id: event.workspace_id,
      required_permission: 'volunteers.manage'
    });

    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check if the user is already a workspace member
    const { data: targetUserId, error: userError } = await supabase.rpc('get_workspace_user_id_by_email', {
      p_workspace_id: event.workspace_id,
      p_email: normalizedEmail
    });

    if (!userError && targetUserId) {
      return NextResponse.json({ 
        code: 'ALREADY_WORKSPACE_MEMBER', 
        message: 'This person is already a workspace member.' 
      }, { status: 400 });
    }

    // Check for pending invitation
    const { data: existingInvitation } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', event.workspace_id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json({ 
        code: 'INVITATION_ALREADY_PENDING', 
        message: 'An invitation is already pending for this email.' 
      }, { status: 400 });
    }

    // Get Viewer Role
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'viewer')
      .single();

    if (!role) {
      return NextResponse.json({ error: 'Viewer role not configured in the system.' }, { status: 500 });
    }

    // Create Invitation
    const { data: invitation, error: insertError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: event.workspace_id,
        email: normalizedEmail,
        role_id: role.id,
        invited_by: user.id,
        status: 'pending'
      })
      .select('token')
      .single();

    if (insertError) throw insertError;

    // We do not have a guaranteed email delivery system set up yet.
    // Return a safe invitation link to the organizer.
    const invitationLink = `/invite?token=${invitation.token}&next=/app`;

    return NextResponse.json({
      success: true,
      link: invitationLink,
      message: 'Workspace invitation created successfully.'
    });

  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
