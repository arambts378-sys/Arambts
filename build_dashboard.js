const fs = require('fs');
const path = require('path');

const dashboardDir = path.resolve('src/components/dashboard');
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
}

const writeComponent = (name, content) => {
  fs.writeFileSync(path.join(dashboardDir, name), content.trim() + '\n');
};

writeComponent('Sidebar.tsx', `
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar({ currentUser }: { currentUser: any }) {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Dashboard', path: '/app', icon: 'dashboard' },
    { name: 'Events', path: '/app/events', icon: 'calendar_today' },
    { name: 'People', path: '/app/people', icon: 'groups' },
    { name: 'Analytics', path: '/app/analytics', icon: 'bar_chart' },
    { name: 'Settings', path: '/app/settings', icon: 'settings' },
  ];

  return (
    <aside className="w-[240px] bg-[#FAF8F5] border-r border-[#E7E2DD] flex flex-col h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7A1F3D] rounded flex items-center justify-center font-bold text-white">A</div>
          <div className="font-bold text-[#171717] tracking-tight text-lg">ARAM BTS</div>
        </Link>
      </div>
      
      <div className="px-6 py-2">
        <div className="text-[10px] uppercase tracking-widest text-[#6B6B6B] font-mono mb-4">Workspace</div>
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={\`flex items-center gap-3 px-3 py-2 rounded font-medium transition-colors \${isActive ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#F8F4EF]'}\`}>
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-[#E7E2DD]">
        <Link href="/app/profile" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#E7E2DD] rounded-full flex items-center justify-center text-[#171717] font-semibold text-sm">
            {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#171717] truncate">{currentUser?.name || 'Workspace Owner'}</span>
            <span className="text-xs text-[#6B6B6B]">Event Manager</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
`);

writeComponent('Header.tsx', `
import React from 'react';
import Link from 'next/link';

export function Header({ currentUser }: { currentUser: any }) {
  return (
    <header className="mb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E7E2DD]">
        <div>
          <div className="text-[10px] font-mono text-[#7A1F3D] uppercase tracking-widest mb-2">Workspace Overview</div>
          <h1 className="text-4xl font-bold text-[#171717] mb-2 tracking-tight">
            Good morning, {currentUser?.name || 'Santhosh'}
          </h1>
          <p className="text-[#6B6B6B] text-lg">
            Manage your events, teams, registrations, and operations from one connected workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/events" className="px-4 py-2 border border-[#E7E2DD] text-[#171717] font-medium rounded hover:bg-[#F8F4EF] transition-colors">
            View Events
          </Link>
          <Link href="/app/events/new" className="px-4 py-2 bg-[#7A1F3D] text-white font-medium rounded hover:bg-[#4A1024] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Event</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
`);

writeComponent('WorkspaceStats.tsx', `
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
`);

writeComponent('UpcomingEvents.tsx', `
import React from 'react';
import Link from 'next/link';

export function UpcomingEvents({ events }: { events: any[] }) {
  const upcomingEvents = events.filter(e => e.status !== 'archived').slice(0, 3);
  
  if (upcomingEvents.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#171717]">UPCOMING EVENTS</h2>
        <p className="text-[#6B6B6B]">What's coming up in your workspace.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingEvents.map(event => (
          <Link href={\`/app/events/\${event.id}\`} key={event.id} className="group block bg-white border border-[#E7E2DD] rounded overflow-hidden hover:border-[#7A1F3D] transition-colors hover:shadow-sm">
            <div className="aspect-video bg-[#F8F4EF] w-full relative overflow-hidden flex items-center justify-center border-b border-[#E7E2DD]">
              {event.flyer ? (
                <img src={event.flyer} alt={event.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[#7A1F3D] font-bold text-2xl tracking-widest opacity-20 uppercase">
                  {event.format?.substring(0, 4) || 'EVNT'}
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#7A1F3D] mb-2">{event.format || 'EVENT'}</div>
              <h3 className="text-lg font-bold text-[#171717] mb-1 truncate">{event.name}</h3>
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
`);

writeComponent('YourEvents.tsx', `
import React from 'react';
import Link from 'next/link';

export function YourEvents({ events }: { events: any[] }) {
  if (events.length === 0) return null;
  
  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#171717]">YOUR EVENTS</h2>
          <p className="text-[#6B6B6B]">All events in your portfolio.</p>
        </div>
        <Link href="/app/events" className="text-[#7A1F3D] font-medium hover:underline text-sm">
          View All Events &rarr;
        </Link>
      </div>
      
      <div className="bg-white border border-[#E7E2DD] rounded">
        {events.map((event, index) => (
          <Link href={\`/app/events/\${event.id}\`} key={event.id} className={\`flex items-center justify-between p-4 hover:bg-[#F8F4EF] transition-colors \${index !== events.length - 1 ? 'border-b border-[#E7E2DD]' : ''}\`}>
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
`);

writeComponent('RecentActivity.tsx', `
import React from 'react';

export function RecentActivity({ events }: { events: any[] }) {
  // Simple derived activity from events
  const activities = events.map(e => ({
    id: e.id,
    type: 'Event created',
    target: e.name,
    date: e.createdAt || 'Recently'
  })).slice(0, 5);

  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#171717]">RECENT ACTIVITY</h2>
      </div>
      
      <div className="bg-white border border-[#E7E2DD] rounded p-6">
        {activities.length === 0 ? (
          <div className="text-[#6B6B6B] italic">No recent activity yet.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {activities.map((act, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 w-2 h-2 rounded-full bg-[#7A1F3D]"></div>
                <div>
                  <div className="text-[#171717]">
                    <span className="font-medium">{act.type}:</span> {act.target}
                  </div>
                  <div className="text-xs text-[#6B6B6B] font-mono">{new Date(act.date).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
`);

writeComponent('QuickActions.tsx', `
import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#171717]">QUICK ACTIONS</h2>
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
`);

writeComponent('EmptyState.tsx', `
import React from 'react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-[#F8F4EF] rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl text-[#7A1F3D]">event</span>
      </div>
      <h2 className="text-3xl font-bold text-[#171717] mb-4">Your event workspace starts here.</h2>
      <p className="text-lg text-[#6B6B6B] mb-8 max-w-md mx-auto">
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
`);

const pagePath = path.resolve('src/app/app/page.tsx');
fs.writeFileSync(pagePath, `
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
`.trim() + '\n');

console.log('Dashboard architecture successfully built!');
