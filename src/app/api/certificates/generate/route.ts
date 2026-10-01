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

    // For email: check if this email+distance combination already has a successfully-sent cert
    if (action === 'email' && normalizedEmail && eventId) {
      const { data: existingCert } = await supabase
        .from('certificate_issuances')
        .select('certificate_url, email_status')
        .eq('event_id', eventId)
        .eq('normalized_email', normalizedEmail)
        .eq('distance', certificateType === '5KM' ? '5KM' : 'standard')
        .maybeSingle();

      if (existingCert && existingCert.email_status === 'sent') {
        // Already sent successfully — don't resend
        return NextResponse.json({
          success: true,
          message: 'Certificate was already sent to your email.'
        });
      }
      // If it exists but failed, we'll generate a new cert and try again
    }

    // 3. Generate Certificate PNG using unified renderer
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

    // FROM HERE ON, WE ARE PROCESSING EMAIL ACTION
    const certNumber = `BTS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const fileName = `${eventId}/${certNumber}.png`;

    // 4. Upload PNG to Supabase Storage (for record-keeping)
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pngBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 5. Save issuance record
    if (action === 'email' && normalizedEmail && eventId) {
      const { error: dbError } = await supabase
        .from('certificate_issuances')
        .insert({
          event_id: eventId,
          certificate_number: certNumber,
          name: cleanName,
          email: email.trim(),
          normalized_email: normalizedEmail,
          distance: certificateType === '5KM' ? '5KM' : 'standard',
          certificate_url: fileName,
          status: 'generated',
          email_status: 'pending'
        });

      if (dbError && dbError.code !== '23505') {
        throw new Error(`DB Insert failed: ${dbError.message}`);
      }

      // 6. Fetch the event's email integration config (where encrypted SMTP creds live)
      const { data: integrationData } = await supabase
        .from('event_integrations')
        .select('config')
        .eq('event_id', eventId)
        .eq('provider', 'email')
        .eq('is_active', true)
        .maybeSingle();

      if (!integrationData) {
        // No email integration configured — update status and tell user to download
        await supabase.from('certificate_issuances')
          .update({ email_status: 'failed' })
          .eq('certificate_number', certNumber);

        return NextResponse.json({
          success: false,
          error: 'Email service not configured for this event. Please download your certificate instead.'
        }, { status: 503 });
      }

      const config = integrationData.config as {
        host: string; port: string; user: string; pass: string;
        fromEmail?: string; fromName?: string;
      };

      // 7. Send certificate email SYNCHRONOUSLY (no cron/background worker needed)
      const { emailProvider } = await import('@/services/integrations/providers/email');
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', eventId)
        .single();

      const certJob = {
        payload: {
          certificateNumber: certNumber,
          name: cleanName,
          email: email.trim(),
          distance: certificateType === '5KM' ? '5KM' : 'Walkathon',
          certificateUrl: fileName
        }
      };

      try {
        await emailProvider.sendCertificateDelivery(certJob, eventData!, config);
        // Mark as sent
        await supabase.from('certificate_issuances')
          .update({ email_status: 'sent' })
          .eq('certificate_number', certNumber);
      } catch (emailError: unknown) {
        const errMsg = emailError instanceof Error ? emailError.message : String(emailError);
        console.error('Certificate email send failed:', errMsg);
        await supabase.from('certificate_issuances')
          .update({ email_status: 'failed' })
          .eq('certificate_number', certNumber);
        return NextResponse.json({
          success: false,
          error: 'Certificate was generated but email delivery failed. Please try downloading instead.',
          detail: errMsg
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate sent to your email successfully!'
    });

  } catch (error: unknown) {
    console.error('Certificate generation error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ success: false, error: 'Internal server error', message: msg, stack }, { status: 500 });
  }
}
