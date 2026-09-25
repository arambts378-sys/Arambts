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
      <div className="mb-8 border-b border-[#E7E2DD] pb-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#6B6B6B] mb-1">Recent Activity</h2>
        <p className="text-lg text-[#171717]">Latest actions in your workspace.</p>
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
