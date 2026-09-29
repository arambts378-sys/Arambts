const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; 

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function configureEmail() {
  const eventId = 'cdd3336e-338f-4fc7-91bd-91b36fb109d3';
  const email = 'santhoshsaram001@gmail.com';
  const appPassword = 'rzvc foqn jekq asbz'.replace(/\s+/g, '');
  
  const encryptedPass = encrypt(appPassword);
  
  const config = {
    host: 'smtp.gmail.com',
    port: 465,
    user: email,
    pass: encryptedPass,
    from: email
  };

  const { data, error } = await supabase.from('event_integrations').upsert({
    event_id: eventId,
    provider: 'email',
    is_active: true,
    config: config
  }, { onConflict: 'event_id,provider' });

  if (error) {
    console.error('Failed to configure email:', error);
  } else {
    console.log('Successfully configured email integration for event:', eventId);
  }
}

configureEmail().catch(console.error);
