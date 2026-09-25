"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { registrationsService } from '@/services/registrations';
import { Registration, EventRegistrationSettings } from '@/types';

export default function OrganizerRegistrationPage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<EventRegistrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings Form State
  const [formData, setFormData] = useState({
    is_enabled: false,
    title: '',
    description: '',
    capacity: '' as string | number,
    confirmation_message: ''
  });

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'failed'>('all');

  const event = getEvent(eventId);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [regs, sets] = await Promise.all([
        registrationsService.getEventRegistrations(eventId),
        registrationsService.getEventRegistrationSettings(eventId)
      ]);
      setRegistrations(regs);
      
      if (sets) {
        setSettings(sets);
        setFormData({
          is_enabled: sets.is_enabled,
          title: sets.title || '',
          description: sets.description || '',
          capacity: sets.capacity || '',
          confirmation_message: sets.confirmation_message || ''
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Unable to load registration data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchData();
    }
  }, [isHydrated, eventId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const cap = formData.capacity === '' ? null : parseInt(formData.capacity as string, 10);
      const updated = await registrationsService.updateEventRegistrationSettings(eventId, {
        is_enabled: formData.is_enabled,
        title: formData.title || null,
        description: formData.description || null,
        capacity: cap && cap >= 1 ? cap : null,
        confirmation_message: formData.confirmation_message || null
      });
      setSettings(updated);
      alert('Settings saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelRegistration = async (registration: Registration) => {
    if (confirm(`Are you sure you want to cancel the registration for ${registration.person?.first_name}? This cannot be undone.`)) {
      try {
        await registrationsService.cancelRegistration(registration.id);
        await fetchData();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel registration');
      }
    }
  };

  // Derived metrics
  const metrics = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'confirmed').length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    
    // Active includes pending + confirmed. For capacity logic we can use this.
    const active = confirmed + pending;
    let remaining: string | number = 'Unlimited';
    if (settings?.capacity) {
      remaining = Math.max(0, settings.capacity - active);
    }

    return { total, confirmed, pending, cancelled, remaining };
  }, [registrations, settings]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const first = r.person?.first_name?.toLowerCase() || '';
        const last = r.person?.last_name?.toLowerCase() || '';
        const email = r.person?.email?.toLowerCase() || '';
        const regNum = r.registration_number.toLowerCase();
        if (!first.includes(query) && !last.includes(query) && !email.includes(query) && !regNum.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [registrations, searchQuery, statusFilter]);

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
          <h1 className="text-label-md font-bold text-on-surface leading-tight">REGISTRATION</h1>
          <div className="text-xs text-on-surface-variant">Manage how attendees register for {event.name}</div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full p-8 flex flex-col lg:flex-row gap-10 items-start">
        
        {/* Left Column: Settings */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <form onSubmit={handleSaveSettings} className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined">settings</span>
                Settings
              </h2>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-label-sm font-bold text-on-surface-variant">{formData.is_enabled ? 'Enabled' : 'Disabled'}</span>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${formData.is_enabled ? 'bg-primary' : 'bg-surface-variant'}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={formData.is_enabled}
                    onChange={(e) => setFormData({...formData, is_enabled: e.target.checked})}
                  />
                  <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${formData.is_enabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Public Title</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Register for ARAM BTS"
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Brief instructions for attendees..."
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md resize-y min-h-[80px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Capacity (Leave empty for unlimited)</label>
              <input 
                type="number" 
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                placeholder="e.g. 500"
                min="1"
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-medium text-on-surface-variant">Confirmation Message</label>
              <textarea 
                value={formData.confirmation_message}
                onChange={e => setFormData({...formData, confirmation_message: e.target.value})}
                placeholder="Message shown after successful registration..."
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:border-primary focus:ring-1 focus:ring-primary text-body-md resize-y min-h-[80px]"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              className="mt-2 w-full px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            {error && <div className="text-error text-body-sm text-center">{error}</div>}
          </form>

          {/* Metrics Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-sm">
            <h3 className="text-title-sm font-bold text-on-surface mb-4">Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-body-sm text-on-surface-variant">Total Registrations</div>
                <div className="text-headline-sm font-bold text-on-surface">{metrics.total}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Confirmed</div>
                <div className="text-headline-sm font-bold text-green-700">{metrics.confirmed}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Cancelled</div>
                <div className="text-title-md font-bold text-error">{metrics.cancelled}</div>
              </div>
              <div>
                <div className="text-body-sm text-on-surface-variant">Capacity Remaining</div>
                <div className="text-title-md font-bold text-on-surface">{metrics.remaining}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration List */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-title-lg font-bold text-on-surface">Attendees</h2>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded focus:border-primary focus:outline-none text-sm"
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded text-sm focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-outline-variant/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/40">
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Registration #</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Attendee</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Date</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Status</th>
                    <th className="px-5 py-3 text-label-sm font-bold text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-on-surface-variant">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-outline-variant/20 hover:bg-surface-container-lowest transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-on-surface bg-surface-container px-2 py-1 rounded">
                            {reg.registration_number}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-sm text-on-surface">
                            {reg.person?.first_name} {reg.person?.last_name}
                          </div>
                          <div className="text-xs text-on-surface-variant">{reg.person?.email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">
                          {new Date(reg.registered_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            reg.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            reg.status === 'cancelled' ? 'bg-error-container text-on-error-container' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {reg.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleCancelRegistration(reg)}
                              className="text-error hover:bg-error/10 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
