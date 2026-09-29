import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const { zoneId } = await request.json();

    if (!zoneId) {
      return NextResponse.json({ error: 'zoneId required' }, { status: 400 });
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

    // Validate that the zone belongs to the event
    const { data: zone } = await supabase.from('access_zones').select('event_id').eq('id', zoneId).single();
    if (!zone || zone.event_id !== eventId) {
       return NextResponse.json({ error: 'Invalid zone or zone does not belong to event' }, { status: 400 });
    }

    // Get the active assignment
    const { data: assignment } = await supabase
      .from('event_staff_assignments')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Active volunteer assignment not found' }, { status: 404 });
    }

    const { data: zoneAssignment, error } = await supabase
      .from('volunteer_zone_assignments')
      .insert({
        staff_assignment_id: assignment.id,
        zone_id: zoneId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique violation, already assigned
        return NextResponse.json({ success: true, message: 'Already assigned' });
      }
      throw error;
    }

    return NextResponse.json(zoneAssignment);
  } catch (error: any) {
    console.error('Error adding zone:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
