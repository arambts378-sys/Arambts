import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function enableRegistration() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const { data, error } = await supabase
    .from('event_registration_settings')
    .upsert({
      event_id: eventId,
      is_enabled: true
    }, { onConflict: 'event_id' })
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

enableRegistration();
