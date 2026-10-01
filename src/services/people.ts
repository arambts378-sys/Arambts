import { createClient } from '@/lib/supabase/client';
import { Person, EventPerson, EventPersonType, EventPersonStatus } from '@/types';

export const peopleService = {
  /**
   * Get all people for a specific event
   */
  getEventPeople: async (eventId: string): Promise<EventPerson[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_people')
      .select(`
        *,
        person:people(*)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map DB snake_case back to domain camelCase? The types we defined are snake_case for simplicity.
    return data as EventPerson[];
  },

  /**
   * Get a specific person
   */
  getPerson: async (personId: string): Promise<Person> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single();

    if (error) throw error;
    return data as Person;
  },

  /**
   * Add a person to an event, creating the person if they don't exist in the workspace
   */
  addPersonToEvent: async (
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
    personType: EventPersonType
  ): Promise<EventPerson> => {
    const supabase = createClient();
    
    // 1. Normalize email
    const normalizedEmail = personData.email.toLowerCase().trim();

    // 2. Check if person exists in the workspace
    let personId: string;
    
    const { data: existingPerson } = await supabase
      .from('people')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', normalizedEmail)
      .single();

    if (existingPerson) {
      personId = existingPerson.id;
      
      // Update existing person details if they changed?
      // For now we just link them. If we want to update, we can do a quick update here.
      await supabase
        .from('people')
        .update({
          first_name: personData.first_name,
          last_name: personData.last_name || null,
          phone: personData.phone || null,
          organization: personData.organization || null,
          job_title: personData.job_title || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', personId);
    } else {
      // Create new person
      const { data: newPerson, error: createError } = await supabase
        .from('people')
        .insert({
          workspace_id: workspaceId,
          first_name: personData.first_name,
          last_name: personData.last_name || null,
          email: normalizedEmail,
          phone: personData.phone || null,
          organization: personData.organization || null,
          job_title: personData.job_title || null,
        })
        .select('id')
        .single();
        
      if (createError) throw createError;
      personId = newPerson.id;
    }

    // 3. Link to event
    // Using ON CONFLICT is tricky here without specifying constraint in supabase js,
    // so we handle unique constraint errors gracefully or just try inserting.
    const { data: existingEventPerson } = await supabase
      .from('event_people')
      .select('*')
      .eq('event_id', eventId)
      .eq('person_id', personId)
      .eq('person_type', personType)
      .single();

    if (existingEventPerson) {
      // If already linked, just return it joined with person
      const { data } = await supabase
        .from('event_people')
        .select(`*, person:people(*)`)
        .eq('id', existingEventPerson.id)
        .single();
      return data as EventPerson;
    }

    const { data: newEventPerson, error: linkError } = await supabase
      .from('event_people')
      .insert({
        event_id: eventId,
        person_id: personId,
        person_type: personType,
        status: 'active'
      })
      .select(`*, person:people(*)`)
      .single();

    if (linkError) throw linkError;
    return newEventPerson as EventPerson;
  },

  /**
   * Update a person's core details
   */
  updatePerson: async (
    personId: string,
    updates: Partial<Person>
  ): Promise<Person> => {
    const supabase = createClient();
    
    // ensure email is normalized if it's being updated
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
    }
    
    // remove joined/readonly data from updates if present
    const cleanUpdates = { ...updates };
    delete cleanUpdates.id;
    delete cleanUpdates.workspace_id;
    delete cleanUpdates.created_at;
    
    cleanUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('people')
      .update(cleanUpdates)
      .eq('id', personId)
      .select()
      .single();

    if (error) throw error;
    return data as Person;
  },

  /**
   * Update event person status (activate/deactivate)
   */
  updateEventPersonStatus: async (
    eventPersonId: string,
    status: EventPersonStatus
  ): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from('event_people')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', eventPersonId);

    if (error) throw error;
  }
};
