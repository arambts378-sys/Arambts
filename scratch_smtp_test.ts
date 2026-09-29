import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { decryptSecret } from './src/utils/encryption.ts';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'aa9e1dc3-b19f-436d-a42c-14b9895b6288';
  const { data, error } = await supabase.from('event_integrations').select('*').eq('event_id', eventId).eq('provider', 'email');
  
  if (error || !data || data.length === 0) {
    console.error("Failed to fetch integration", error);
    return;
  }
  
  const config = data[0].config;
  const pass = decryptSecret(config.pass);
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: parseInt(config.port) === 465,
    auth: { user: config.user, pass }
  });

  try {
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP Verification Successful!");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: 'test@example.com', // Ethereal catches all, but real smtp might require a real email? I'll use config.user
      subject: 'ARAM BTS E2E Test',
      text: 'Test connection successful!'
    });
    console.log("Test email sent! Message ID:", info.messageId);
  } catch (err: any) {
    console.error("SMTP Error:", err.message);
  }
}

run().catch(console.error);
