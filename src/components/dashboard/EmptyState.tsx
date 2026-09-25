import React from 'react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-[#F8F4EF] rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl text-[#7A1F3D]">event</span>
      </div>
      <h2 className="text-4xl font-bold text-[#171717] mb-4 tracking-tight">Your event workspace starts here.</h2>
      <p className="text-xl text-[#6B6B6B] mb-10 max-w-lg mx-auto">
        Create your first event and manage the full event lifecycle from one place.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/app/events/new" className="px-6 py-3 bg-[#7A1F3D] text-white font-medium rounded hover:bg-[#4A1024] transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Create Event</span>
        </Link>
        <Link href="/" className="px-6 py-3 border border-[#E7E2DD] text-[#171717] font-medium rounded hover:bg-[#F8F4EF] transition-colors">
          Explore Platform
        </Link>
      </div>
    </div>
  );
}
