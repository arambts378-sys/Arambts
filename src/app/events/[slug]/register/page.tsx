import React from 'react';
import PublicRegistrationClient from '@/components/event/PublicRegistrationClient';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function PublicRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const supabase = createAdminClient();
  
  // 1. Fetch the event either by slug or id
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (eventError || !event) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-outline-variant/40 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold text-on-surface mb-2">Registration Unavailable</h1>
          <p className="text-body-md text-on-surface-variant mb-8">Event not found.</p>
          <Link href="/app" className="px-6 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch the registration settings
  const { data: settings } = await supabase
    .from('event_registration_settings')
    .select('*')
    .eq('event_id', event.id)
    .maybeSingle();
  // 3. Fetch Walkathon distances if applicable
  let walkathonDistances: any[] = [];
  if (event.type === 'Walkathon') {
    const { data: distances } = await supabase
      .from('walkathon_distance_categories')
      .select('*')
      .eq('event_id', event.id)
      .eq('is_active', true)
      .order('distance_km', { ascending: true });
      
    if (distances) {
      walkathonDistances = distances;
    }
  }

  return (
    <PublicRegistrationClient 
      event={event} 
      settings={settings} 
      slug={slug} 
      walkathonDistances={walkathonDistances} 
      isWalkathon={event?.type === 'Walkathon'}
    />
  );
}
