import { createAdminClient } from '@/lib/supabase/admin';

// Use the Service Role Key for server-side operations to bypass RLS for internal queues

export const jobQueue = {
  claimJobs: async (limit: number, processorId: string) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('claim_integration_jobs', {
      p_limit: limit,
      p_processor_id: processorId
    });

    if (error) {
      console.error('Error claiming jobs:', error);
      return [];
    }

    return data || [];
  },

  updateJobStatus: async (jobId: string, updates: any) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('integration_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) {
      console.error(`Error updating job ${jobId}:`, error);
    }
  },

  getActiveIntegrationsForEvent: async (eventId: string) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('event_integrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true);
      
    if (error) throw error;
    return data || [];
  }
};
