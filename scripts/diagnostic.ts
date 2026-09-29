import { createAdminClient } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDiagnostic() {
  const adminClient = createAdminClient();
  const email = 'santhosh.45935533@gmail.com'.trim().toLowerCase();
  
  console.log(`[DIAGNOSTIC] Testing user lookup for ${email}`);

  // Test listUsers directly
  let page = 1;
  const perPage = 1000;
  let foundUser = null;
  let userCount = 0;

  console.log(`[DIAGNOSTIC] Starting listUsers pagination...`);
  while (true) {
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (listError) {
      console.log(`[DIAGNOSTIC] listUsers ERROR:`, listError);
      break;
    }
    
    const count = usersData?.users?.length || 0;
    userCount += count;
    console.log(`[DIAGNOSTIC] Page ${page} returned ${count} users`);
    
    if (count > 0) {
      const match = usersData.users.find((u: any) => u.email?.toLowerCase() === email);
      if (match) {
        foundUser = match;
        console.log(`[DIAGNOSTIC] FOUND user on page ${page}:`, match.id);
        break;
      }
    }
    
    if (count < perPage) {
      console.log(`[DIAGNOSTIC] Reached end of pagination (count < ${perPage})`);
      break;
    }
    page++;
  }
  
  console.log(`[DIAGNOSTIC] Total users scanned: ${userCount}`);
  console.log(`[DIAGNOSTIC] User found via listUsers: ${!!foundUser}`);

  // Test createUser to see the exact error
  if (!foundUser) {
    console.log(`[DIAGNOSTIC] Attempting createUser to see exact error...`);
    const { data: createData, error: createUserError } = await adminClient.auth.admin.createUser({
      email: email,
      email_confirm: true
    });
    
    if (createUserError) {
      console.log(`[DIAGNOSTIC] createUser ERROR:`, {
        status: createUserError.status,
        code: createUserError.code,
        name: createUserError.name,
        message: createUserError.message
      });
    } else {
      console.log(`[DIAGNOSTIC] createUser SUCCESS:`, createData.user?.id);
    }
  }
}

testDiagnostic();
