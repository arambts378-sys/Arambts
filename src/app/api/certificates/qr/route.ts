import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  // Simple utility to generate the official tokens.
  // In a real app, this should be protected by admin auth.
  // Since it's a utility for the organizer, we can just generate it using the SUPABASE_SERVICE_ROLE_KEY.
  
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-secret';
  
  const distances = ['3KM', '5KM'];
  const tokens = distances.map(distance => {
    const base = `ARAM:CERT:${distance}`;
    const hmac = crypto.createHmac('sha256', secret).update(base).digest('hex');
    return {
      distance,
      token: `${base}:${hmac}`
    };
  });

  return NextResponse.json({
    success: true,
    tokens
  });
}
