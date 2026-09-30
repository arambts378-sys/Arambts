import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; sessionId: string }> }
) {
  try {
    const { eventId, sessionId } = await params;

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

    const adminSupabase = createAdminClient();

    // Revoke instead of delete
    const { error: updateError } = await adminSupabase
      .from('volunteer_scanner_sessions')
      .update({ status: 'revoked' })
      .eq('id', sessionId)
      .eq('event_id', eventId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Scanner session revoked successfully.' });

  } catch (error: any) {
    console.error('Error revoking scanner session:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
