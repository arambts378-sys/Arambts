import React from 'react';
import Link from 'next/link';

export function EventGrid({ events }: { events: any[] }) {
  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {events.map(event => (
        <Link href={`/app/events/${event.id}`} key={event.id} className="group block bg-white border border-[#E7E2DD] rounded overflow-hidden hover:border-[#7A1F3D] transition-colors hover:shadow-md flex flex-col h-full">
          <div className="aspect-[16/10] bg-[#F8F4EF] w-full relative overflow-hidden flex items-center justify-center border-b border-[#E7E2DD] shrink-0">
            {event.flyer ? (
              <img src={event.flyer} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="text-[#7A1F3D] font-bold text-3xl tracking-widest uppercase group-hover:scale-110 transition-transform duration-500">
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
                <span>{event.location || 'Location TBA'}</span>
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
