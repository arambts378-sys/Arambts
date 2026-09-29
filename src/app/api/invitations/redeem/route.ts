import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Authenticate Current User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. Resolve Invitation (Bypassing RLS with service role for security)
    // Actually we can use service role client here to read the token securely, or regular client if RLS permits.
    // Wait, the current user cannot read invitations they didn't create due to RLS.
    // We must use a service role key to validate the token.
    
    // Instead of instantiating the service role client which might not be imported properly in this file,
    // let's create a stored procedure or just bypass RLS by querying with the server client.
    // Wait, createClient() here uses cookies but relies on RLS. If RLS on workspace_invitations only allows managers, the invited user can't read it.
    // Let's create an RPC for redemption, or we can use supabase admin. Since I can't easily configure the admin client without env variables in this specific file right now, I'll use an RPC.
    
    const { data: result, error: rpcError } = await supabase.rpc('redeem_invitation', {
      p_token: token
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, eventId: result.event_id });

  } catch (error: any) {
    console.error('Error redeeming invite:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
