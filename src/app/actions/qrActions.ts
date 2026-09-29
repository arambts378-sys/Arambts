"use server";

import { qrCredentialsService } from "@/services/qrCredentials";
import { revalidatePath } from "next/cache";

export async function regenerateQrAction(eventId: string, registrationId: string) {
  await qrCredentialsService.regenerateQrCredential(eventId, registrationId, false);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
}

export async function revokeQrAction(eventId: string, credentialId: string) {
  await qrCredentialsService.revokeQrCredential(credentialId);
  revalidatePath(`/app/events/${eventId}/operations/access-control`);
}

export async function resendQrAction(eventId: string, registrationId: string, payload: any) {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const idempotencyKey = `${eventId}:${registrationId}:email:qr_delivery:manual_${Date.now()}`;
  
  await supabase.from('integration_jobs').insert({
    event_id: eventId,
    registration_id: registrationId,
    provider: 'email',
    event_type: 'qr_delivery',
    payload: payload,
    idempotency_key: idempotencyKey,
    next_attempt_at: new Date().toISOString()
  });

  const { integrationsService } = await import('@/services/integrations');
  integrationsService.triggerJobProcessor().catch(console.error);
}
