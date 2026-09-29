import React from 'react';
import EventWebsiteRenderer from "@/components/event/EventWebsiteRenderer";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from 'next/link';

export default async function EventPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const supabase = createAdminClient();
  const { data: appEvent, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !appEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
        <p className="text-gray-600 mb-8">The event you are looking for does not exist.</p>
        <Link href="/app" className="px-6 py-3 bg-[#7A1F3D] text-white rounded-lg">Return to Dashboard</Link>
      </div>
    );
  }

  const websiteConfig = appEvent.website || {};

  if (websiteConfig.status !== 'published' || !websiteConfig.published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Website Not Published Yet</h1>
        <p className="text-gray-600 mb-8">This event website is not published yet.</p>
      </div>
    );
  }

  const publishedWebsite = websiteConfig.published;

  const mappedEventData = {
    id: appEvent.id,
    name: appEvent.name,
    type: appEvent.type,
    format: appEvent.format,
    date: `${appEvent.start_date || appEvent.startDate} - ${appEvent.end_date || appEvent.endDate || appEvent.start_date || appEvent.startDate}`,
    time: `${appEvent.start_time || appEvent.startTime} - ${appEvent.end_time || appEvent.endTime}`,
    venue: appEvent.location || "Online",
    location: appEvent.location || "Online",
    description: appEvent.description || "",
    speakers: [],
    agenda: [],
    sponsors: [],
    exhibitors: [],
    contact: {
      email: "contact@event.com",
      phone: "",
      location: appEvent.location || "Online",
    }
  };

  return (
    <EventWebsiteRenderer 
      event={mappedEventData} 
      websiteConfig={publishedWebsite} 
      mode="public" 
    />
  );
}
