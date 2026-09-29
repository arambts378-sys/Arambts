"use server";

import { registrationsService } from '@/services/registrations';
import { processRegistrationIntegrationJobs } from '@/services/integrations/processor';

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

    // 2. Immediately process integration jobs for this specific registration
    if (result.success && result.registration_id) {
      try {
        // This processes qr_generation. If it succeeds, it queues qr_delivery.
        // We will call it twice sequentially. The first pass processes qr_generation.
        await processRegistrationIntegrationJobs(result.registration_id);
        
        // The second pass processes qr_delivery (since it was just inserted).
        await processRegistrationIntegrationJobs(result.registration_id);
      } catch (processorError) {
        console.error("Targeted processor failed, but registration succeeded", processorError);
        // We don't fail the registration if the processor throws, jobs stay pending/failed for Cron.
        return {
          ...result,
          emailDeliveryFailed: true
        };
      }
    }

    return {
      ...result,
      emailDeliveryFailed: false
    };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
}
