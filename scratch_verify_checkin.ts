import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  const registrationId = '455cf6ce-b6ef-4a01-8a68-a49c49d740db';
  
  // 1. Get active QR credential
  const { data: creds } = await supabase.from('qr_credentials').select('*').eq('registration_id', registrationId);
  console.log("Credentials:", creds);
  
  if (!creds || creds.length === 0) {
    console.error("No active QR credential found!");
    return;
  }
  const qrToken = creds[0].qr_token;
  
  // 2. Simulate valid check-in API call
  // The API is POST /api/events/[eventId]/check-in with { qrToken }
  // Since we need to bypass auth for script, we'll just call check_in_participant RPC
  console.log("Attempting valid check-in...");
  const { data: res1, error: err1 } = await supabase.rpc('check_in_participant', {
    p_qr_token: qrToken,
    p_event_id: eventId,
    p_scanned_by: null, // system
    p_checkpoint_id: null
  });
  
  if (err1) {
    console.log("Valid check-in failed (Expected if volunteer auth required, but let's see):", err1.message);
  } else {
    console.log("Valid check-in result:", res1);
  }
  
  // 3. Simulate Invalid Check-in (e.g. wrong event)
  console.log("Attempting invalid check-in (wrong event)...");
  const { data: res2, error: err2 } = await supabase.rpc('check_in_participant', {
    p_qr_token: qrToken,
    p_event_id: 'cdd3336e-338f-4fc7-91bd-91b36fb109d3',
    p_scanned_by: null,
    p_checkpoint_id: null
  });
  
  if (err2) {
    console.log("Invalid check-in rejected correctly:", err2.message);
  } else {
    console.log("Invalid check-in result:", res2);
  }
}

run().catch(console.error);
