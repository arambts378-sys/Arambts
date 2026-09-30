import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { qrCredentialsService } from '@/services/qrCredentials';

export const emailProvider = {
  process: async (job: any, event: any, config: any) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    let { host, port, user, pass, fromEmail, fromName, subject, customMessage } = config;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch (e) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { registrationNumber, attendee } = job.payload;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"${fromName || event.name}" <${fromEmail || user}>`,
      to: attendee.email,
      subject: subject || `Registration Confirmed: ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-800">
          <h1 style="color: #4F46E5; margin-bottom: 20px;">Registration Confirmed!</h1>
          <p>Hi ${attendee.firstName},</p>
          <p>Your registration for <strong>${event.name}</strong> has been successfully confirmed.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; rounded: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Registration Number:</strong> <span style="color: #4F46E5;">${registrationNumber}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${event.name}</p>
          </div>

          ${customMessage ? `<p style="margin-bottom: 24px;">${customMessage}</p>` : ''}
          
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The ${event.name} Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  },

  sendQrDelivery: async (job: any, event: any, config: any) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    let { host, port, user, pass, fromEmail, fromName, subject, customMessage } = config;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch (e) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    let { registrationId, registrationNumber, attendee } = job.payload;

    // 1. Resolve active QR credential
    const supabase = createAdminClient();
    const { data: credential, error: credError } = await supabase
      .from('qr_credentials')
      .select(`
        *,
        registrations!inner(
          registration_number,
          distance_category_id,
          event_people!inner(
            people!inner(
              first_name,
              last_name,
              email
            )
          )
        )
      `)
      .eq('event_id', event.id)
      .eq('registration_id', registrationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (credError || !credential) {
      throw new Error('Active QR credential not found for this registration');
    }

    // Fallback if payload is missing full attendee info
    if (!attendee || !attendee.email) {
      const person = credential.registrations?.event_people?.[0]?.people;
      if (!person) throw new Error('Attendee details not found');
      
      attendee = {
        firstName: person.first_name,
        lastName: person.last_name,
        email: person.email
      };
      registrationNumber = credential.registrations?.registration_number;
    }

    // Fetch Distance Category for Walkathons
    let distanceCategoryName = null;
    if (event.type === 'Walkathon' && credential.registrations?.distance_category_id) {
      const { data: distData } = await supabase
        .from('walkathon_distance_categories')
        .select('name')
        .eq('id', credential.registrations.distance_category_id)
        .maybeSingle();
      if (distData) distanceCategoryName = distData.name;
    }

    // 2. Recover Raw Token securely
    const rawToken = qrCredentialsService.recoverRawToken(credential.id);

    // 3. Generate Ticket QR Code Image directly as Base64 PNG
    const qrDataUrl = await QRCode.toDataURL(rawToken, {
      type: 'image/png',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' }
    });
    
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    const eventDate = event?.date ? new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBA';
    const eventTime = event?.date ? new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Time TBA';
    const venue = event?.venue || 'Venue TBA';

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"${fromName || event.name}" <${fromEmail || user}>`,
      to: attendee.email,
      subject: subject || `Registration Confirmed — ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <!-- Email Header -->
            <div style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="color: #4F46E5; margin: 0 0 10px 0; font-size: 24px;">Registration Confirmed</h1>
              <p style="margin: 0; color: #4b5563; font-size: 16px;">Hello ${attendee.firstName}, your registration for <strong>${event.name}</strong> is confirmed.</p>
            </div>

            <!-- Ticket Container -->
            <div style="padding: 30px; background-color: #ffffff;">
              <div style="border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <!-- Ticket Header -->
                <div style="background-color: #4F46E5; padding: 20px; text-align: center; color: white;">
                  <div style="font-size: 12px; font-weight: bold; letter-spacing: 2px; opacity: 0.8; margin-bottom: 5px;">ARAM BTS</div>
                  <div style="font-size: 22px; font-weight: 900;">${event.name}</div>
                </div>

                <!-- Ticket Details -->
                <div style="padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Attendee</div>
                        <div style="font-size: 16px; font-weight: bold; color: #111827;">${attendee.firstName} ${attendee.lastName || ''}</div>
                      </td>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Registration ID</div>
                        <div style="font-size: 14px; font-family: monospace; font-weight: bold; color: #4F46E5;">${registrationNumber}</div>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Date</div>
                        <div style="font-size: 14px; font-weight: 600; color: #111827;">${eventDate}</div>
                        <div style="font-size: 12px; color: #6b7280;">${eventTime}</div>
                      </td>
                      <td width="50%" valign="top" style="padding-bottom: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Venue</div>
                        <div style="font-size: 14px; font-weight: 600; color: #111827;">${venue}</div>
                      </td>
                    </tr>
                    ${distanceCategoryName ? `
                    <tr>
                      <td colspan="2" valign="top" style="padding: 12px; background-color: #f3f4ff; border-radius: 8px;">
                        <div style="font-size: 11px; font-weight: bold; color: #4F46E5; text-transform: uppercase; margin-bottom: 4px;">Distance</div>
                        <div style="font-size: 18px; font-weight: 900; color: #111827;">${distanceCategoryName}</div>
                      </td>
                    </tr>
                    ` : ''}
                  </table>

                  <div style="text-align: center; margin-top: 25px; padding-top: 25px; border-top: 1px dashed #d1d5db;">
                    <img src="cid:event_ticket_qr" alt="QR Code" width="160" height="160" style="display: inline-block; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px;" />
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 600;">Present this ticket at the event.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Instructions -->
            <div style="padding: 0 30px 30px 30px; text-align: center;">
              ${customMessage ? `<p style="margin-bottom: 20px; font-size: 14px; color: #4b5563;">${customMessage}</p>` : ''}
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Regards,<br>The ${event.name} Team</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `qr-${registrationNumber}.png`,
          content: qrBase64,
          encoding: 'base64',
          cid: 'event_ticket_qr'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    return { success: true };
  },

  sendScannerAccess: async (config: any, event: any, sessionData: any) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    let { host, port, user, pass, fromEmail, fromName, subject } = config;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch (e) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { volunteerEmail, scannerLink, allowedZones, allowedDistances, expiresAt } = sessionData;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"${fromName || event.name}" <${fromEmail || user}>`,
      to: volunteerEmail,
      subject: subject || `Scanner Access — ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            
            <div style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="color: #4F46E5; margin: 0 0 10px 0; font-size: 24px;">Event Scanner Access</h1>
              <p style="margin: 0; color: #4b5563; font-size: 16px;">You have been granted scanner access for <strong>${event.name}</strong>.</p>
            </div>

            <div style="padding: 30px;">
              <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Allowed Zones:</strong> ${allowedZones.join(', ')}</p>
              <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Allowed Distances:</strong> ${allowedDistances.length > 0 ? allowedDistances.join(', ') : 'All Participants'}</p>
              ${expiresAt ? `<p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleString()}</p>` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${scannerLink}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px;">Open Scanner</a>
              </div>
            </div>

            <div style="padding: 0 30px 30px 30px; text-align: center;">
              <p style="margin-bottom: 20px; font-size: 14px; color: #ef4444; font-weight: bold;">SECURITY WARNING: Do not share this link with anyone. It provides direct scanning authorization without a password.</p>
              <p style="margin: 0; font-size: 14px; color: #9ca3af;">Regards,<br>The ${event.name} Team</p>
            </div>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return { success: true };
  },

  sendCertificateDelivery: async (job: any, event: any, config: any) => {
    if (!config || !config.host) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    let { host, port, user, pass, fromEmail, fromName } = config;
    try {
      const { decryptSecret } = await import('@/utils/encryption');
      pass = decryptSecret(pass);
    } catch (e) {
      throw new Error('EMAIL_INTEGRATION_NOT_CONFIGURED');
    }

    const { certificateNumber, name, email, distance, certificateUrl } = job.payload;
    
    // Download certificate from storage
    const supabase = createAdminClient();
    const { data: fileData, error: dlError } = await supabase.storage.from('certificates').download(certificateUrl);
    
    if (dlError || !fileData) {
      throw new Error(`Failed to download certificate image: ${dlError?.message}`);
    }
    
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465,
      auth: { user, pass }
    });

    const mailOptions = {
      from: `"${fromName || event.name}" <${fromEmail || user}>`,
      to: email,
      subject: `Your Certificate of Participation — ${event.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100 text-gray-800">
          <h1 style="color: #4F46E5; margin-bottom: 20px;">Certificate Ready!</h1>
          <p>Hi ${name},</p>
          <p>Congratulations on successfully participating in the <strong>${event.name}</strong> ${distance} Category.</p>
          
          <div style="background-color: #f3f4f6; padding: 16px; rounded: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Certificate Number:</strong> <span style="color: #4F46E5;">${certificateNumber}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Distance:</strong> ${distance}</p>
          </div>

          <p>Please find your official certificate attached to this email.</p>
          
          <p>Best regards,<br>The ${event.name} Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `${certificateNumber}.png`,
          content: buffer,
          contentType: 'image/png'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Certificate email sent: %s", info.messageId);
    
    // Update email status
    await supabase.from('certificate_issuances')
      .update({ email_status: 'sent' })
      .eq('certificate_number', certificateNumber);
      
    return { success: true };
  },

};
