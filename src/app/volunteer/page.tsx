'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VolunteerDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/volunteer/me')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load assignments');
        return res.json();
      })
      .then(data => {
        setAssignments(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-error">{error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-on-surface-variant">Events you are assigned to as a volunteer.</p>
      </div>

      {assignments.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-outline-variant rounded-3xl">
          <p className="text-on-surface-variant">You have no active volunteer assignments.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {assignments.map(assignment => (
            <div key={assignment.id} className="bg-surface border border-outline-variant rounded-3xl p-6 flex flex-col">
              <h2 className="text-xl font-bold mb-4">{assignment.events?.name}</h2>
              
              <div className="flex-1 mb-6">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-2">Assigned Zones</h3>
                {assignment.zones && assignment.zones.length > 0 ? (
                  <ul className="space-y-2">
                    {assignment.zones.map((z: any) => (
                      <li key={z.zone_id} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                        {z.access_zones?.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant italic">No zones assigned yet.</p>
                )}
              </div>

              <Link 
                href={`/volunteer/scanner/${assignment.event_id}`}
                className="bg-primary text-white text-center font-bold py-3 rounded-full hover:bg-primary/90 transition-colors w-full"
              >
                Open Scanner
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
