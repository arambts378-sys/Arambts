import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  const registrationId = '455cf6ce-b6ef-4a01-8a68-a49c49d740db'; // The one we just created
  
  // Create a new delivery job for this registration manually (as the resend endpoint does)
  // Wait, let's see how the resend endpoint does it.
  // It inserts a new 'email' job of type 'qr_delivery'.
  
  const { data: creds } = await supabase.from('qr_credentials').select('*').eq('registration_id', registrationId);
  const credential = creds?.[0];
  if (!credential) throw new Error("No credential");
  
  const payload = {
    registrationId,
    credentialId: credential.id
  };
  
  console.log("Triggering resend job...");
  const { error } = await supabase.from('integration_jobs').insert({
    event_id: eventId,
    registration_id: registrationId,
    provider: 'email',
    event_type: 'qr_delivery',
    payload: payload,
    idempotency_key: `${eventId}:${registrationId}:resend:${Date.now()}`,
    status: 'pending',
    next_attempt_at: new Date().toISOString()
  });
  
  if (error) {
    console.error("Resend job enqueue failed:", error);
  } else {
    console.log("Resend job queued successfully.");
  }
}

run().catch(console.error);
