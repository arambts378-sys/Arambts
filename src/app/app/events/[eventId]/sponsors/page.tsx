"use client";
import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function SponsorsPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();

  if (!isHydrated) return null;
  const event = getEvent(eventId);
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  return (
    <div className="min-h-screen bg-surface-container-lowest p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container py-1 px-3 rounded-full mb-4">
          <span className="font-semibold text-primary">{event.name}</span>
          <span>/</span>
          <span>Sponsors</span>
        </div>
        
        <h1 className="text-4xl font-bold text-primary">Sponsors</h1>
        <p className="text-on-surface-variant text-lg">Module Coming Soon</p>
        
        <div className="pt-8">
          <Link href={`/app/events/${eventId}`} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            Back to Event Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
