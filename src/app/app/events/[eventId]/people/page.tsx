"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { peopleService } from '@/services/people';
import { EventPerson, EventPersonType, EventPersonStatus } from '@/types';
import PersonModal, { PersonFormData } from '@/components/people/PersonModal';

export default function PeoplePage() {
  const router = useRouter();
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, activeWorkspace, isHydrated } = useAppContext();

  const [people, setPeople] = useState<EventPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedPerson, setSelectedPerson] = useState<EventPerson | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EventPersonType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EventPersonStatus>('active'); // default show active

  const event = getEvent(eventId);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await peopleService.getEventPeople(eventId);
      setPeople(data);
    } catch (err: any) {
      console.error(err);
      setError('Unable to load people. Please check your permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && eventId) {
      fetchPeople();
    }
  }, [isHydrated, eventId]);

  const handleSavePerson = async (formData: PersonFormData) => {
    if (!activeWorkspace) throw new Error("No active workspace");

    if (modalMode === 'add') {
      await peopleService.addPersonToEvent(
        activeWorkspace.id,
        eventId,
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          organization: formData.organization,
          job_title: formData.job_title
        },
        formData.person_type
      );
    } else if (modalMode === 'edit' && selectedPerson?.person?.id) {
      await peopleService.updatePerson(selectedPerson.person.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        organization: formData.organization,
        job_title: formData.job_title
      });
      // Person type shouldn't change easily, so we only update the core profile.
    }
    
    await fetchPeople();
  };

  const handleToggleStatus = async (person: EventPerson) => {
    const newStatus = person.status === 'active' ? 'inactive' : 'active';
    if (newStatus === 'inactive') {
      if (!confirm(`Are you sure you want to deactivate ${person.person?.first_name}? They will lose access to the event.`)) {
        return;
      }
    }
    
    try {
      await peopleService.updateEventPersonStatus(person.id, newStatus);
      await fetchPeople();
    } catch (err) {
      alert("Failed to update status. Check permissions.");
    }
  };

  // Derived state
  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      // Status Filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      // Type Filter
      if (typeFilter !== 'all' && p.person_type !== typeFilter) return false;
      
      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const first = p.person?.first_name?.toLowerCase() || '';
        const last = p.person?.last_name?.toLowerCase() || '';
        const email = p.person?.email?.toLowerCase() || '';
        const org = p.person?.organization?.toLowerCase() || '';
        
        if (!first.includes(query) && !last.includes(query) && !email.includes(query) && !org.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [people, searchQuery, typeFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = people.length;
    const attendees = people.filter(p => p.person_type === 'attendee').length;
    const staff = people.filter(p => p.person_type === 'staff').length;
    const active = people.filter(p => p.status === 'active').length;
    return { total, attendees, staff, active };
  }, [people]);

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
          <h1 className="text-label-md font-bold text-on-surface leading-tight">PEOPLE</h1>
          <div className="text-xs text-on-surface-variant">Manage everyone involved in {event.name}</div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full p-8 flex flex-col gap-8">
        
        {/* Top Actions & Metrics */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex gap-8">
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Total People</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.total}</div>
            </div>
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Attendees</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.attendees}</div>
            </div>
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Staff</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.staff}</div>
            </div>
            <div>
              <div className="text-body-sm text-on-surface-variant mb-1">Active</div>
              <div className="text-headline-sm font-bold text-on-surface">{metrics.active}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setModalMode('add');
                setSelectedPerson(null);
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 shadow transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Person
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
              placeholder="Search by name, email, or org..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all text-body-md"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded text-body-sm font-medium focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="attendee">Attendees</option>
              <option value="staff">Staff</option>
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
            <p>Loading people...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-error-container text-on-error-container rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <p>{error}</p>
            </div>
            <button onClick={fetchPeople} className="px-4 py-2 bg-surface-container-lowest text-on-surface font-medium rounded text-sm hover:bg-surface-container-highest">
              Retry
            </button>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest/50">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-3xl">group_off</span>
            </div>
            {people.length === 0 ? (
              <>
                <h3 className="text-title-lg font-bold text-on-surface mb-2">Your event doesn't have any people yet.</h3>
                <p className="text-body-md text-on-surface-variant mb-6">Add your first attendee or staff member to get started.</p>
                <button 
                  onClick={() => { setModalMode('add'); setSelectedPerson(null); setIsModalOpen(true); }}
                  className="px-5 py-2.5 bg-primary text-white text-label-md font-bold rounded hover:bg-primary/90 transition-colors"
                >
                  + Add Person
                </button>
              </>
            ) : (
              <>
                <h3 className="text-title-lg font-bold text-on-surface mb-2">No people match your search.</h3>
                <p className="text-body-md text-on-surface-variant">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setTypeFilter('all'); setStatusFilter('all'); }}
                  className="mt-4 px-4 py-2 text-primary text-label-md font-bold hover:bg-primary/5 rounded transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant/60 text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="px-6 py-4">Person</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Added</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {filteredPeople.map(p => (
                    <tr key={p.id} className={`hover:bg-surface-container-lowest transition-colors ${p.status === 'inactive' ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-bold shrink-0">
                            {p.person?.first_name?.charAt(0)}{p.person?.last_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-label-md font-bold text-on-surface">
                              {p.person?.first_name} {p.person?.last_name}
                            </div>
                            {(p.person?.job_title || p.person?.organization) && (
                              <div className="text-body-sm text-on-surface-variant truncate max-w-[200px]">
                                {p.person?.job_title} {p.person?.job_title && p.person?.organization && 'at'} {p.person?.organization}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-md text-on-surface truncate max-w-[200px]">
                        {p.person?.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase
                          ${p.person_type === 'staff' ? 'bg-[#4A1024]/10 text-[#4A1024]' : 'bg-surface-container-highest text-on-surface-variant'}
                        `}>
                          {p.person_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                          ${p.status === 'active' ? 'bg-green-500/10 text-green-700' : 'bg-surface-container-highest text-on-surface-variant'}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-green-500' : 'bg-on-surface-variant'}`}></span>
                          {p.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setModalMode('edit'); setSelectedPerson(p); setIsModalOpen(true); }}
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(p)}
                            className={`p-1.5 rounded transition-colors ${p.status === 'active' ? 'text-on-surface-variant hover:text-error hover:bg-error/5' : 'text-on-surface-variant hover:text-green-600 hover:bg-green-500/10'}`}
                            title={p.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {p.status === 'active' ? 'person_off' : 'person_check'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      <PersonModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePerson}
        initialData={selectedPerson}
        mode={modalMode}
      />
    </div>
  );
}
