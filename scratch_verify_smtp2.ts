import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  
  const { data, error } = await supabase
    .from('event_integrations')
    .select('*')
    .eq('event_id', eventId);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("All integrations for event:", data);
}

run().catch(console.error);
