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
