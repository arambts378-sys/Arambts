"use client";

import React, { useState, useEffect } from 'react';
import { EventPerson, EventSpeakerProfile, Person } from '@/types';

interface SpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: any, speakerData: any) => Promise<void>;
  initialData?: EventPerson | null;
  mode: 'add' | 'edit';
}

export default function SpeakerModal({ isOpen, onClose, onSave, initialData, mode }: SpeakerModalProps) {
  const [personData, setPersonData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    job_title: ''
  });

  const [speakerData, setSpeakerData] = useState({
    headline: '',
    bio: '',
    website_url: '',
    twitter_url: '',
    linkedin_url: '',
    is_featured: false,
    display_order: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setPersonData({
          first_name: initialData.person?.first_name || '',
          last_name: initialData.person?.last_name || '',
          email: initialData.person?.email || '',
          phone: initialData.person?.phone || '',
          organization: initialData.person?.organization || '',
          job_title: initialData.person?.job_title || ''
        });
        
        setSpeakerData({
          headline: initialData.speaker_profile?.headline || '',
          bio: initialData.speaker_profile?.bio || '',
          website_url: initialData.speaker_profile?.website_url || '',
          twitter_url: initialData.speaker_profile?.twitter_url || '',
          linkedin_url: initialData.speaker_profile?.linkedin_url || '',
          is_featured: initialData.speaker_profile?.is_featured || false,
          display_order: initialData.speaker_profile?.display_order || 0
        });
      } else {
        setPersonData({
          first_name: '', last_name: '', email: '', phone: '', organization: '', job_title: ''
        });
        setSpeakerData({
          headline: '', bio: '', website_url: '', twitter_url: '', linkedin_url: '', is_featured: false, display_order: 0
        });
      }
      setError(null);
    }
  }, [isOpen, initialData, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!personData.first_name.trim() || !personData.email.trim() || !speakerData.headline.trim()) {
      setError('First name, email, and headline are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(personData, speakerData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save speaker. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <div>
            <h2 className="text-title-lg font-bold text-on-surface">
              {mode === 'add' ? 'Add Speaker' : 'Edit Speaker'}
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Speakers are core participants with public profiles.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl text-body-md border border-error/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-error mt-0.5 text-lg">error</span>
              <p>{error}</p>
            </div>
          )}

          <form id="speaker-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            
            {/* Section 1: Person Identity */}
            <section>
              <h3 className="text-label-lg font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">person</span>
                Personal Identity
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">First Name *</label>
                  <input 
                    type="text" 
                    value={personData.first_name}
                    onChange={(e) => setPersonData({...personData, first_name: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="Jane"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Last Name</label>
                  <input 
                    type="text" 
                    value={personData.last_name}
                    onChange={(e) => setPersonData({...personData, last_name: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Email Address *</label>
                  <input 
                    type="email" 
                    value={personData.email}
                    onChange={(e) => setPersonData({...personData, email: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md disabled:bg-surface-container-low disabled:text-on-surface-variant"
                    placeholder="jane@example.com"
                    required
                    disabled={mode === 'edit'} // Email is bound to workspace identity
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Phone Number</label>
                  <input 
                    type="tel" 
                    value={personData.phone}
                    onChange={(e) => setPersonData({...personData, phone: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Organization</label>
                  <input 
                    type="text" 
                    value={personData.organization}
                    onChange={(e) => setPersonData({...personData, organization: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="Company Name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Job Title</label>
                  <input 
                    type="text" 
                    value={personData.job_title}
                    onChange={(e) => setPersonData({...personData, job_title: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="Chief Executive Officer"
                  />
                </div>
              </div>
            </section>

            <hr className="border-outline-variant/40" />

            {/* Section 2: Speaker Profile */}
            <section>
              <h3 className="text-label-lg font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
                Speaker Profile
              </h3>

              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-label-sm font-medium text-on-surface-variant">Headline *</label>
                <input 
                  type="text" 
                  value={speakerData.headline}
                  onChange={(e) => setSpeakerData({...speakerData, headline: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                  placeholder="e.g. AI Researcher & Tech Visionary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-label-sm font-medium text-on-surface-variant">Biography</label>
                <textarea 
                  value={speakerData.bio}
                  onChange={(e) => setSpeakerData({...speakerData, bio: e.target.value})}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md min-h-[120px] resize-y"
                  placeholder="Brief biography for the public event website..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={speakerData.linkedin_url}
                    onChange={(e) => setSpeakerData({...speakerData, linkedin_url: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Twitter / X URL</label>
                  <input 
                    type="url" 
                    value={speakerData.twitter_url}
                    onChange={(e) => setSpeakerData({...speakerData, twitter_url: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-sm font-medium text-on-surface-variant">Website URL</label>
                  <input 
                    type="url" 
                    value={speakerData.website_url}
                    onChange={(e) => setSpeakerData({...speakerData, website_url: e.target.value})}
                    className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant/40">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${speakerData.is_featured ? 'bg-primary' : 'bg-surface-variant'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={speakerData.is_featured}
                      onChange={(e) => setSpeakerData({...speakerData, is_featured: e.target.checked})}
                    />
                    <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${speakerData.is_featured ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </div>
                  <div>
                    <div className="text-label-md font-bold text-on-surface">Featured Speaker</div>
                    <div className="text-body-sm text-on-surface-variant">Highlight this speaker on the event website</div>
                  </div>
                </label>
              </div>

            </section>

          </form>
        </div>

        <div className="p-6 border-t border-outline-variant/40 bg-surface-container/30 flex justify-end gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-label-md font-bold text-on-surface hover:bg-surface-container-highest rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="speaker-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-primary text-white text-label-md font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Saving...
              </>
            ) : (mode === 'add' ? 'Add Speaker' : 'Save Changes')}
          </button>
        </div>

      </div>
    </div>
  );
}
