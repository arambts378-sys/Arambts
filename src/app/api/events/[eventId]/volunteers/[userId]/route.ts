import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; userId: string }> }
) {
  try {
    const { eventId, userId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: event } = await supabase.from('events').select('workspace_id').eq('id', eventId).single();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      workspace_id: event.workspace_id,
      required_permission: 'volunteers.manage'
    });

    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Revoke by setting status to revoked instead of deleting, to keep history if desired.
    // However, the prompt says "Remove/revoke volunteer access". We'll update the status.
    const { error } = await supabase
      .from('event_staff_assignments')
      .update({ status: 'revoked' })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing volunteer:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
