"use server";

import { registrationsService } from '@/services/registrations';
import { processRegistrationIntegrationJobs } from '@/services/integrations/processor';
import { qrCredentialsService } from '@/services/qrCredentials';

import { createAdminClient } from '@/lib/supabase/admin';

export async function submitRegistrationServerAction(
  eventId: string,
  personData: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
    organization?: string;
    job_title?: string;
    distance_category_id?: string;
    gender?: string;
    age?: string;
    t_shirt_size?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }
) {
  try {
    // 1. Submit Registration (creates records + initial jobs in DB)
    const result = await registrationsService.submitPublicRegistration(eventId, personData);

    let qrToken = undefined;
    let emailDeliveryFailed = false;

    if (result.success && result.registration_id) {
      // 2. Synchronously Generate QR Credential
      // This is a strict requirement for the frontend to render the ticket.
      // We do not wrap this in a catch block because if it fails, the registration is technically incomplete 
      // (the user can't check in), but wait, the user's registration IS in the database.
      // If generateQrCredential fails because it already exists, it will throw. We should catch and try to get it.
      let credential = await qrCredentialsService.getQrCredential(result.registration_id);
      
      if (!credential) {
        const genResult = await qrCredentialsService.generateQrCredential(eventId, result.registration_id, true);
        credential = genResult.credential;
      }
      
      if (credential) {
        qrToken = qrCredentialsService.recoverRawToken(credential.id);
      }

      // 3. Queue Email Delivery if enabled
      try {
        const supabase = createAdminClient();
        const { data: integrations } = await supabase
          .from('event_integrations')
          .select('provider')
          .eq('event_id', eventId)
          .eq('provider', 'email')
          .eq('is_active', true)
          .maybeSingle();

        if (integrations) {
          const payload = {
            registrationId: result.registration_id,
            registrationNumber: result.registration_number,
            attendee: {
              firstName: personData.first_name,
              lastName: personData.last_name,
              email: personData.email,
              phone: personData.phone
            }
          };
          
          const idempotencyKey = `${eventId}:${result.registration_id}:email:qr_delivery`;
          
          await supabase.from('integration_jobs').insert({
            event_id: eventId,
            registration_id: result.registration_id,
            provider: 'email',
            event_type: 'qr_delivery',
            payload: payload,
            idempotency_key: idempotencyKey,
            next_attempt_at: new Date().toISOString()
          }).select('*').maybeSingle(); // This will safely fail on conflict (duplicate) due to idempotency_key

          // Try to process immediately
          await processRegistrationIntegrationJobs(result.registration_id);
        }
      } catch (emailErr) {
        console.error("Email queuing/processing failed", emailErr);
        emailDeliveryFailed = true;
      }
    }

    return {
      ...result,
      qrToken,
      emailDeliveryFailed
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
}
