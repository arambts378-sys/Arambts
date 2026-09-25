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
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2 rounded font-medium transition-colors ${isActive ? 'bg-[#7A1F3D]/10 text-[#7A1F3D]' : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#F8F4EF]'}`}>
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
            <span className="text-sm font-semibold text-[#171717]">{currentUser?.name || 'Workspace Owner'}</span>
            <span className="text-xs text-[#6B6B6B]">Event Manager</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
