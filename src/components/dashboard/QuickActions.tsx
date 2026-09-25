import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <section className="mb-16">
      <div className="mb-8 border-b border-[#E7E2DD] pb-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#6B6B6B] mb-1">Quick Actions</h2>
        <p className="text-lg text-[#171717]">Common workspace operations.</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href="/app/events/new" className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E7E2DD] text-[#171717] rounded hover:border-[#7A1F3D] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="font-medium">Create Event</span>
        </Link>
        <Link href="/app/events" className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E7E2DD] text-[#171717] rounded hover:border-[#7A1F3D] transition-colors">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          <span className="font-medium">Manage Events</span>
        </Link>
        <Link href="/app/people" className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E7E2DD] text-[#171717] rounded hover:border-[#7A1F3D] transition-colors">
          <span className="material-symbols-outlined text-[18px]">groups</span>
          <span className="font-medium">View People</span>
        </Link>
      </div>
    </section>
  );
}
