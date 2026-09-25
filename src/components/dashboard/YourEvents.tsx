import React from 'react';
import Link from 'next/link';

export function YourEvents({ events }: { events: any[] }) {
  if (events.length === 0) return null;
  
  return (
    <section className="mb-16">
      <div className="flex items-end justify-between mb-8 border-b border-[#E7E2DD] pb-4">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#6B6B6B] mb-1">Your Events</h2>
          <p className="text-lg text-[#171717]">All events in your portfolio.</p>
        </div>
        <Link href="/app/events" className="text-[#7A1F3D] font-medium hover:underline text-sm">
          View All Events &rarr;
        </Link>
      </div>
      
      <div className="bg-white border border-[#E7E2DD] rounded">
        {events.map((event, index) => (
          <Link href={`/app/events/${event.id}`} key={event.id} className={`flex items-center justify-between p-4 hover:bg-[#F8F4EF] transition-colors ${index !== events.length - 1 ? 'border-b border-[#E7E2DD]' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FAF8F5] border border-[#E7E2DD] rounded flex items-center justify-center overflow-hidden">
                {event.flyer ? (
                   <img src={event.flyer} alt={event.name} className="w-full h-full object-cover" />
                ) : (
                   <span className="text-[10px] font-mono text-[#7A1F3D] font-bold">{event.format?.substring(0,2).toUpperCase() || 'EV'}</span>
                )}
              </div>
              <div>
                <div className="font-bold text-[#171717]">{event.name}</div>
                <div className="text-sm text-[#6B6B6B]">{event.startDate} &middot; {event.type || 'Event'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono uppercase px-2 py-1 bg-[#F8F4EF] text-[#6B6B6B] rounded border border-[#E7E2DD]">
                {event.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
