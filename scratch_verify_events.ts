import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, type');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Events:");
  data.forEach(d => console.log(d.id, d.name, d.type));
}

run().catch(console.error);
