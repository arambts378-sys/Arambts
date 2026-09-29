import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: event } = await supabase.from('events').select('workspace_id').eq('id', eventId).single();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      workspace_id: event.workspace_id,
      required_permission: 'volunteers.view'
    });

    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: assignments, error } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        user_id,
        role,
        status,
        zones:volunteer_zone_assignments (
          zone_id,
          access_zones (name)
        )
      `)
      .eq('event_id', eventId)
      .neq('status', 'revoked');

    if (error) throw error;

    const adminClient = createAdminClient();
    
    // Resolve user emails securely server-side
    const assignmentsWithUsers = await Promise.all(
      assignments.map(async (assignment) => {
        try {
          const { data: { user: volunteerUser } } = await adminClient.auth.admin.getUserById(assignment.user_id);
          return {
            ...assignment,
            users: volunteerUser ? { email: volunteerUser.email, raw_user_meta_data: volunteerUser.user_metadata } : null
          };
        } catch (err) {
          console.error(`Failed to fetch user ${assignment.user_id}`, err);
          return {
            ...assignment,
            users: null
          };
        }
      })
    );

    return NextResponse.json(assignmentsWithUsers);
  } catch (error: any) {
    console.error('Error fetching volunteers:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

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

    // Try to find if user exists and is member of workspace
    // Normally this requires a more complex check via an RPC or admin privileges
    // For simplicity, we create the event_staff_assignments using service role if needed, or rely on RLS.
    // However, the assignment requires a user_id. We must find the user_id from the email.
    // Assuming there's a function or we can query profiles/users. But auth.users is restricted.
    // Let's use RPC for secure resolution.
    
    // Check if the user is already in the workspace using the secure RPC
    const { data: targetUserId, error: userError } = await supabase.rpc('get_workspace_user_id_by_email', {
      p_workspace_id: event.workspace_id,
      p_email: email
    });

    if (userError || !targetUserId) {
      return NextResponse.json({ 
        code: 'NOT_WORKSPACE_MEMBER',
        message: 'This person is not a member of this workspace yet.' 
      }, { status: 400 });
    }

    // Upsert the assignment
    const { data: assignment, error } = await supabase
      .from('event_staff_assignments')
      .upsert({
        event_id: eventId,
        user_id: targetUserId,
        role: 'volunteer',
        status: 'active'
      }, { onConflict: 'event_id,user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error('Error adding volunteer:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
