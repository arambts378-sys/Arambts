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
