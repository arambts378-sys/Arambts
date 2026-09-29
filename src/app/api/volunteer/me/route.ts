import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active assignments for this user
    const { data: assignments, error } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        event_id,
        events:event_id (
          name,
          slug,
          starts_at,
          ends_at
        ),
        zones:volunteer_zone_assignments (
          zone_id,
          access_zones (name, is_active)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) throw error;

    return NextResponse.json(assignments);
  } catch (error: any) {
    console.error('Error fetching volunteer data:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
