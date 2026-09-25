import React from 'react';

export function WorkspaceStats({ events }: { events: any[] }) {
  const activeEvents = events.filter(e => e.status !== 'archived').length;
  
  return (
    <section className="mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="flex flex-col border-r border-[#E7E2DD] last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-[#6B6B6B] font-mono mb-2">Upcoming Events</span>
          <span className="text-4xl font-bold text-[#171717]">{activeEvents}</span>
        </div>
        <div className="flex flex-col border-r border-[#E7E2DD] last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-[#6B6B6B] font-mono mb-2">Active Events</span>
          <span className="text-4xl font-bold text-[#171717]">{events.filter(e => e.status === 'published').length || 0}</span>
        </div>
        <div className="flex flex-col border-r border-[#E7E2DD] last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-[#6B6B6B] font-mono mb-2">Registrations</span>
          <span className="text-4xl font-bold text-[#171717]">0</span>
        </div>
        <div className="flex flex-col border-r border-[#E7E2DD] last:border-r-0">
          <span className="text-xs uppercase tracking-widest text-[#6B6B6B] font-mono mb-2">Team Members</span>
          <span className="text-4xl font-bold text-[#171717]">1</span>
        </div>
      </div>
    </section>
  );
}
