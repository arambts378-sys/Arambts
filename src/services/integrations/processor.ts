import { jobQueue } from './jobQueue';
import { emailProvider } from './providers/email';
import { googleSheetsProvider } from './providers/googleSheets';
import { qrCredentialsService } from '@/services/qrCredentials';
import { createAdminClient } from '@/lib/supabase/admin';

export const processIntegrationJobs = async () => {
  const processorId = `proc_${Math.random().toString(36).substring(7)}`;
  const jobs = await jobQueue.claimJobs(10, processorId);

  return processJobs(jobs, processorId);
};

export const processRegistrationIntegrationJobs = async (registrationId: string) => {
  const processorId = `proc_reg_${Math.random().toString(36).substring(7)}`;
  // Claim only jobs for this registration
  const jobs = await jobQueue.claimJobsForRegistration(registrationId, processorId);

  return processJobs(jobs, processorId);
};

const processJobs = async (jobs: any[], processorId: string) => {
  if (!jobs || jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  // Group jobs by event to fetch configurations efficiently
  const supabase = createAdminClient();
  const eventIds = [...new Set(jobs.map((j: any) => j.event_id))];
  const eventsData = await supabase.from('events').select('*').in('id', eventIds);
  const events = eventsData.data || [];
  
  const integrationsData = await supabase.from('event_integrations').select('*').in('event_id', eventIds).eq('is_active', true);
  const integrations = integrationsData.data || [];

  for (const job of jobs) {
    try {
      const event = events.find(e => e.id === job.event_id);
      const integration = integrations.find(i => i.event_id === job.event_id && i.provider === job.provider);
      
      if (job.provider === 'qr' && job.event_type === 'qr_generation') {
        // Legacy qr_generation job. QR generation is now synchronous.
        // We do nothing and let it be marked as success to clear it from the queue.
      } else if (job.provider === 'email') {
        if (!integration) throw new Error(`Configuration missing for email integration`);
        
        if (job.event_type === 'qr_delivery') {
          await emailProvider.sendQrDelivery(job, event, integration.config);
        } else if (job.event_type === 'certificate_delivery') {
          await emailProvider.sendCertificateDelivery(job, event, integration.config);
        } else {
          await emailProvider.process(job, event, integration.config);
        }
      } else if (job.provider === 'google_sheets') {
        if (!integration) throw new Error(`Configuration missing for google_sheets integration`);
        await googleSheetsProvider.process(job, event, integration.config);
      } else {
        throw new Error(`Unknown provider: ${job.provider}`);
      }

      // Success
      await jobQueue.updateJobStatus(job.id, {
        status: 'success',
        attempts: job.attempts + 1,
        processed_at: new Date().toISOString(),
        last_error: null,
        locked_at: null,
        locked_by: null
      });
      succeeded++;

    } catch (err: any) {
      console.error(`Job ${job.id} failed:`, err);
      
      const nextAttempts = job.attempts + 1;
      const maxAttempts = job.max_attempts || 5;
      const status = nextAttempts >= maxAttempts ? 'failed' : 'pending';
      
      // Simple exponential backoff
      const delays = [0, 60, 300, 900, 3600]; // in seconds
      const delay = delays[Math.min(nextAttempts, delays.length - 1)];
      const nextAttemptAt = new Date(Date.now() + delay * 1000).toISOString();

      await jobQueue.updateJobStatus(job.id, {
        status,
        attempts: nextAttempts,
        last_error: err.message || 'Unknown error',
        next_attempt_at: nextAttemptAt,
        processed_at: status === 'failed' ? new Date().toISOString() : null,
        locked_at: null,
        locked_by: null
      });
      failed++;
    }
  }

  return { processed: jobs.length, succeeded, failed };
};
