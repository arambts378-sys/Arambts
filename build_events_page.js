const fs = require('fs');
const path = require('path');

const eventsDir = path.resolve('src/components/events');
if (!fs.existsSync(eventsDir)) {
  fs.mkdirSync(eventsDir, { recursive: true });
}

const writeComponent = (name, content) => {
  fs.writeFileSync(path.join(eventsDir, name), content.trim() + '\n');
};

writeComponent('EventsHeader.tsx', `
import React from 'react';
import Link from 'next/link';

export function EventsHeader() {
  return (
    <header className="mb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E7E2DD]">
        <div>
          <div className="text-[10px] font-mono text-[#7A1F3D] uppercase tracking-widest mb-2">Portfolio</div>
          <h1 className="text-4xl font-bold text-[#171717] mb-2 tracking-tight">Events</h1>
          <p className="text-[#6B6B6B] text-lg">
            Manage your full event portfolio across all operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/events/new" className="px-5 py-2.5 bg-[#7A1F3D] text-white font-medium rounded hover:bg-[#4A1024] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Create Event</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
`);

writeComponent('EventsToolbar.tsx', `
import React from 'react';

interface EventsToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  availableStatuses: string[];
}

export function EventsToolbar({ searchQuery, setSearchQuery, statusFilter, setStatusFilter, availableStatuses }: EventsToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
      <div className="relative w-full md:w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] pointer-events-none">search</span>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events by name, location, or type..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E7E2DD] rounded text-[#171717] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#7A1F3D] focus:ring-1 focus:ring-[#7A1F3D] transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-3 w-full md:w-auto">
        <label className="text-sm font-medium text-[#6B6B6B] whitespace-nowrap">Filter by status:</label>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 bg-white border border-[#E7E2DD] rounded text-[#171717] focus:outline-none focus:border-[#7A1F3D] focus:ring-1 focus:ring-[#7A1F3D] transition-colors appearance-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          {availableStatuses.map(status => (
            <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
`);

writeComponent('EventGrid.tsx', `
import React from 'react';
import Link from 'next/link';

export function EventGrid({ events }: { events: any[] }) {
  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {events.map(event => (
        <Link href={\`/app/events/\${event.id}\`} key={event.id} className="group block bg-white border border-[#E7E2DD] rounded overflow-hidden hover:border-[#7A1F3D] transition-colors hover:shadow-md flex flex-col h-full">
          <div className="aspect-[16/10] bg-[#F8F4EF] w-full relative overflow-hidden flex items-center justify-center border-b border-[#E7E2DD] shrink-0">
            {event.flyer ? (
              <img src={event.flyer} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="text-[#7A1F3D] font-bold text-3xl tracking-widest opacity-20 uppercase group-hover:scale-110 transition-transform duration-500">
                {event.format?.substring(0, 4) || 'EVNT'}
              </div>
            )}
            
            {/* Status Badge overlay */}
            <div className="absolute top-4 left-4">
              <span className="font-mono text-[10px] uppercase tracking-widest bg-white/90 backdrop-blur text-[#171717] px-2.5 py-1 rounded border border-[#E7E2DD] shadow-sm">
                {event.status}
              </span>
            </div>
          </div>
          
          <div className="p-6 flex flex-col flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#7A1F3D] mb-2">{event.format || 'EVENT'}</div>
            <h3 className="text-xl font-bold text-[#171717] mb-2 leading-tight">{event.name}</h3>
            
            <div className="text-sm text-[#6B6B6B] mb-6 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>{event.startDate || 'Date TBA'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span className="truncate">{event.location || 'Location TBA'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#E7E2DD]">
              <span className="text-sm text-[#6B6B6B]">
                ID: <span className="font-mono">{event.id}</span>
              </span>
              <span className="text-[#7A1F3D] font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Workspace &rarr;
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
`);

writeComponent('EventsEmptyState.tsx', `
import React from 'react';
import Link from 'next/link';

interface EventsEmptyStateProps {
  isSearchEmpty: boolean;
  clearFilters?: () => void;
}

export function EventsEmptyState({ isSearchEmpty, clearFilters }: EventsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-[#E7E2DD] rounded border-dashed">
      <div className="w-16 h-16 bg-[#F8F4EF] rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl text-[#7A1F3D]">
          {isSearchEmpty ? 'search_off' : 'event_busy'}
        </span>
      </div>
      
      {isSearchEmpty ? (
        <>
          <h2 className="text-2xl font-bold text-[#171717] mb-3">No matching events found.</h2>
          <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
            Try adjusting your search criteria or filter to see more events.
          </p>
          {clearFilters && (
            <button onClick={clearFilters} className="px-6 py-2.5 border border-[#E7E2DD] text-[#171717] font-medium rounded hover:bg-[#F8F4EF] transition-colors">
              Clear Filters
            </button>
          )}
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-[#171717] mb-3">No events yet.</h2>
          <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
            Create your first event and start managing the complete event lifecycle from one workspace.
          </p>
          <Link href="/app/events/new" className="px-6 py-2.5 bg-[#7A1F3D] text-white font-medium rounded hover:bg-[#4A1024] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Create Event</span>
          </Link>
        </>
      )}
    </div>
  );
}
`);

const pageDir = path.resolve('src/app/app/events');
if (!fs.existsSync(pageDir)) {
  fs.mkdirSync(pageDir, { recursive: true });
}

fs.writeFileSync(path.join(pageDir, 'page.tsx'), `
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
`.trim() + '\n');

console.log('Events List Architecture and Stitch Styling successfully built!');
