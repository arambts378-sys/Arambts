"use client";

import React from 'react';
import Header from "@/components/event/Header";
import Hero from "@/components/event/Hero";
import EventInfo from "@/components/event/EventInfo";
import About from "@/components/event/About";
import Speakers from "@/components/event/Speakers";
import Agenda from "@/components/event/Agenda";
import Registration from "@/components/event/Registration";
import Venue from "@/components/event/Venue";
import Sponsors from "@/components/event/Sponsors";
import Exhibitors from "@/components/event/Exhibitors";
import Contact from "@/components/event/Contact";
import FinalCTA from "@/components/event/FinalCTA";
import Footer from "@/components/event/Footer";
import { useAppContext } from "@/context/AppContext";
import { useParams } from 'next/navigation';

export default function EventPublicPage() {
  const routeParams = useParams();
  const slug = routeParams?.slug as string;
  const { events, isHydrated } = useAppContext();

  if (!isHydrated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Find the event by slug
  const appEvent = events.find((e) => e.slug === slug);

  if (!appEvent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
        <p className="text-gray-600 mb-8">The event you are looking for does not exist.</p>
        <a href="/app" className="px-6 py-3 bg-[#7A1F3D] text-white rounded-lg">Return to Dashboard</a>
      </div>
    );
  }

  if (appEvent.website?.status !== 'published' || !appEvent.website?.published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Website Not Published Yet</h1>
        <p className="text-gray-600 mb-8">This event website is not published yet.</p>
      </div>
    );
  }

  const publishedWebsite = appEvent.website.published;

  // We map the true event data, and initialize lists as empty arrays
  // since the actual sub-modules (Speakers, Agenda) are not built yet.
  const mappedEventData = {
    id: appEvent.id,
    name: appEvent.name,
    type: appEvent.type,
    format: appEvent.format,
    date: `${appEvent.startDate} - ${appEvent.endDate || appEvent.startDate}`,
    time: `${appEvent.startTime} - ${appEvent.endTime}`,
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

  const visibleSections = publishedWebsite.sections
    ?.filter(s => s.visible)
    ?.sort((a, b) => a.order - b.order) || [];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'about': return <About key={sectionId} event={mappedEventData} />;
      case 'speakers': return <Speakers key={sectionId} event={mappedEventData} />;
      case 'agenda': return <Agenda key={sectionId} event={mappedEventData} />;
      case 'register': return <Registration key={sectionId} event={mappedEventData} />;
      case 'venue': return <Venue key={sectionId} event={mappedEventData} />;
      case 'sponsors': return <Sponsors key={sectionId} event={mappedEventData} />;
      case 'contact': return <Contact key={sectionId} event={mappedEventData} />;
      default: return null;
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col min-h-screen">
        <Hero event={mappedEventData} />
        <EventInfo event={mappedEventData} />
        
        {visibleSections.map(section => renderSection(section.id))}

        <Exhibitors event={mappedEventData} />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
