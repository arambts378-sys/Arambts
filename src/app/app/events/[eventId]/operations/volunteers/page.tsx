"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export default function VolunteersPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated, activeWorkspace } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isHydrated || !eventId || !activeWorkspace) return;

    const loadData = async () => {
      const supabase = createClient();

      // 1. Load active access zones
      const { data: zonesData } = await supabase
        .from('access_zones')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('name');
      
      if (zonesData) setZones(zonesData);

      // 2. Load workspace members for the dropdown (since event staff must be workspace members)
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profiles ( id, full_name, email )
        `)
        .eq('workspace_id', activeWorkspace.id);

      if (membersData) {
        setWorkspaceMembers(membersData.map((m: any) => m.profiles).filter(Boolean));
      }

      // 3. Load current assignments
      const { data: assignmentsData } = await supabase
        .from('event_staff_assignments')
        .select(`
          id,
          active,
          access_zones ( id, name ),
          profiles ( id, full_name, email )
        `)
        .eq('event_id', eventId);

      if (assignmentsData) {
        setAssignments(assignmentsData);
      }

      setLoading(false);
    };

    loadData();
  }, [isHydrated, eventId, activeWorkspace]);

  const handleAddAssignment = async () => {
    if (!selectedUserId || selectedZoneIds.length === 0) return;
    
    const supabase = createClient();
    
    // We update if exists, insert if not (Supabase UPSERT doesn't work perfectly without correct unique keys, so we'll just insert and let the trigger handle errors, or use upsert)
    const newAssignments = selectedZoneIds.map(zoneId => ({
      event_id: eventId,
      user_id: selectedUserId,
      access_zone_id: zoneId,
      active: true
    }));

    const { error } = await supabase
      .from('event_staff_assignments')
      .upsert(newAssignments, { onConflict: 'event_id,user_id,access_zone_id' });

    if (!error) {
      setIsAddModalOpen(false);
      setSelectedUserId('');
      setSelectedZoneIds([]);
      // reload
      window.location.reload();
    } else {
      alert("Error saving assignments: " + error.message);
    }
  };

  const handleDeactivate = async (assignmentId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('event_staff_assignments')
      .update({ active: false })
      .eq('id', assignmentId);
    
    if (!error) {
      window.location.reload();
    }
  };

  if (!isHydrated || loading) return <div className="p-10 text-center">Loading...</div>;
  const event = getEvent(eventId);
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  // Group assignments by user
  const groupedAssignments: Record<string, any> = {};
  assignments.forEach(a => {
    if (!a.profiles) return;
    const uid = a.profiles.id;
    if (!groupedAssignments[uid]) {
      groupedAssignments[uid] = {
        profile: a.profiles,
        zones: []
      };
    }
    groupedAssignments[uid].zones.push({
      id: a.id,
      zoneName: a.access_zones?.name,
      active: a.active
    });
  });

  const volunteersList = Object.values(groupedAssignments);

  const totalVolunteers = volunteersList.length;
  const activeVolunteers = volunteersList.filter(v => v.zones.some((z: any) => z.active)).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/app/events/${eventId}/operations`} className="text-primary hover:underline text-sm font-medium mb-2 inline-block">
            ← Back to Operations
          </Link>
          <h1 className="text-headline-md font-bold text-on-surface">Volunteer Management</h1>
          <p className="text-body-lg text-on-surface-variant">Assign checkpoint access to event staff.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors"
        >
          Add Volunteer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl">
          <p className="text-label-md uppercase font-bold text-on-surface-variant">Total Volunteers</p>
          <p className="text-display-sm font-bold text-primary mt-2">{totalVolunteers}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl">
          <p className="text-label-md uppercase font-bold text-on-surface-variant">Active Volunteers</p>
          <p className="text-display-sm font-bold text-green-700 mt-2">{activeVolunteers}</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/60">
              <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Volunteer</th>
              <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Email</th>
              <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Assigned Checkpoints</th>
              <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {volunteersList.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">No volunteers assigned.</td></tr>
            ) : volunteersList.map(v => (
              <tr key={v.profile.id} className="hover:bg-surface-container/30">
                <td className="px-6 py-4 font-medium">{v.profile.full_name}</td>
                <td className="px-6 py-4 text-on-surface-variant">{v.profile.email}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {v.zones.map((z: any) => (
                      <span key={z.id} className={`text-xs px-2 py-1 rounded-full border ${z.active ? 'border-primary text-primary bg-primary/10' : 'border-outline text-on-surface-variant bg-surface-container'}`}>
                        {z.zoneName} {z.active ? '' : '(Inactive)'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {v.zones.some((z: any) => z.active) && (
                    <button 
                      onClick={() => handleDeactivate(v.zones.find((z: any) => z.active).id)}
                      className="text-error hover:underline text-sm font-medium"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-xl">
            <h2 className="text-title-lg font-bold mb-6">Assign Volunteer Checkpoint</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-label-md font-bold mb-2">Select User</label>
                <select 
                  className="w-full p-3 border border-outline rounded-xl"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Select workspace member --</option>
                  {workspaceMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md font-bold mb-2">Checkpoint Access</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-outline rounded-xl p-3">
                  {zones.length === 0 ? <p className="text-sm text-on-surface-variant">No active checkpoints found.</p> : zones.map(z => (
                    <label key={z.id} className="flex items-center gap-3 p-2 hover:bg-surface-container cursor-pointer rounded-lg">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                        checked={selectedZoneIds.includes(z.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedZoneIds([...selectedZoneIds, z.id]);
                          else setSelectedZoneIds(selectedZoneIds.filter(id => id !== z.id));
                        }}
                      />
                      <span className="font-medium">{z.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-6 py-2 font-bold text-on-surface hover:bg-surface-container rounded-full"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddAssignment}
                disabled={!selectedUserId || selectedZoneIds.length === 0}
                className="px-6 py-2 font-bold bg-primary text-on-primary rounded-full disabled:opacity-50"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
