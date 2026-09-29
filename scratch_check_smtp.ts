import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all email event_integrations...");
  const { data, error } = await supabase.from('event_integrations').select('*').eq('provider', 'email');
  if (error) {
    console.error(error);
    return;
  }
  
  for (const integration of data) {
    console.log(`Integration ID: ${integration.id}, Event ID: ${integration.event_id}, Active: ${integration.is_active}`);
    const host = integration.config?.host;
    if (host && host.includes('ethereal')) {
      console.log(`=> Found Ethereal integration! Deleting...`);
      const { error: delError } = await supabase.from('event_integrations').delete().eq('id', integration.id);
      if (delError) console.error("Failed to delete:", delError);
      else console.log("Deleted Ethereal integration successfully.");
    } else {
      console.log(`=> Config Host: ${host}`);
    }
  }
}

run().catch(console.error);
