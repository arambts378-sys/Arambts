'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function VolunteersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [sessions, setSessions] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [distances, setDistances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedDistances, setSelectedDistances] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/scanner-sessions`);
      
      if (!res.ok) throw new Error('Failed to fetch scanner sessions');
      const data = await res.json();
      
      setSessions(data.sessions || []);
      setZones(data.zones || []);
      setDistances(data.distances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setCreating(true);

    try {
      if (selectedZones.size === 0) {
        throw new Error('Please select at least one zone');
      }

      const res = await fetch(`/api/events/${eventId}/scanner-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerEmail: email,
          zoneIds: Array.from(selectedZones),
          distanceCategoryIds: Array.from(selectedDistances),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create scanner session');
      }
      
      setSuccessMsg('Scanner access created and email sent!');
      setEmail('');
      setSelectedZones(new Set());
      setSelectedDistances(new Set());
      setExpiresAt('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this scanner access?')) return;
    try {
      const res = await fetch(`/api/events/${eventId}/scanner-sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to revoke access');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleZone = (id: string) => {
    const next = new Set(selectedZones);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedZones(next);
  };

  const toggleDistance = (id: string) => {
    const next = new Set(selectedDistances);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDistances(next);
  };

  if (loading) return <div className="p-8">Loading scanner configuration...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Volunteer Scanner Access</h1>
          <p className="text-on-surface-variant">Create and manage secure scanner links for volunteers. No login required.</p>
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

      {successMsg && (
        <div className="p-4 bg-green-100 text-green-800 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* SECTION A: Create Scanner Access */}
      <div className="bg-surface-variant/30 p-6 rounded-2xl border border-outline-variant/30">
        <h2 className="text-lg font-bold mb-6">Create New Scanner Access</h2>
        
        <form onSubmit={handleCreateSession} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="volunteer@example.com"
              className="w-full max-w-md px-4 py-2 border rounded-xl"
            />
            <p className="text-xs text-on-surface-variant mt-1">The secure scanner link will be sent here.</p>
          </div>

          {distances.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Participant Access Scope</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {distances.map(d => (
                  <label key={d.id} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-surface-variant/30">
                    <input 
                      type="checkbox"
                      checked={selectedDistances.has(d.id)}
                      onChange={() => toggleDistance(d.id)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-sm">{d.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Access Zones (Required)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {zones.map(z => (
                <label key={z.id} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-surface-variant/30">
                  <input 
                    type="checkbox"
                    checked={selectedZones.has(z.id)}
                    onChange={() => toggleZone(z.id)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm">{z.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expiration (Optional)</label>
            <input 
              type="datetime-local" 
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="px-4 py-2 border rounded-xl"
            />
          </div>

          <button 
            type="submit" 
            disabled={creating}
            className="bg-primary text-white px-6 py-2 rounded-xl h-10 hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Send Scanner Access'}
          </button>
        </form>
      </div>

      {/* SECTION B: Active Scanner Sessions */}
      <div className="space-y-6 pt-4">
        <h2 className="text-lg font-bold">Active Scanner Sessions</h2>
        
        <div className="overflow-x-auto border border-outline-variant rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-variant/30 text-sm">
              <tr>
                <th className="p-4 font-medium text-on-surface-variant">Volunteer</th>
                <th className="p-4 font-medium text-on-surface-variant">Access Scopes</th>
                <th className="p-4 font-medium text-on-surface-variant">Zones</th>
                <th className="p-4 font-medium text-on-surface-variant">Expires</th>
                <th className="p-4 font-medium text-on-surface-variant">Status</th>
                <th className="p-4 font-medium text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-surface-variant/10">
                  <td className="p-4">
                    <p className="font-medium">{session.volunteer_email}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Created: {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4 text-sm">
                    {session.allowed_scopes?.distance_category_ids?.length > 0 
                      ? distances.filter(d => session.allowed_scopes.distance_category_ids.includes(d.id)).map(d => d.name).join(', ')
                      : 'All (or None required)'}
                  </td>
                  <td className="p-4 text-sm">
                    {session.volunteer_scanner_zones?.map((z: any) => z.access_zones?.name).join(', ') || 'None'}
                  </td>
                  <td className="p-4 text-sm">
                    {new Date(session.expires_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${session.status === 'active' && new Date(session.expires_at).getTime() > Date.now() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {session.status === 'active' && new Date(session.expires_at).getTime() < Date.now() ? 'expired' : session.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {session.status === 'active' && (
                      <button 
                        onClick={() => handleRevoke(session.id)}
                        className="text-error hover:bg-error-container/50 px-3 py-1.5 rounded-lg text-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant border-dashed">
                    No scanner sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
