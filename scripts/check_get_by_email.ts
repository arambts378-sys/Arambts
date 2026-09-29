import { createAdminClient } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkGetByEmail() {
  const adminClient = createAdminClient();
  const email = 'praveenkumarraram@gmail.com';
  
  if (typeof adminClient.auth.admin.getUserByEmail === 'function') {
    console.log('getUserByEmail EXISTS in this SDK version!');
    const result = await adminClient.auth.admin.getUserByEmail(email);
    console.log('Result:', result.data?.user?.id);
  } else {
    console.log('getUserByEmail DOES NOT EXIST in this SDK version.');
  }
}

checkGetByEmail();
