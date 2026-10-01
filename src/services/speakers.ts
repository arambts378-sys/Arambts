import { createClient } from '@/lib/supabase/client';
import { EventPerson, EventSpeakerProfile, Person } from '@/types';
import { peopleService } from './people';

export const speakersService = {
  /**
   * Get all speakers for a specific event
   */
  getEventSpeakers: async (eventId: string): Promise<EventPerson[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_people')
      .select(`
        *,
        person:people(*),
        speaker_profile:event_speakers(*)
      `)
      .eq('event_id', eventId)
      .eq('person_type', 'speaker')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Sort manually by display_order ASC, then created_at ASC as requested
    const speakers = data as EventPerson[];
    speakers.sort((a, b) => {
      const orderA = a.speaker_profile?.display_order || 0;
      const orderB = b.speaker_profile?.display_order || 0;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return speakers;
  },

  /**
   * Add a speaker to an event
   */
  addSpeakerToEvent: async (
    workspaceId: string,
    eventId: string,
    personData: {
      first_name: string;
      last_name?: string;
      email: string;
      phone?: string;
      organization?: string;
      job_title?: string;
    },
    speakerData: {
      headline?: string;
      bio?: string;
      website_url?: string;
      twitter_url?: string;
      linkedin_url?: string;
      is_featured?: boolean;
    }
  ): Promise<EventPerson> => {
    // 1. Reuse peopleService to handle identity and event_people link
    const eventPerson = await peopleService.addPersonToEvent(
      workspaceId,
      eventId,
      personData,
      'speaker'
    );

    // 2. Upsert the event_speakers metadata
    const supabase = createClient();
    const { data: speakerProfile, error: profileError } = await supabase
      .from('event_speakers')
      .upsert({
        event_person_id: eventPerson.id,
        headline: speakerData.headline || null,
        bio: speakerData.bio || null,
        website_url: speakerData.website_url || null,
        twitter_url: speakerData.twitter_url || null,
        linkedin_url: speakerData.linkedin_url || null,
        is_featured: speakerData.is_featured || false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'event_person_id' })
      .select('*')
      .single();

    if (profileError) throw profileError;

    // Attach speaker profile to the result
    return {
      ...eventPerson,
      speaker_profile: speakerProfile as EventSpeakerProfile
    };
  },

  /**
   * Update a speaker's profile
   */
  updateSpeakerProfile: async (
    eventPersonId: string,
    personId: string,
    personUpdates: Partial<Person>,
    speakerUpdates: Partial<EventSpeakerProfile>
  ): Promise<void> => {
    // 1. Update core person fields if provided
    if (Object.keys(personUpdates).length > 0) {
      await peopleService.updatePerson(personId, personUpdates);
    }

    // 2. Update speaker-specific fields
    if (Object.keys(speakerUpdates).length > 0) {
      const supabase = createClient();
      
      const cleanUpdates = { ...speakerUpdates };
      delete cleanUpdates.event_person_id;
      delete cleanUpdates.created_at;
      cleanUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('event_speakers')
        .update(cleanUpdates)
        .eq('event_person_id', eventPersonId);

      if (error) throw error;
    }
  },

  /**
   * Remove/Deactivate a speaker
   */
  removeSpeaker: async (eventPersonId: string): Promise<void> => {
    // As instructed, we just deactivate the relationship so they lose access
    // and are hidden from active lists, rather than deleting the person.
    await peopleService.updateEventPersonStatus(eventPersonId, 'inactive');
  }
};
