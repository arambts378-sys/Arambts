import { NextResponse } from 'next/server';
import crypto from 'crypto';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper to sanitize XML strings
const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

export async function POST(request: Request) {
  try {
    const { token, name, email } = await request.json();
    
    // 1. Validation
    if (!token || !name || !email) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const parts = token.split(':');
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

    const eventId = process.env.CERTIFICATE_EVENT_ID;
    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Event ID not configured' }, { status: 500 });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    
    // Simple email regex validation
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 2. Idempotency Check
    const { data: existingCert } = await supabase
      .from('certificate_issuances')
      .select('certificate_url')
      .eq('event_id', eventId)
      .eq('normalized_email', normalizedEmail)
      .eq('distance', distance)
      .maybeSingle();

    if (existingCert && existingCert.certificate_url) {
      const { data: publicUrlData } = await supabase.storage
        .from('certificates')
        .createSignedUrl(existingCert.certificate_url, 60 * 60); // 1 hour

      return NextResponse.json({
        success: true,
        certificate_url: publicUrlData?.signedUrl
      });
    }

    // 3. Generate Certificate Content
    const certNumber = `BTS-${distance.replace(' ', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const eventDate = 'November 15, 2026'; // Placeholder, ideally fetch from DB
    
    const svgTemplate = `
      <svg width="1123" height="794" xmlns="http://www.w3.org/2000/svg">
        <rect width="1123" height="794" fill="#ffffff"/>
        
        <!-- Border -->
        <rect x="20" y="20" width="1083" height="754" fill="none" stroke="#4F46E5" stroke-width="10"/>
        <rect x="30" y="30" width="1063" height="734" fill="none" stroke="#E5E7EB" stroke-width="2"/>
        
        <!-- Background Decor -->
        <circle cx="0" cy="0" r="300" fill="#4F46E5" opacity="0.05" />
        <circle cx="1123" cy="794" r="400" fill="#4F46E5" opacity="0.05" />

        <g text-anchor="middle" font-family="Arial, sans-serif">
          <!-- Header -->
          <text x="561" y="150" font-size="32" font-weight="bold" fill="#4F46E5" letter-spacing="4">ARAM BTS WALKATHON</text>
          
          <text x="561" y="240" font-size="56" font-weight="900" fill="#111827">CERTIFICATE OF PARTICIPATION</text>
          
          <text x="561" y="330" font-size="20" fill="#6B7280" font-style="italic">This certificate is proudly presented to</text>
          
          <!-- Participant Name -->
          <text x="561" y="420" font-size="48" font-weight="bold" fill="#111827">${escapeXml(cleanName)}</text>
          
          <!-- Line under name -->
          <line x1="361" y1="440" x2="761" y2="440" stroke="#E5E7EB" stroke-width="2" />
          
          <text x="561" y="500" font-size="20" fill="#6B7280">for successfully completing the</text>
          
          <text x="561" y="560" font-size="32" font-weight="bold" fill="#4F46E5">${distance} Category</text>
        </g>
        
        <!-- Footer -->
        <g font-family="Arial, sans-serif" font-size="16" fill="#6B7280">
          <text x="100" y="680" font-weight="bold">Certificate No:</text>
          <text x="100" y="710" fill="#111827">${certNumber}</text>
          
          <text x="900" y="680" font-weight="bold">Date:</text>
          <text x="900" y="710" fill="#111827">${eventDate}</text>
        </g>
      </svg>
    `;

    // Convert SVG to PNG
    const pngBuffer = await sharp(Buffer.from(svgTemplate))
      .png()
      .toBuffer();

    const fileName = `${eventId}/${distance}/${certNumber}.png`;

    // 4. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pngBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 5. Save to DB
    const { error: dbError } = await supabase
      .from('certificate_issuances')
      .insert({
        event_id: eventId,
        certificate_number: certNumber,
        name: cleanName,
        email: email.trim(),
        normalized_email: normalizedEmail,
        distance,
        certificate_url: fileName,
        status: 'generated',
        email_status: 'pending'
      });

    // If there is a duplicate key error (concurrent request), we should catch it and return the existing cert
    if (dbError) {
      if (dbError.code === '23505') { // unique violation
        const { data: duplicateCert } = await supabase
          .from('certificate_issuances')
          .select('certificate_url')
          .eq('event_id', eventId)
          .eq('normalized_email', normalizedEmail)
          .eq('distance', distance)
          .single();
          
        if (duplicateCert) {
          const { data: signed } = await supabase.storage.from('certificates').createSignedUrl(duplicateCert.certificate_url, 3600);
          return NextResponse.json({ success: true, certificate_url: signed?.signedUrl });
        }
      }
      throw new Error(`DB Insert failed: ${dbError.message}`);
    }

    // 6. Queue Email Job (Asynchronous)
    const idempotencyKey = `${eventId}:${certNumber}:email`;
    const emailPayload = {
      certificateNumber: certNumber,
      name: cleanName,
      email: email.trim(),
      distance,
      certificateUrl: fileName
    };

    await supabase.from('integration_jobs').insert({
      event_id: eventId,
      provider: 'email',
      event_type: 'certificate_delivery',
      payload: emailPayload,
      idempotency_key: idempotencyKey,
      next_attempt_at: new Date().toISOString()
    });

    // 7. Get Signed URL for immediate download
    const { data: finalSignedUrl } = await supabase.storage
      .from('certificates')
      .createSignedUrl(fileName, 3600);

    return NextResponse.json({
      success: true,
      certificate_url: finalSignedUrl?.signedUrl
    });

  } catch (error: any) {
    console.error('Certificate generation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
