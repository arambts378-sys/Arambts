"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';

export default function EventWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();

  if (!isHydrated) return <div className="p-10 text-center text-on-surface-variant">Loading workspace...</div>;

  const event = getEvent(eventId);

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">event_busy</span>
        <h1 className="text-headline-md font-bold text-on-surface mb-2">Event Not Found</h1>
        <p className="text-body-md text-on-surface-variant mb-6">The event you are looking for does not exist or has been deleted.</p>
        <button onClick={() => router.push('/app')} className="px-5 py-2.5 bg-primary text-white rounded font-medium shadow">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      <header className="h-14 border-b border-outline-variant/60 flex items-center px-6 gap-4 sticky top-0 bg-surface-container-lowest z-10">
        <button onClick={() => router.push('/app')} className="text-on-surface-variant hover:text-on-surface p-1">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <h1 className="text-label-md font-bold text-on-surface leading-tight">{event.name}</h1>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span>{event.startDate}</span>
            <span>•</span>
            <span>{event.format}</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-8 flex flex-col gap-8">
        
        <section className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider bg-surface-container-highest text-on-surface-variant mb-3 uppercase">
                {event.status}
              </div>
              <h2 className="text-headline-lg font-bold text-on-surface mb-1">{event.name}</h2>
              <p className="text-body-md text-on-surface-variant">{event.description || 'No description provided.'}</p>
            </div>
            
            <Link href={`/events/${event.slug}`} target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-variant text-sm font-medium transition-colors">
              <span className="material-symbols-outlined text-lg text-primary">open_in_new</span>
              View Public Site
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-outline-variant/40">
            <div>
              <div className="text-xs text-on-surface-variant mb-1">Date & Time</div>
              <div className="font-medium text-sm text-on-surface">{event.startDate}</div>
              <div className="text-sm text-on-surface-variant">{event.startTime} - {event.endTime}</div>
            </div>
            <div>
              <div className="text-xs text-on-surface-variant mb-1">Format & Location</div>
              <div className="font-medium text-sm text-on-surface">{event.format}</div>
              <div className="text-sm text-on-surface-variant">{event.location || 'Online'}</div>
            </div>
            <div>
              <div className="text-xs text-on-surface-variant mb-1">Type</div>
              <div className="font-medium text-sm text-on-surface">{event.type}</div>
            </div>
            <div>
              <div className="text-xs text-on-surface-variant mb-1">Timezone</div>
              <div className="font-medium text-sm text-on-surface">{event.timezone || 'Not specified'}</div>
            </div>
          </div>
        </section>

        <h3 className="text-label-lg font-bold text-on-surface border-b border-outline-variant/40 pb-2">Modules</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <Link href={`/app/events/${event.id}/website/editor`} className="group p-5 bg-white border border-outline-variant rounded-xl hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined">web</span>
            </div>
            <div>
              <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">Website Builder</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Design and publish your event landing page and sections.</p>
            </div>
          </Link>

          <Link href={`/app/events/${event.id}/registration`} className="group p-5 bg-white border border-outline-variant rounded-xl hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
            <div>
              <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">Registration</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Manage ticketing, forms, and attendee data.</p>
            </div>
          </Link>

          <Link href={`/app/events/${event.id}/people`} className="group p-5 bg-white border border-outline-variant rounded-xl hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">People & Roles</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Manage attendees, staff, and team permissions.</p>
            </div>
          </Link>

          <Link href={`/app/events/${event.id}/speakers`} className="group p-5 bg-white border border-outline-variant rounded-xl hover:border-primary/40 hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined">record_voice_over</span>
            </div>
            <div>
              <h4 className="text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">Speakers</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Manage event presenters and public speaker profiles.</p>
            </div>
          </Link>

        </div>

      </main>
    </div>
  );
}
