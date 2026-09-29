import { createAdminClient } from '../src/lib/supabase/admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDiagnosticCreate() {
  const adminClient = createAdminClient();
  const email = 'santhosh.45935533@gmail.com'.trim().toLowerCase();
  
  console.log(`[DIAGNOSTIC] Forcing createUser on existing user ${email}`);

  const { data: createData, error: createUserError } = await adminClient.auth.admin.createUser({
    email: email,
    email_confirm: true
  });
  
  if (createUserError) {
    console.log(`[DIAGNOSTIC] createUser ERROR:`, {
      status: createUserError.status,
      code: createUserError.code,
      name: createUserError.name,
      message: createUserError.message,
      asString: String(createUserError)
    });
  } else {
    console.log(`[DIAGNOSTIC] createUser SUCCESS:`, createData.user?.id);
  }
}

testDiagnosticCreate();
