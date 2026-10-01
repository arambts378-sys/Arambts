import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking if volunteer_scanner_sessions table exists...");
  const { error } = await supabase
    .from('volunteer_scanner_sessions')
    .select('id')
    .limit(1);
    
  if (error) {
    console.error("Migration NOT applied or error:", error.message);
  } else {
    console.log("Migration applied! volunteer_scanner_sessions exists.");
  }
}

run();
