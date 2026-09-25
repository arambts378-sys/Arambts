"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { speakersService } from '@/services/speakers';
import { EventPerson } from '@/types';
import SpeakerModal from '@/components/speakers/SpeakerModal';

export default function SpeakersPage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, activeWorkspace, isHydrated } = useAppContext();

  const [speakers, setSpeakers] = useState<EventPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedSpeaker, setSelectedSpeaker] = useState<EventPerson | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');

  const event = getEvent(eventId);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await speakersService.getEventSpeakers(eventId);
      setSpeakers(data);
    } catch (err: any) {
      console.error(err);
      setError('Unable to load speakers. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchSpeakers();
    }
  }, [isHydrated, eventId]);

  const handleSaveSpeaker = async (personData: any, speakerData: any) => {
    if (!activeWorkspace) throw new Error("No active workspace");

    if (modalMode === 'add') {
      await speakersService.addSpeakerToEvent(
        activeWorkspace.id,
        eventId,
        personData,
        speakerData
      );
    } else if (modalMode === 'edit' && selectedSpeaker?.person?.id) {
      await speakersService.updateSpeakerProfile(
        selectedSpeaker.id,
        selectedSpeaker.person.id,
        personData,
        speakerData
      );
    }
    
    await fetchSpeakers();
  };

  const handleToggleStatus = async (speaker: EventPerson) => {
    const newStatus = speaker.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive') {
      if (!confirm(`Are you sure you want to remove ${speaker.person?.first_name} as a speaker? Their underlying person record will be kept.`)) {
        return;
      }
    }
    
    try {
      await speakersService.removeSpeaker(speaker.id); 
      // Wait, removeSpeaker in my service sets it to 'inactive'
      // To activate, we should ideally use peopleService directly but wait, we need it. 
      // I'll call updateEventPersonStatus directly if needed, or if remove is just for deactivation, we might need a reactivate.
      // Let's import peopleService here for the toggle back.
      const { peopleService } = await import('@/services/people');
      await peopleService.updateEventPersonStatus(speaker.id, newStatus);
      await fetchSpeakers();
    } catch (err) {
      alert("Failed to update status. Check permissions.");
    }
  };

  // Derived state
  const filteredSpeakers = useMemo(() => {
    return speakers.filter(p => {
      // Status Filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      
      // Featured Filter
      if (featuredFilter === 'featured' && !p.speaker_profile?.is_featured) return false;
      if (featuredFilter === 'standard' && p.speaker_profile?.is_featured) return false;
      
      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const first = p.person?.first_name?.toLowerCase() || '';
        const last = p.person?.last_name?.toLowerCase() || '';
        const email = p.person?.email?.toLowerCase() || '';
        const org = p.person?.organization?.toLowerCase() || '';
        const headline = p.speaker_profile?.headline?.toLowerCase() || '';
        
        if (!first.includes(query) && !last.includes(query) && !email.includes(query) && !org.includes(query) && !headline.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [speakers, searchQuery, statusFilter, featuredFilter]);

  const metrics = useMemo(() => {
    const total = speakers.length;
    const active = speakers.filter(s => s.status === 'active').length;
    const featured = speakers.filter(s => s.status === 'active' && s.speaker_profile?.is_featured).length;
    return { total, active, featured };
  }, [speakers]);

  if (!isHydrated || !event) {
    return <div className="p-10 text-center text-on-surface-variant">Loading workspace...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-lowest">
      {/* Header */}
      <header className="h-14 border-b border-outline-variant/60 flex items-center px-6 gap-4 sticky top-0 bg-surface-container-lowest z-10">
        <button onClick={() => router.push(`/app/events/${eventId}`)} className="text-on-surface-variant hover:text-on-surface p-1">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div>
          <h1 className="text-label-md font-bold text-on-surface leading-tight">SPEAKERS</h1>
          <div className="text-xs text-on-surface-variant">Manage presenters for {event.name}</div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full p-8 flex flex-col gap-8">
        
        {/* Top Actions & Metrics */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex gap-10">
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Total Speakers</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.total}</div>
            </div>
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Active</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.active}</div>
            </div>
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Featured</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.featured}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setModalMode('add');
                setSelectedSpeaker(null);
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 shadow transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Speaker
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search speakers..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-body-md"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={featuredFilter}
              onChange={e => setFeaturedFilter(e.target.value as any)}
              className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded text-body-sm font-medium focus:outline-none"
            >
              <option value="all">All Profiles</option>
              <option value="featured">Featured Only</option>
              <option value="standard">Standard Only</option>
            </select>
            
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded text-body-sm font-medium focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-4xl mb-4">progress_activity</span>
            <p>Loading speakers...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-error-container text-on-error-container rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <p>{error}</p>
            </div>
            <button onClick={fetchSpeakers} className="px-4 py-2 bg-surface-container-lowest text-on-surface font-medium rounded text-sm hover:bg-surface-container-highest">
              Retry
            </button>
          </div>
        ) : filteredSpeakers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest/50">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-3xl">record_voice_over</span>
            </div>
            {speakers.length === 0 ? (
              <>
                <h3 className="text-title-lg font-bold text-on-surface mb-2">Your event doesn't have any speakers yet.</h3>
                <p className="text-body-md text-on-surface-variant mb-6 max-w-md mx-auto">
                  Add speakers to build your event program and populate the public speaker lineup.
                </p>
                <button 
                  onClick={() => { setModalMode('add'); setSelectedSpeaker(null); setIsModalOpen(true); }}
                  className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 transition-colors"
                >
                  + Add Speaker
                </button>
              </>
            ) : (
              <>
                <h3 className="text-title-lg font-bold text-on-surface mb-2">No speakers match your search.</h3>
                <p className="text-body-md text-on-surface-variant">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setFeaturedFilter('all'); setStatusFilter('all'); }}
                  className="mt-4 px-4 py-2 text-primary text-label-md font-bold hover:bg-primary/5 rounded transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSpeakers.map(p => (
              <div 
                key={p.id} 
                className={`bg-white border border-outline-variant/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group ${p.status === 'inactive' ? 'opacity-60' : ''}`}
              >
                {/* Status Badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {p.speaker_profile?.is_featured && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                  {p.status === 'inactive' && (
                    <span className="bg-surface-variant text-on-surface-variant text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center text-center mt-2">
                  <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-title-lg font-bold mb-4 shadow-inner">
                    {p.person?.first_name?.charAt(0)}{p.person?.last_name?.charAt(0)}
                  </div>
                  <h3 className="text-title-md font-bold text-on-surface line-clamp-1">
                    {p.person?.first_name} {p.person?.last_name}
                  </h3>
                  <div className="text-body-md text-primary font-medium mt-1 line-clamp-2 min-h-[40px]">
                    {p.speaker_profile?.headline || 'Speaker'}
                  </div>
                  
                  {(p.person?.job_title || p.person?.organization) && (
                    <div className="text-body-sm text-on-surface-variant mt-2 line-clamp-1">
                      {p.person?.job_title} {p.person?.job_title && p.person?.organization && 'at'} {p.person?.organization}
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="flex items-center gap-3 mt-4 h-6">
                    {p.speaker_profile?.linkedin_url && (
                      <a href={p.speaker_profile.linkedin_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-[#0A66C2]">
                        <span className="material-symbols-outlined text-[18px]">link</span>
                      </a>
                    )}
                    {p.speaker_profile?.twitter_url && (
                      <a href={p.speaker_profile.twitter_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-black">
                        <span className="material-symbols-outlined text-[18px]">tag</span>
                      </a>
                    )}
                    {p.speaker_profile?.website_url && (
                      <a href={p.speaker_profile.website_url} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary">
                        <span className="material-symbols-outlined text-[18px]">language</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleToggleStatus(p)}
                    className={`text-label-sm font-bold ${p.status === 'active' ? 'text-error hover:bg-error/10' : 'text-green-600 hover:bg-green-600/10'} px-3 py-1.5 rounded transition-colors`}
                  >
                    {p.status === 'active' ? 'Remove' : 'Reactivate'}
                  </button>
                  
                  <button 
                    onClick={() => { setModalMode('edit'); setSelectedSpeaker(p); setIsModalOpen(true); }}
                    className="text-label-sm font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <SpeakerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSpeaker}
        initialData={selectedSpeaker}
        mode={modalMode}
      />
    </div>
  );
}
