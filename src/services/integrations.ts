import { createClient } from '@/lib/supabase/client';

export type IntegrationProvider = 'google_sheets' | 'email' | 'whatsapp' | 'crm' | 'analytics';

export interface EventIntegration {
  id: string;
  event_id: string;
  provider: IntegrationProvider;
  is_active: boolean;
  config: any;
  created_at: string;
  updated_at: string;
}

export const integrationsService = {
  /**
   * Get all integrations for an event
   */
  getEventIntegrations: async (eventId: string): Promise<EventIntegration[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_integrations')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data as EventIntegration[];
  },

  /**
   * Update or create an integration configuration
   */
  saveIntegration: async (
    eventId: string,
    provider: IntegrationProvider,
    config: any,
    isActive: boolean
  ): Promise<EventIntegration> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_integrations')
      .upsert({
        event_id: eventId,
        provider,
        config,
        is_active: isActive
      }, { onConflict: 'event_id,provider' })
      .select('*')
      .single();

    if (error) throw error;
    return data as EventIntegration;
  },

  /**
   * Trigger the asynchronous job processor
   * This is a fire-and-forget wake-up ping. It does not carry registration data,
   * because the jobs are already safely queued in the database.
   */
  triggerJobProcessor: async (): Promise<void> => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await fetch(`${appUrl}/api/integrations/process`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to trigger job processor:', err);
      // We don't throw here to avoid blocking the registration success UI
    }
  }
};
