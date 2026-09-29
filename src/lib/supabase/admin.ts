import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the SERVICE_ROLE_KEY.
 * This client BYPASSES Row Level Security (RLS).
 * 
 * NEVER use this client to return data to a user directly, 
 * as it ignores all access controls. Use it strictly for internal 
 * system operations (e.g. background queue processors, automated QR generation).
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
