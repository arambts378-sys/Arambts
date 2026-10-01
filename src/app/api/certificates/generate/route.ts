import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateCertificatePng } from '@/lib/certificate/renderer';

export async function POST(request: Request) {
  try {
    const { name, email, action, certificateType = 'standard' } = await request.json();
    
    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    if (action === 'email' && (!email || typeof email !== 'string' || email.trim().length === 0)) {
      return NextResponse.json({ success: false, error: 'Email is required for email delivery' }, { status: 400 });
    }

    const cleanName = name.trim();
    let normalizedEmail: string | null = null;
    
    if (email && typeof email === 'string' && email.trim().length > 0) {
      normalizedEmail = email.trim().toLowerCase();
      // Simple email regex validation only required for email action
      if (action === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
      }
    }

    // 2. Idempotency Check for Email Delivery
    const eventId = process.env.CERTIFICATE_EVENT_ID;
    if (action === 'email' && !eventId) {
      return NextResponse.json({ success: false, error: 'Event ID not configured' }, { status: 500 });
    }

    const supabase = createAdminClient();

    if (action === 'email' && normalizedEmail && eventId) {
      const { data: existingCert } = await supabase
        .from('certificate_issuances')
        .select('certificate_url')
        .eq('event_id', eventId)
        .eq('normalized_email', normalizedEmail)
        .eq('distance', certificateType === '5KM' ? '5KM' : 'standard')
        .maybeSingle();

      if (existingCert && existingCert.certificate_url) {
        // Just return the existing one without doing more work
        const { data: publicUrlData } = await supabase.storage
          .from('certificates')
          .createSignedUrl(existingCert.certificate_url, 60 * 60);

        return NextResponse.json({
          success: true,
          certificate_url: publicUrlData?.signedUrl
        });
      }
    }

    // 3. Generate Certificate Content using Shared Rendering Service
    const pngBuffer = await generateCertificatePng({
      type: certificateType === '5KM' ? '5KM' : 'standard',
      name: cleanName
    });

    // IF ACTION IS DOWNLOAD, RETURN PNG DIRECTLY AND EXIT
    if (action === 'download') {
      const prefix = certificateType === '5KM' ? 'ARAM-BTS-5KM-Certificate' : 'ARAM-BTS-Certificate';
      const safeFilename = `${prefix}-${cleanName.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-')}.png`;
      
      return new NextResponse(pngBuffer as any, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
          'Content-Length': pngBuffer.length.toString()
        }
      });
    }

    // FROM HERE ON, WE ARE PROCESSING EMAIL ACTION WHICH REQUIRES STORAGE & DB
    const certNumber = `BTS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const fileName = `${eventId}/${certNumber}.png`;

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

    // 5. Save to DB and Queue Email
    if (action === 'email' && normalizedEmail && eventId) {
      const { error: dbError } = await supabase
        .from('certificate_issuances')
        .insert({
          event_id: eventId,
          certificate_number: certNumber,
          name: cleanName,
          email: email.trim(),
          normalized_email: normalizedEmail,
          distance: certificateType === '5KM' ? '5KM' : 'standard', // Maps to DB type
          certificate_url: fileName,
          status: 'generated',
          email_status: 'pending'
        });

      if (dbError) {
        // Check for uniqueness violation
        if (dbError.code === '23505') {
          const { data: duplicateCert } = await supabase
            .from('certificate_issuances')
            .select('certificate_url')
            .eq('event_id', eventId)
            .eq('normalized_email', normalizedEmail)
            .eq('distance', certificateType === '5KM' ? '5KM' : 'standard')
            .single();
            
          if (duplicateCert) {
            const { data: signed } = await supabase.storage.from('certificates').createSignedUrl(duplicateCert.certificate_url, 3600);
            return NextResponse.json({ success: true, certificate_url: signed?.signedUrl });
          }
        }
        throw new Error(`DB Insert failed: ${dbError.message}`);
      }

      // Queue Email Job
      const idempotencyKey = `${eventId}:${certNumber}:email`;
      const emailPayload = {
        certificateNumber: certNumber,
        name: cleanName,
        email: email.trim(),
        distance: certificateType === '5KM' ? '5KM' : 'Walkathon',
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
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate queued for email delivery'
    });

  } catch (error: unknown) {
    console.error('Certificate generation error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ success: false, error: 'Internal server error', message: msg, stack }, { status: 500 });
  }
}

