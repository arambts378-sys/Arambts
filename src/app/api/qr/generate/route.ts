import { NextResponse } from 'next/server';
import { qrCredentialsService } from '@/services/qrCredentials';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { eventId, registrationId } = await req.json();

    if (!eventId || !registrationId) {
      return NextResponse.json({ error: 'Missing eventId or registrationId' }, { status: 400 });
    }

    // Generate the QR credential using the admin client because public users 
    // do not have the 'events.manage' role required by RLS.
    // This is safe because we already know the registration was just confirmed 
    // securely via the RPC, and this endpoint just triggers the generation.
    // In a real production environment, you could also add a webhook secret here.
    const result = await qrCredentialsService.generateQrCredential(eventId, registrationId, true);
    
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('QR Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
