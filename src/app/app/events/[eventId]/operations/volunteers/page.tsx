'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VolunteersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [isNotMember, setIsNotMember] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [volRes, zoneRes] = await Promise.all([
        fetch(`/api/events/${eventId}/volunteers`),
        fetch(`/api/events/${eventId}/zones`)
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

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsNotMember(false);
    setInvitationLink(null);

    try {
      const res = await fetch(`/api/events/${eventId}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === 'NOT_WORKSPACE_MEMBER') {
          setIsNotMember(true);
          return;
        }
        throw new Error(data.error || data.message || 'Failed to assign volunteer');
      }
      
      setSuccessMsg('Volunteer assigned to this event.');
      setEmail('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleInviteToWorkspace = async () => {
    setInviting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/events/${eventId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to create workspace invitation');
      }
      
      setSuccessMsg('Workspace invitation created.');
      setInvitationLink(data.link);
      setIsNotMember(false); // Hide the invite button since it's done
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveVolunteer = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this volunteer from the event?')) return;
    try {
      const res = await fetch(`/api/events/${eventId}/volunteers/${userId}`, {
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
        await fetch(`/api/events/${eventId}/volunteers/${userId}/zones/${zoneId}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/events/${eventId}/volunteers/${userId}/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zoneId })
        });
      }
      fetchData(); 
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading volunteers...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Volunteers</h1>
          <p className="text-on-surface-variant">Manage staff and their scanner zone assignments.</p>
        </div>
        <Link 
          href={`/app/events/${eventId}/operations/access-control`}
          className="bg-surface-variant text-on-surface px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-variant/80 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          QR & Access
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-error-container text-error rounded-xl">
          {error}
        </div>
      )}

      {successMsg && !invitationLink && (
        <div className="p-4 bg-green-100 text-green-800 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* SECTION A: Workspace Member Assignment */}
      <div className="bg-surface-variant/30 p-6 rounded-2xl space-y-4 border border-outline-variant/30">
        <div>
          <h2 className="text-lg font-bold">Assign Workspace Member</h2>
          <p className="text-sm text-on-surface-variant mb-4">Only workspace members can be assigned as event volunteers.</p>
        </div>
        
        <form onSubmit={handleAssign} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsNotMember(false);
                setInvitationLink(null);
                setSuccessMsg(null);
                setError(null);
              }}
              placeholder="Enter member's email address"
              className="w-full px-4 py-2 border rounded-xl"
            />
          </div>
          <button type="submit" className="bg-primary text-white px-6 py-2 rounded-xl h-10 hover:bg-primary/90">
            Assign to Event
          </button>
        </form>

        {isNotMember && (
          <div className="mt-4 p-4 bg-secondary-container/50 border border-secondary/20 rounded-xl flex items-center justify-between">
            <div className="text-on-secondary-container">
              <p className="font-semibold">This person is not a workspace member yet.</p>
              <p className="text-sm opacity-80">You must invite them to the workspace before they can be assigned.</p>
            </div>
            <button 
              onClick={handleInviteToWorkspace}
              disabled={inviting}
              className="bg-secondary text-on-secondary px-4 py-2 rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Invite to Workspace'}
            </button>
          </div>
        )}

        {invitationLink && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
            <p className="font-semibold text-green-800">{successMsg}</p>
            <p className="text-sm text-green-700">Share this link with them to join the workspace. Once they accept, you can assign them to this event.</p>
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="text" 
                readOnly 
                value={window.location.origin + invitationLink} 
                className="flex-1 bg-white border border-green-200 px-3 py-2 rounded-lg text-sm text-on-surface"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(window.location.origin + invitationLink)}
                className="bg-white border border-green-300 text-green-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-100"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: Event Volunteers */}
      <div className="space-y-6 pt-4">
        <h2 className="text-lg font-bold">Event Volunteers</h2>
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
                Remove from Event
              </button>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Assigned Scanner Zones</h4>
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
