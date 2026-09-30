import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    const parts = token.split(':');
    // Expected: ARAM:CERT:<distance>:<hmac>
    if (parts.length !== 4 || parts[0] !== 'ARAM' || parts[1] !== 'CERT') {
      return NextResponse.json({ success: false, error: 'Invalid QR format' }, { status: 400 });
    }

    const distance = parts[2];
    const providedHmac = parts[3];

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret';
    const base = `ARAM:CERT:${distance}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(base).digest('hex');

    if (providedHmac !== expectedHmac) {
      return NextResponse.json({ success: false, error: 'Invalid QR signature' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      distance
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
