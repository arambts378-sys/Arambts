import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const adminSupabase = createAdminClient();

    // Find the session
    const { data: session, error: sessionError } = await adminSupabase
      .from('volunteer_scanner_sessions')
      .select('id, event_id, status, expires_at, allowed_scopes')
      .eq('token_hash', tokenHash)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid scanner token' }, { status: 404 });
    }

    if (session.status === 'revoked') {
      return NextResponse.json({ error: 'Scanner access has been revoked' }, { status: 403 });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Scanner access has expired' }, { status: 403 });
    }

    // Load Event details
    const { data: event } = await adminSupabase
      .from('events')
      .select('id, name')
      .eq('id', session.event_id)
      .single();

    // Load Allowed Zones
    const { data: zonesData } = await adminSupabase
      .from('volunteer_scanner_zones')
      .select('zone_id, access_zones(id, name)')
      .eq('session_id', session.id);

    const allowedZones = zonesData?.map((z: any) => z.access_zones) || [];

    // Load Allowed Distances
    let allowedDistanceCategories: any[] = [];
    const distanceCategoryIds = session.allowed_scopes?.distance_category_ids || [];
    
    if (distanceCategoryIds.length > 0) {
      const { data: distances } = await adminSupabase
        .from('walkathon_distance_categories')
        .select('id, name')
        .eq('event_id', session.event_id)
        .in('id', distanceCategoryIds);
      
      if (distances) {
        allowedDistanceCategories = distances;
      }
    }

    return NextResponse.json({
      event,
      allowedZones,
      allowedDistanceCategories,
      expiresAt: session.expires_at
    });

  } catch (error: any) {
    console.error('Error resolving scanner session:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
