import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; userId: string; zoneId: string }> }
) {
  try {
    const { eventId, userId, zoneId } = await params;
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

    // Get the assignment
    const { data: assignment } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Volunteer assignment not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('volunteer_zone_assignments')
      .delete()
      .eq('staff_assignment_id', assignment.id)
      .eq('zone_id', zoneId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing zone:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
