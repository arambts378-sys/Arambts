"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useParams } from 'next/navigation';
import { registrationsService } from '@/services/registrations';
import { EventRegistrationSettings } from '@/types';

export default function Registration({ event, section }: { event?: any; section?: any }) {
  const routeParams = useParams();
  const slug = routeParams?.slug as string;
  const content = section?.content || {};
  const [settings, setSettings] = useState<EventRegistrationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (event?.id) {
      registrationsService.getEventRegistrationSettings(event.id)
        .then(data => {
          setSettings(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [event?.id]);

  if (loading) {
    return <div className="py-24 text-center">Loading registration...</div>;
  }

  // Do not render section if registration is not enabled
  if (!settings || !settings.is_enabled) {
    return null;
  }

  return (
    <section id="registration" className="bg-brand-soft py-24 md:py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:space-x-12">
          
          <div className="max-w-2xl mb-12 lg:mb-0">
            <div className="inline-flex items-center space-x-2 mb-6">
              <span className="w-8 h-[1px] bg-brand-maroon"></span>
              <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                {content.heading || "Registration"}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-6">
              {content.title || settings.title || 'Reserve your place.'}
            </h2>
            <p className="text-xl text-brand-muted leading-relaxed whitespace-pre-line">
              {content.description || settings.description || 'Join leaders and decision-makers for two days of meaningful conversations and high-impact networking.'}
            </p>
          </div>

          <div className="w-full lg:w-[480px]">
            <div className="bg-brand-white p-8 md:p-12 border border-brand-border shadow-sm">
              <h3 className="text-2xl font-medium text-brand-dark mb-4">
                Conference Pass
              </h3>
              <p className="text-brand-muted mb-10">
                Access to keynote sessions, panels, networking and event activities.
              </p>
              
              <Link
                href={content.buttonUrl || `/events/${event?.slug || event?.id || slug}/register`}
                className="block w-full text-center px-8 py-4 text-lg font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-all duration-300 rounded-sm"
              >
                {content.buttonText || "Register Now"}
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
