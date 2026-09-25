"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { registrationsService } from '@/services/registrations';
import { EventRegistrationSettings } from '@/types';
import Link from 'next/link';

export default function PublicRegistrationPage() {
  const router = useRouter();
  const routeParams = useParams();
  const slug = routeParams?.slug as string;
  const { events, isHydrated } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [settings, setSettings] = useState<EventRegistrationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ registration_number: string } | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    
    const targetEvent = events.find(e => e.slug === slug);
    if (!targetEvent) {
      setError("Event not found");
      setLoading(false);
      return;
    }
    
    setEvent(targetEvent);

    const loadSettings = async () => {
      try {
        const sets = await registrationsService.getEventRegistrationSettings(targetEvent.id);
        if (!sets || !sets.is_enabled) {
          setError("Registration is currently closed for this event.");
        } else {
          setSettings(sets);
        }
      } catch (err: any) {
        console.error("Failed to load registration settings:", err);
        setError("Unable to initialize registration. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [isHydrated, slug, events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await registrationsService.submitPublicRegistration(event.id, formData);
      setSuccessData({ registration_number: result.registration_number });
    } catch (err: any) {
      setError(err.message || "An error occurred during registration. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="text-on-surface-variant flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
          <span>Loading Registration...</span>
        </div>
      </div>
    );
  }

  if (error && !successData) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-outline-variant/40 text-center shadow-sm">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">event_busy</span>
          <h1 className="text-title-lg font-bold text-on-surface mb-2">Registration Unavailable</h1>
          <p className="text-body-md text-on-surface-variant mb-8">{error}</p>
          <Link href={`/events/${slug}`} className="px-6 py-2.5 bg-surface-container-highest text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors">
            Return to Event Page
          </Link>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-surface-container-lowest to-surface-container-lowest">
        <div className="max-w-xl w-full bg-white p-10 rounded-3xl border border-outline-variant/40 shadow-xl relative overflow-hidden">
          {/* Confetti decoration abstract */}
          <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
          
          <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl font-bold">check</span>
          </div>
          
          <div className="text-center">
            <h1 className="text-headline-sm font-black text-on-surface mb-2">REGISTRATION CONFIRMED</h1>
            <p className="text-body-lg text-on-surface-variant mb-8">
              Your registration has been successfully completed.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 mb-8 border border-outline-variant/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Attendee</div>
                <div className="text-body-lg font-medium text-on-surface">{formData.first_name} {formData.last_name}</div>
              </div>
              <div>
                <div className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Event</div>
                <div className="text-body-lg font-medium text-on-surface">{event?.name}</div>
              </div>
              <div>
                <div className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Registration #</div>
                <div className="text-body-lg font-mono font-bold text-primary">{successData.registration_number}</div>
              </div>
              <div>
                <div className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Date</div>
                <div className="text-body-lg font-medium text-on-surface">{event?.startDate}</div>
              </div>
            </div>
          </div>

          {settings?.confirmation_message && (
            <div className="mb-8 p-4 bg-primary-container/30 text-on-primary-container rounded-xl text-body-md border border-primary/20">
              {settings.confirmation_message}
            </div>
          )}

          <div className="text-center p-5 border border-dashed border-outline-variant rounded-xl bg-surface-container-lowest">
            <span className="material-symbols-outlined text-on-surface-variant mb-2">qr_code</span>
            <p className="text-body-md text-on-surface font-medium">Your event access credential will be provided separately.</p>
          </div>

          <div className="mt-8 text-center">
            <Link href={`/events/${slug}`} className="text-primary font-bold hover:underline">
              Return to Event Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Mini header */}
      <header className="h-16 border-b border-outline-variant/60 bg-white flex items-center justify-center px-6">
        <Link href={`/events/${slug}`} className="font-bold text-title-lg text-primary">
          {event?.name}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-outline-variant/50 shadow-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Form Side */}
          <div className="w-full p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-headline-sm font-bold text-on-surface mb-2">
                {settings?.title || 'Register for Event'}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                {settings?.description || 'Please fill out the form below to secure your spot.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-start gap-3">
                <span className="material-symbols-outlined text-error mt-0.5">error</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface-variant">Email Address *</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-sm font-bold text-on-surface-variant">Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">Organization (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.organization}
                    onChange={e => setFormData({...formData, organization: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-bold text-on-surface-variant">Job Title (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.job_title}
                    onChange={e => setFormData({...formData, job_title: e.target.value})}
                    className="px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full py-4 bg-primary text-white font-bold text-label-lg rounded-xl hover:bg-primary/90 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
