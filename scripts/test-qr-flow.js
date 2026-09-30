require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQrFlow() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  
  // 1. Get a registration
  const { data: reg } = await supabase.from('registrations').select('id, status').eq('event_id', eventId).limit(1).single();
  
  if (!reg) {
    console.error('No registration');
    return;
  }
  
  console.log('Reg status:', reg.status);
  
  // 2. Get credential
  const { data: cred } = await supabase.from('qr_credentials').select('*').eq('registration_id', reg.id).limit(1).single();
  
  if (!cred) {
    console.error('No cred');
    return;
  }
  
  const rawToken = 'ARAM:' + crypto.createHmac('sha256', supabaseKey).update(cred.id).digest('hex');
  const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  
  // 3. Get zone
  const { data: zone } = await supabase.from('access_zones').select('*').eq('event_id', eventId).limit(1).single();
  
  // 4. Get a scanner session
  const { data: session } = await supabase.from('volunteer_scanner_sessions').select('*').eq('event_id', eventId).limit(1).single();
  
  if (!session) {
    console.log('No scanner session found for event');
  }
  
  // Try calling check in RPC
  const params = {
    p_qr_token_hash: computedHash,
    p_zone_id: zone.id
  };
  
  if (session) {
    params.p_scanner_token_hash = session.token_hash;
  }
  
  console.log('Calling RPC with:', params);
  const { data: result, error } = await supabase.rpc('process_check_in', params);
  console.log('RPC Error:', error);
  console.log('RPC Result:', result);
  
  // List rules for zone
  const { data: rules } = await supabase.from('access_rules').select('*').eq('zone_id', zone.id);
  console.log('Zone rules:', rules);
}

testQrFlow();
