import { accessControlService } from './src/services/accessControl.ts';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  const registrationId = '455cf6ce-b6ef-4a01-8a68-a49c49d740db';
  
  const { data: creds } = await supabase.from('qr_credentials').select('*').eq('registration_id', registrationId);
  const qrToken = creds[0].qr_token;
  const rawQrStr = 'ARAM-' + qrToken;
  
  let zoneId;
  const { data: existingZones } = await supabase.from('access_zones').select('id').eq('event_id', eventId);
  if (existingZones && existingZones.length > 0) {
    zoneId = existingZones[0].id;
    console.log("Using existing access zone:", zoneId);
  } else {
    // Create an access zone for testing Walkathon Checkin
    const { data: newZone, error: zErr } = await supabase.from('access_zones').insert({
      event_id: eventId,
      name: 'Main Check-in',
      zone_type: 'main',
      is_active: true
    }).select('id').single();
    if (zErr) throw zErr;
    zoneId = newZone.id;
    console.log("Created test access zone:", zoneId);
  }
  
  // 1. Valid Check-in
  console.log("Attempting valid check-in...");
  const tokenHash = crypto.createHash('sha256').update(rawQrStr).digest('hex');
  const { data: res1, error: e1 } = await supabase.rpc('process_check_in', {
      p_qr_token_hash: tokenHash,
      p_zone_id: zoneId,
      p_scanner_token_hash: null
  });
  console.log("Valid check-in result:", res1, e1?.message);
  
  // 2. Invalid Check-in
  console.log("Attempting invalid check-in (different event zone)...");
  const invalidZoneId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3'; 
  const { data: res2, error: e2 } = await supabase.rpc('process_check_in', {
      p_qr_token_hash: tokenHash,
      p_zone_id: invalidZoneId,
      p_scanner_token_hash: null
  });
  console.log("Invalid check-in result:", res2, e2?.message);
}

run().catch(console.error);
