"use client";

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { WorkspaceStats } from '@/components/dashboard/WorkspaceStats';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { YourEvents } from '@/components/dashboard/YourEvents';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { EmptyState } from '@/components/dashboard/EmptyState';

export default function DashboardPage() {
  const { events, currentUser } = useAppContext();

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex">
      {/* Global App Shell */}
      <div className="hidden md:block w-[240px] shrink-0">
        <Sidebar currentUser={currentUser} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:w-[calc(100%-240px)]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#E7E2DD] bg-white">
          <div className="font-bold text-[#171717]">ARAM BTS</div>
          <button className="text-[#171717]"><span className="material-symbols-outlined">menu</span></button>
        </div>

        <div className="max-w-[1200px] mx-auto p-6 md:p-12 lg:p-16">
          <Header currentUser={currentUser} />
          
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <WorkspaceStats events={events} />
              <UpcomingEvents events={events} />
              <YourEvents events={events} />
              <RecentActivity events={events} />
              <QuickActions />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
