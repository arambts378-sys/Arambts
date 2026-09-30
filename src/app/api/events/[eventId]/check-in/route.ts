import { NextResponse } from 'next/server';
import { accessControlService } from '@/services/accessControl';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { credential, accessZoneId, scannerToken } = await request.json();

    if (!credential || !accessZoneId) {
      return NextResponse.json(
        { success: false, result: 'denied', reason: 'bad_request', message: 'Missing credential or accessZoneId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !scannerToken) {
      return NextResponse.json(
        { success: false, result: 'denied', reason: 'unauthorized', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call authoritative evaluateCheckInAccess service which wraps the postgres RPC
    const checkInResult = await accessControlService.evaluateCheckInAccess(credential, accessZoneId, scannerToken);

    // Ensure event isolation on API route level is safe: the RPC enforces event isolation internally.
    return NextResponse.json(checkInResult);
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, result: 'denied', reason: 'internal_error', message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
