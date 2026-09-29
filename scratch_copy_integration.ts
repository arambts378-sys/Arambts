import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sourceEventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const targetEventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  
  const { data: source, error: err1 } = await supabase.from('event_integrations').select('*').eq('event_id', sourceEventId).eq('provider', 'email');
  if (err1 || !source || source.length === 0) {
    console.error("No source config found", err1);
    return;
  }
  
  const configToCopy = source[0];
  console.log("Copying config from:", sourceEventId);
  console.log("To:", targetEventId);
  
  const payload = {
    event_id: targetEventId,
    provider: 'email',
    is_active: true,
    config: configToCopy.config
  };
  
  const { error: err2 } = await supabase.from('event_integrations').insert(payload);
  if (err2) {
    console.error("Failed to copy:", err2);
  } else {
    console.log("Successfully copied integration!");
  }
}

run().catch(console.error);
