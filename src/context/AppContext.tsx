"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Event } from '../types';
import { createClient } from '@/lib/supabase/client';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

interface AppContextType {
  currentUser: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  events: Event[];
  isHydrated: boolean;
  createEvent: (event: Partial<Event>) => Promise<Event>;
  getEvent: (id: string) => Event | undefined;
  getEventBySlug: (slug: string) => Event | undefined;
  updateEvent: (event: Event) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  refreshContext: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const supabase = createClient();

  const refreshContext = async () => {
    try {
      // 1. Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCurrentUser(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setEvents([]);
        setIsHydrated(true);
        return;
      }

      // 2. Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.full_name,
          email: session.user.email || '',
        });
      }

      // 3. Fetch workspaces user is member of
      const { data: memberWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name, slug, owner_id)')
        .eq('user_id', session.user.id);

      if (memberWorkspaces && memberWorkspaces.length > 0) {
        // Map nested join results safely
        const userWorkspaces = memberWorkspaces
          .map((mw: any) => mw.workspaces)
          .filter(Boolean) as Workspace[];

        setWorkspaces(userWorkspaces);
        
        // Pick first workspace as active for now (could save preference later)
        const currentActive = userWorkspaces[0];
        setActiveWorkspace(currentActive);

        // 4. Fetch events for active workspace
        if (currentActive) {
          const { data: workspaceEvents } = await supabase
            .from('events')
            .select('*')
            .eq('workspace_id', currentActive.id)
            .order('created_at', { ascending: false });

          if (workspaceEvents) {
            // Map DB snake_case back to domain camelCase
            const mappedEvents = workspaceEvents.map(e => ({
              id: e.id,
              slug: e.slug,
              name: e.name,
              type: e.type,
              format: e.format,
              startDate: e.start_date,
              endDate: e.end_date,
              startTime: e.start_time,
              endTime: e.end_time,
              timezone: e.timezone,
              location: e.location,
              description: e.description,
              status: e.status,
              createdAt: e.created_at,
              flyer: e.flyer_url,
              website: e.website
            }));
            setEvents(mappedEvents as Event[]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load application context from Supabase', e);
    } finally {
      setIsHydrated(true);
    }
  };

  useEffect(() => {
    refreshContext();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshContext();
    });

    return () => subscription.unsubscribe();
  }, []);

  const createEvent = async (newEventData: Partial<Event>): Promise<Event> => {
    if (!activeWorkspace || !currentUser) throw new Error('Not authenticated or no active workspace');

    const { data, error } = await supabase
      .from('events')
      .insert([{
        workspace_id: activeWorkspace.id,
        created_by: currentUser.id,
        name: newEventData.name,
        slug: newEventData.slug,
        type: newEventData.type,
        format: newEventData.format,
        status: newEventData.status || 'draft',
        start_date: newEventData.startDate,
        end_date: newEventData.endDate,
        start_time: newEventData.startTime,
        end_time: newEventData.endTime,
        timezone: newEventData.timezone || 'UTC',
        location: newEventData.location,
        description: newEventData.description,
        flyer_url: newEventData.flyer,
        website: newEventData.website || {}
      }])
      .select()
      .single();

    if (error) throw error;

    const mappedCreatedEvent: Event = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      type: data.type,
      format: data.format,
      startDate: data.start_date,
      endDate: data.end_date,
      startTime: data.start_time,
      endTime: data.end_time,
      timezone: data.timezone,
      location: data.location,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
      flyer: data.flyer_url,
      website: data.website
    };

    setEvents(prev => [mappedCreatedEvent, ...prev]);
    return mappedCreatedEvent;
  };

  const getEvent = (id: string) => {
    return events.find(e => e.id === id);
  };

  const getEventBySlug = (slug: string) => {
    return events.find(e => e.slug === slug);
  };

  const updateEvent = async (updatedEvent: Event): Promise<Event> => {
    const { data, error } = await supabase
      .from('events')
      .update({
        name: updatedEvent.name,
        slug: updatedEvent.slug,
        type: updatedEvent.type,
        format: updatedEvent.format,
        status: updatedEvent.status,
        start_date: updatedEvent.startDate,
        end_date: updatedEvent.endDate,
        start_time: updatedEvent.startTime,
        end_time: updatedEvent.endTime,
        timezone: updatedEvent.timezone,
        location: updatedEvent.location,
        description: updatedEvent.description,
        flyer_url: updatedEvent.flyer,
        website: updatedEvent.website
      })
      .eq('id', updatedEvent.id)
      .select()
      .single();

    if (error) throw error;

    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    return updatedEvent;
  };

  const deleteEvent = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      workspaces,
      activeWorkspace,
      events,
      isHydrated,
      createEvent,
      getEvent,
      getEventBySlug,
      updateEvent,
      deleteEvent,
      refreshContext
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
