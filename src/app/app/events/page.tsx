"use client";

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { EventsHeader } from '@/components/events/EventsHeader';
import { EventsToolbar } from '@/components/events/EventsToolbar';
import { EventGrid } from '@/components/events/EventGrid';
import { EventsEmptyState } from '@/components/events/EventsEmptyState';

export default function EventsListPage() {
  const { events, currentUser } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Derive available statuses dynamically from existing events
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    events.forEach(e => {
      if (e.status) statuses.add(e.status.toLowerCase());
    });
    return Array.from(statuses).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Status Filter
      if (statusFilter !== 'all' && event.status?.toLowerCase() !== statusFilter) {
        return false;
      }
      
      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchString = [
          event.name,
          event.type,
          event.format,
          event.location,
          event.id
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchString.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, searchQuery, statusFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex">
      {/* Global App Shell */}
      <div className="hidden md:block w-[240px] shrink-0">
        <Sidebar currentUser={currentUser} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:w-[calc(100%-240px)] flex flex-col h-screen overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#E7E2DD] bg-white sticky top-0 z-10">
          <div className="font-bold text-[#171717]">ARAM BTS</div>
          <button className="text-[#171717]"><span className="material-symbols-outlined">menu</span></button>
        </div>

        <div className="w-full max-w-[1400px] mx-auto p-6 md:p-12 lg:px-16 lg:py-12">
          <EventsHeader />
          
          {events.length > 0 ? (
            <>
              <EventsToolbar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                availableStatuses={availableStatuses}
              />
              
              {filteredEvents.length > 0 ? (
                <EventGrid events={filteredEvents} />
              ) : (
                <EventsEmptyState isSearchEmpty={true} clearFilters={clearFilters} />
              )}
            </>
          ) : (
            <EventsEmptyState isSearchEmpty={false} />
          )}
        </div>
      </main>
    </div>
  );
}
