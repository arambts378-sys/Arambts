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
