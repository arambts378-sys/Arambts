'use server'

import { createAdminClient } from '@/lib/supabase/admin';

export async function getVolunteerEmails(userIds: string[]) {
  const adminClient = createAdminClient();
  const result: Record<string, string> = {};
  
  // Deduplicate user IDs to avoid unnecessary calls
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  
  for (const id of uniqueIds) {
    try {
      const { data } = await adminClient.auth.admin.getUserById(id);
      if (data?.user?.email) {
        result[id] = data.user.email;
      }
    } catch (e) {
      console.error(`Failed to fetch email for user ${id}`, e);
    }
  }
  
  return result;
}
