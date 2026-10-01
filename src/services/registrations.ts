import { createClient } from '@/lib/supabase/client';
import { Registration, EventRegistrationSettings } from '@/types';

export const registrationsService = {
  /**
   * Get registration settings for an event
   */
  getEventRegistrationSettings: async (eventId: string): Promise<EventRegistrationSettings | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_registration_settings')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) throw error;
    return data as EventRegistrationSettings | null;
  },

  /**
   * Update or initialize registration settings for an event
   */
  updateEventRegistrationSettings: async (
    eventId: string,
    updates: Partial<EventRegistrationSettings>
  ): Promise<EventRegistrationSettings> => {
    const supabase = createClient();
    
    const cleanUpdates = { ...updates };
    delete cleanUpdates.event_id;
    delete cleanUpdates.created_at;
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('event_registration_settings')
      .upsert({
        event_id: eventId,
        ...cleanUpdates
      }, { onConflict: 'event_id' })
      .select('*')
      .single();

    if (error) throw error;
    return data as EventRegistrationSettings;
  },

  /**
   * Get all registrations for an event (Organizer)
   */
  getEventRegistrations: async (eventId: string): Promise<Registration[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        person:people(*)
      `)
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data as Registration[];
  },

  /**
   * Get a single registration
   */
  getRegistration: async (registrationId: string): Promise<Registration> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('registrations')
      .select(`*, person:people(*)`)
      .eq('id', registrationId)
      .single();

    if (error) throw error;
    return data as Registration;
  },

  /**
   * Cancel a registration (Organizer)
   */
  cancelRegistration: async (registrationId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('registrations')
      .update({
        status: 'cancelled',
        confirmation_status: 'failed',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId);

    if (error) throw error;
  },

  /**
   * Public Registration Submission via RPC
   */
  submitPublicRegistration: async (
    eventId: string,
    personData: {
      first_name: string;
      last_name?: string;
      email: string;
      phone?: string;
      organization?: string;
      job_title?: string;
    }
  ): Promise<{ success: boolean; registration_id: string; registration_number: string }> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('submit_event_registration', {
      p_event_id: eventId,
      p_person_data: personData
    });

    if (error) {
      throw new Error(error.message || 'Registration failed');
    }

    return data as { success: boolean; registration_id: string; registration_number: string };
  }
};
