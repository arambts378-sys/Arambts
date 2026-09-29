import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { host, port, user, pass, encryption, fromName, fromEmail, testEmail } = body;

    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate Event Access / Workspace Role
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('workspace_id')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_workspace_id: eventData.workspace_id,
      p_permission_name: 'events.update'
    });

    if (!hasPerm) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 3. Resolve password if it was left blank (use existing from db)
    let finalPassword = pass;
    if (!finalPassword || finalPassword.trim() === '') {
      const { data: existingIntegration } = await supabase
        .from('event_integrations')
        .select('config')
        .eq('event_id', eventId)
        .eq('provider', 'email')
        .maybeSingle();
      
      if (existingIntegration?.config?.pass) {
        try {
          const { decryptSecret } = await import('@/utils/encryption');
          finalPassword = decryptSecret(existingIntegration.config.pass);
        } catch (e) {
          console.error("Failed to decrypt stored password during test");
          return NextResponse.json({ success: false, message: 'Existing password could not be decrypted.' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ success: false, message: 'Password is required to test the connection.' }, { status: 400 });
      }
    }

    // 4. Create Transporter
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: {
        user: user,
        pass: finalPassword
      }
    });

    // 5. Test connection
    try {
      await transporter.verify();
    } catch (error: any) {
      console.error('SMTP Verification Failed:', error.message);
      return NextResponse.json({ success: false, message: 'Unable to connect to the email server. Check credentials.' }, { status: 400 });
    }

    // 6. Optionally send a test email
    if (testEmail) {
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: testEmail,
          subject: 'ARAM BTS Email Configuration Test',
          text: 'Your ARAM BTS email configuration is working correctly.\n\nThis is a test email.',
          html: '<p>Your ARAM BTS email configuration is working correctly.</p><p>This is a test email.</p>'
        });
      } catch (error: any) {
        console.error('Test Email Failed:', error.message);
        return NextResponse.json({ success: false, message: 'Connected, but failed to send test email.' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, message: 'Email connection verified.' });

  } catch (error: any) {
    console.error('Error in email test API:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
