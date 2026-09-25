import React from 'react';
import Link from 'next/link';

export function UpcomingEvents({ events }: { events: any[] }) {
  const upcomingEvents = events.filter(e => e.status !== 'archived').slice(0, 3);
  
  if (upcomingEvents.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="mb-8 border-b border-[#E7E2DD] pb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#6B6B6B] mb-1">Upcoming Events</h2>
          <p className="text-lg text-[#171717]">What's coming up in your workspace.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingEvents.map(event => (
          <Link href={`/app/events/${event.id}`} key={event.id} className="group block bg-white border border-[#E7E2DD] rounded overflow-hidden hover:border-[#7A1F3D] transition-colors hover:shadow-sm">
            <div className="aspect-video bg-[#F8F4EF] w-full relative overflow-hidden flex items-center justify-center border-b border-[#E7E2DD]">
              {event.flyer ? (
                <img src={event.flyer} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[#7A1F3D] font-bold text-2xl tracking-widest uppercase">
                  {event.format?.substring(0, 4) || 'EVNT'}
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#7A1F3D] mb-2">{event.format || 'EVENT'}</div>
              <h3 className="text-lg font-bold text-[#171717] mb-1">{event.name}</h3>
              <div className="text-sm text-[#6B6B6B] mb-4">
                {event.startDate} &middot; {event.location || 'TBA'}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs uppercase bg-[#F8F4EF] text-[#171717] px-2 py-1 rounded">{event.status}</span>
                <span className="text-[#7A1F3D] font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Event &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
