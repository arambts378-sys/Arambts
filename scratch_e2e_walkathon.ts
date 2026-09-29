import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { processIntegrationJobs } from './src/services/integrations/processor.ts';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("1. Creating test inbox...");
  const testAccount = await nodemailer.createTestAccount();
  const testEmail = testAccount.user;
  console.log("Test inbox created:", testEmail);

  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  
  // Need to find a valid walkathon distance category
  const { data: distances } = await supabase.from('walkathon_distance_categories').select('id, name').eq('event_id', eventId).eq('is_active', true);
  const distanceId = distances?.[0]?.id;

  if (!distanceId) throw new Error("No active distance category found");

  const payload = {
    p_event_id: eventId,
    p_person_data: {
      first_name: 'E2E',
      last_name: 'Tester',
      email: testEmail,
      phone: '1234567890',
      organization: 'ARAM BTS',
      job_title: 'QA',
      distance_category_id: distanceId,
      gender: 'Male',
      age: 30,
      t_shirt_size: 'L',
      emergency_contact_name: 'Emergency',
      emergency_contact_phone: '0987654321'
    }
  };

  console.log("2. Submitting fresh Walkathon Registration...");
  const { data: reg, error: regError } = await supabase.rpc('submit_event_registration', payload);
  if (regError) throw new Error(`Registration failed: ${regError.message}`);
  console.log("Registration successful! ID:", reg);

  console.log("3. Processing Integration Jobs (Generation)...");
  await processIntegrationJobs();

  console.log("4. Processing Integration Jobs (Delivery)...");
  await processIntegrationJobs();
  
  // Verify Database State
  const { data: jobs } = await supabase.from('integration_jobs').select('*').eq('reference_id', reg).order('created_at', { ascending: true });
  console.log("Integration Jobs for registration:");
  for (const j of jobs) {
    console.log(`- Type: ${j.job_type}, Status: ${j.status}, Attempts: ${j.attempts}`);
  }

  const { data: creds } = await supabase.from('qr_credentials').select('*').eq('registration_id', reg);
  console.log(`QR Credentials generated: ${creds?.length || 0}`);
  if (creds?.[0]) {
    console.log(`- QR ID: ${creds[0].id}, Status: ${creds[0].status}`);
  }

  console.log("5. Verification complete. Check real inbox for the email!");
}

run().catch(console.error);
