'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VolunteersPage({ params }: { params: { eventId: string } }) {
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [params.eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [volRes, zoneRes] = await Promise.all([
        fetch(`/api/events/${params.eventId}/volunteers`),
        fetch(`/api/events/${params.eventId}/check-in/zones`) // Assuming this endpoint exists or similar
      ]);
      
      if (!volRes.ok) throw new Error('Failed to fetch volunteers');
      const volData = await volRes.json();
      setVolunteers(volData);
      
      if (zoneRes.ok) {
        const zoneData = await zoneRes.json();
        setZones(zoneData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`/api/events/${params.eventId}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add volunteer');
      }
      setEmail('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveVolunteer = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke this volunteer?')) return;
    try {
      const res = await fetch(`/api/events/${params.eventId}/volunteers/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove volunteer');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleZone = async (userId: string, zoneId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        // Remove
        await fetch(`/api/events/${params.eventId}/volunteers/${userId}/zones/${zoneId}`, { method: 'DELETE' });
      } else {
        // Add
        await fetch(`/api/events/${params.eventId}/volunteers/${userId}/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zoneId })
        });
      }
      fetchData(); // Refresh to get updated state
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading volunteers...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Event Volunteers</h1>
        <p className="text-on-surface-variant">Manage staff and their scanner zone assignments.</p>
      </div>

      {error && (
        <div className="p-4 bg-error-container text-error rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex gap-4 items-end bg-surface-variant/30 p-6 rounded-2xl">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Invite Workspace Member</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter member's email address"
            className="w-full px-4 py-2 border rounded-xl"
          />
        </div>
        <button type="submit" className="bg-primary text-white px-6 py-2 rounded-xl h-10 hover:bg-primary/90">
          Add Volunteer
        </button>
      </form>

      <div className="space-y-6">
        {volunteers.map((vol) => (
          <div key={vol.id} className="border border-outline-variant rounded-2xl p-6 bg-surface flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{vol.users?.email}</h3>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary-container text-primary mt-2">
                  {vol.role}
                </span>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${vol.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {vol.status}
                </span>
              </div>
              <button 
                onClick={() => handleRemoveVolunteer(vol.user_id)}
                className="text-error hover:bg-error-container/50 px-4 py-2 rounded-xl text-sm"
              >
                Revoke Access
              </button>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Zone Assignments</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {zones.map(zone => {
                  const isAssigned = vol.zones?.some((z: any) => z.zone_id === zone.id);
                  return (
                    <label key={zone.id} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-surface-variant/30">
                      <input 
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleZone(vol.user_id, zone.id, isAssigned)}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm">{zone.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {volunteers.length === 0 && (
          <div className="text-center p-12 text-on-surface-variant border rounded-2xl border-dashed">
            No volunteers assigned to this event yet.
          </div>
        )}
      </div>
    </div>
  );
}
