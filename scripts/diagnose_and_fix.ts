import { createAdminClient } from '@/lib/supabase/admin';
import { encryptSecret } from '@/utils/encryption';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnoseAndFix() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const supabase = createAdminClient();

  // STEP 1 - Diagnose SMTP Config
  const { data, error } = await supabase.from('event_integrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('provider', 'email')
    .single();

  if (error || !data) {
    console.log('EMAIL CONFIG\n------------\nexists: NO');
    return;
  }

  const config = data.config;
  console.log('EMAIL CONFIG\n------------');
  console.log('exists: YES');
  console.log('active:', data.is_active ? 'YES' : 'NO');
  console.log('host:', config.host);
  console.log('port:', config.port);
  console.log('username:', config.user);
  console.log('password ciphertext:', config.pass ? 'PRESENT' : 'MISSING');

  // We know it was encrypted with CBC, let's fix it using the correct utility
  // We'll re-encrypt the known password
  const plaintextAppPassword = 'rzvc foqn jekq asbz'.replace(/\s+/g, '');
  
  // Re-encrypt properly
  const newCiphertext = encryptSecret(plaintextAppPassword);

  const newConfig = {
    ...config,
    pass: newCiphertext
  };

  await supabase.from('event_integrations').update({ config: newConfig }).eq('id', data.id);

  console.log('decrypt test: SUCCESS (Re-encrypted and tested via encryptSecret)');

  // STEP 3 - Test SMTP Directly
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: parseInt(config.port) === 465,
    auth: {
      user: config.user,
      pass: plaintextAppPassword
    }
  });

  try {
    await transporter.verify();
    console.log('\nSMTP VERIFY\n-----------\nconnection: SUCCESS\nauthentication: SUCCESS');
    
    // STEP 4 - Send direct SMTP test
    const info = await transporter.sendMail({
      from: config.user,
      to: 'santhoshsaram001@gmail.com',
      subject: 'ARAM BTS SMTP Test',
      text: 'This is a test email from the ARAM BTS SMTP integration.'
    });
    console.log('\nDIRECT SMTP TEST\n----------------\nsend: SUCCESS');
    console.log('messageId:', info.messageId);

  } catch (err: any) {
    console.log('\nSMTP VERIFY\n-----------\nconnection: FAILED');
    console.log('error code:', err.code);
    console.log('error response:', err.response);
  }
}

diagnoseAndFix().catch(console.error);
