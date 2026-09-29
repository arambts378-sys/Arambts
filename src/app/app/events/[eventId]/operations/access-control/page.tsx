"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export default function AccessControlPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated, activeWorkspace } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'zones' | 'activity'>('zones');
  
  const [zones, setZones] = useState<any[]>([]);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Modals
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);

  // New Zone State
  const [newZone, setNewZone] = useState({
    name: '',
    zone_type: 'Checkpoint',
    description: '',
    location: '',
    requires_qr: true,
    allow_reentry: false,
    entitlement_limit: '',
    entitlement_unit: 'Meals',
    is_active: true,
    // Walkathon specific
    checkpoint_type: 'CHECKPOINT',
    distance_km: '',
    sequence: ''
  });

  useEffect(() => {
    if (!isHydrated || !eventId || !activeWorkspace) return;

    const loadData = async () => {
      const supabase = createClient();

      // Load zones
      const { data: zonesData } = await supabase
        .from('access_zones')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at');
      
      if (zonesData) setZones(zonesData);

      // Load recent activity
      const { data: scansData } = await supabase
        .from('check_ins')
        .select(`
          id,
          scanned_at,
          result,
          reason,
          access_zones ( name ),
          registrations (
            event_people (
              people ( full_name )
            )
          )
        `)
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: false })
        .limit(20);
        
      if (scansData) setRecentScans(scansData);

      setLoading(false);
    };

    loadData();
  }, [isHydrated, eventId, activeWorkspace]);

  const handleCreateZone = async () => {
    if (!newZone.name || !newZone.zone_type) return;

    const supabase = createClient();
    const limit = (newZone.zone_type === 'Food Court' && newZone.entitlement_limit) ? parseInt(newZone.entitlement_limit) : null;
    const unit = (newZone.zone_type === 'Food Court' && newZone.entitlement_unit) ? newZone.entitlement_unit : null;
    
    // Create Zone
    const { data: zoneData, error: zoneError } = await supabase
      .from('access_zones')
      .insert({
        event_id: eventId,
        name: newZone.name,
        zone_type: newZone.zone_type,
        description: newZone.description,
        location: newZone.location,
        requires_qr: newZone.requires_qr,
        allow_reentry: newZone.allow_reentry,
        entitlement_limit: limit,
        entitlement_unit: unit,
        is_active: newZone.is_active,
        checkpoint_type: newZone.zone_type === 'Walkathon Checkpoint' ? newZone.checkpoint_type : null,
        distance_km: newZone.zone_type === 'Walkathon Checkpoint' && newZone.distance_km ? parseFloat(newZone.distance_km) : null,
        sequence: newZone.zone_type === 'Walkathon Checkpoint' && newZone.sequence ? parseInt(newZone.sequence) : null
      })
      .select()
      .single();

    if (zoneError) {
      alert("Error creating zone: " + zoneError.message);
      return;
    }

    // Default rule: All confirmed attendees
    await supabase
      .from('access_rules')
      .insert({
        zone_id: zoneData.id,
        rule_type: 'all_confirmed_attendees',
        rule_value: {}
      });

    setZones([...zones, zoneData]);
    setIsAddZoneModalOpen(false);
    setNewZone({
      name: '',
      zone_type: 'Checkpoint',
      description: '',
      location: '',
      requires_qr: true,
      allow_reentry: false,
      entitlement_limit: '',
      entitlement_unit: 'Meals',
      is_active: true,
      checkpoint_type: 'CHECKPOINT',
      distance_km: '',
      sequence: ''
    });
  };

  const handleDeactivateZone = async (zoneId: string, currentStatus: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('access_zones')
      .update({ is_active: !currentStatus })
      .eq('id', zoneId);
    
    if (!error) {
      setZones(zones.map(z => z.id === zoneId ? { ...z, is_active: !currentStatus } : z));
    }
  };

  if (!isHydrated || loading) return <div className="p-10 text-center">Loading...</div>;
  const event = getEvent(eventId);
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  const activeZones = zones.filter(z => z.is_active).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-20">
      
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/app/events/${eventId}`} className="text-primary hover:underline text-sm font-medium mb-2 inline-block">
            ← Back to Event Workspace
          </Link>
          <h1 className="text-headline-md font-bold text-on-surface uppercase tracking-tight">QR & Access</h1>
          <p className="text-body-lg text-on-surface-variant">Configure event access, checkpoints, entitlements, and volunteer permissions.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
          <p className="text-label-md uppercase font-bold text-on-surface-variant">Active Zones</p>
          <p className="text-display-sm font-bold text-primary mt-2">{activeZones}</p>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
          <p className="text-label-md uppercase font-bold text-on-surface-variant">Total Zones</p>
          <p className="text-display-sm font-bold text-on-surface mt-2">{zones.length}</p>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
          <p className="text-label-md uppercase font-bold text-on-surface-variant">Today's Scans</p>
          <p className="text-display-sm font-bold text-on-surface mt-2">
            {recentScans.filter(s => new Date(s.scanned_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-title-lg font-bold uppercase tracking-tight">Volunteer Access</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Manage event volunteers and assign the scanner zones they are allowed to access.</p>
        </div>
        <Link 
          href={`/app/events/${eventId}/operations/volunteers`}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold shadow-sm hover:bg-primary/90 transition-all whitespace-nowrap flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">group</span>
          Manage Volunteers
        </Link>
      </div>

      <div className="border-b border-outline-variant flex gap-8">
        <button 
          onClick={() => setActiveTab('zones')}
          className={`pb-3 text-label-lg font-bold uppercase tracking-wider ${activeTab === 'zones' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Access Zones
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-label-lg font-bold uppercase tracking-wider ${activeTab === 'activity' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Activity
        </button>
      </div>

      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAddZoneModalOpen(true)}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Create Access Zone
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.length === 0 ? (
              <div className="col-span-full py-12 text-center text-on-surface-variant bg-white border border-outline-variant rounded-2xl">
                No access zones created yet.
              </div>
            ) : zones.map(z => (
              <div key={z.id} className="bg-white border border-outline-variant rounded-2xl p-6 flex flex-col shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-title-lg font-bold uppercase tracking-tight leading-tight">{z.name}</h3>
                    <p className="text-label-md text-primary font-bold mt-1 uppercase">{z.zone_type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${z.is_active ? 'bg-green-100 text-green-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                    {z.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {z.description && <p className="text-body-sm text-on-surface-variant mb-4">{z.description}</p>}
                
                <div className="space-y-2 mb-6 flex-1 text-sm text-on-surface-variant">
                  <div className="flex justify-between">
                    <span className="font-bold">QR Required</span>
                    <span>{z.requires_qr ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Re-entry</span>
                    <span>{z.allow_reentry ? 'Yes' : 'No'}</span>
                  </div>
                  {z.checkpoint_type && (
                    <div className="flex justify-between border-t border-outline-variant/30 pt-2 mt-2">
                      <span className="font-bold">Walkathon Checkpoint</span>
                      <span className="font-bold text-on-surface">{z.checkpoint_type} ({z.distance_km} KM)</span>
                    </div>
                  )}
                  {z.entitlement_limit && (
                    <div className="flex justify-between border-t border-outline-variant/30 pt-2 mt-2">
                      <span className="font-bold">Allocation</span>
                      <span className="font-bold text-on-surface">{z.entitlement_limit} {z.entitlement_unit}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 border-t border-outline-variant/50 pt-4 mt-auto">
                  <button className="text-sm font-bold text-primary hover:underline flex-1 text-center">Edit</button>
                  <button className="text-sm font-bold text-primary hover:underline flex-1 text-center">Manage Access</button>
                  <div className="w-px h-4 bg-outline-variant"></div>
                  <button onClick={() => handleDeactivateZone(z.id, z.is_active)} className="text-sm font-bold text-error hover:underline flex-1 text-center">
                    {z.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/60">
                  <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Time</th>
                  <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Participant</th>
                  <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Zone</th>
                  <th className="px-6 py-4 text-label-md uppercase text-on-surface-variant">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {recentScans.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">No check-in activity yet.</td></tr>
                ) : recentScans.map(s => {
                  const personName = s.registrations?.event_people?.[0]?.people?.full_name || 'Unknown';
                  return (
                    <tr key={s.id} className="hover:bg-surface-container/30">
                      <td className="px-6 py-4 text-sm whitespace-nowrap">{new Date(s.scanned_at).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 font-bold">{personName}</td>
                      <td className="px-6 py-4 text-sm">{s.access_zones?.name || 'Unknown Zone'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${s.result === 'allowed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {s.result}
                          </span>
                          {s.reason && <span className="text-xs text-on-surface-variant mt-1">{s.reason}</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isAddZoneModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-headline-sm font-bold mb-6">Create Access Zone</h2>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md font-bold mb-2">Zone Name</label>
                  <input type="text" className="w-full p-3 border border-outline rounded-xl" placeholder="e.g. Main Gate" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-label-md font-bold mb-2">Zone Type</label>
                  <select className="w-full p-3 border border-outline rounded-xl" value={newZone.zone_type} onChange={e => setNewZone({...newZone, zone_type: e.target.value})}>
                    <option value="Gate">Gate</option>
                    <option value="Food Court">Food Court</option>
                    <option value="VIP">VIP</option>
                    <option value="Checkpoint">Checkpoint</option>
                    <option value="Walkathon Checkpoint">Walkathon Checkpoint</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Backstage">Backstage</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md font-bold mb-2">Description</label>
                <input type="text" className="w-full p-3 border border-outline rounded-xl" placeholder="Optional details..." value={newZone.description} onChange={e => setNewZone({...newZone, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-outline-variant/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-outline text-primary focus:ring-primary" checked={newZone.requires_qr} onChange={e => setNewZone({...newZone, requires_qr: e.target.checked})} />
                  <span className="font-bold">QR Required</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-outline text-primary focus:ring-primary" checked={newZone.allow_reentry} onChange={e => setNewZone({...newZone, allow_reentry: e.target.checked})} />
                  <span className="font-bold">Allow Re-entry</span>
                </label>
              </div>

              {newZone.zone_type === 'Food Court' && (
                <div className="p-4 bg-surface-container rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-bold mb-2">Allocation Quantity</label>
                    <input type="number" min="1" className="w-full p-3 border border-outline rounded-xl" placeholder="e.g. 2" value={newZone.entitlement_limit} onChange={e => setNewZone({...newZone, entitlement_limit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold mb-2">Allocation Unit</label>
                    <input type="text" className="w-full p-3 border border-outline rounded-xl" placeholder="e.g. Meals" value={newZone.entitlement_unit} onChange={e => setNewZone({...newZone, entitlement_unit: e.target.value})} />
                  </div>
                </div>
              )}

              {newZone.zone_type === 'Walkathon Checkpoint' && (
                <div className="p-4 bg-surface-container rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-label-md font-bold mb-2">Type</label>
                    <select className="w-full p-3 border border-outline rounded-xl" value={newZone.checkpoint_type} onChange={e => setNewZone({...newZone, checkpoint_type: e.target.value})}>
                      <option value="START">START</option>
                      <option value="CHECKPOINT">CHECKPOINT</option>
                      <option value="FINISH">FINISH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-md font-bold mb-2">Distance (KM)</label>
                    <input type="number" min="0" step="0.1" className="w-full p-3 border border-outline rounded-xl" placeholder="e.g. 3" value={newZone.distance_km} onChange={e => setNewZone({...newZone, distance_km: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-label-md font-bold mb-2">Sequence</label>
                    <input type="number" min="1" className="w-full p-3 border border-outline rounded-xl" placeholder="e.g. 2" value={newZone.sequence} onChange={e => setNewZone({...newZone, sequence: e.target.value})} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsAddZoneModalOpen(false)} className="px-6 py-2 font-bold text-on-surface hover:bg-surface-container rounded-full">Cancel</button>
              <button onClick={handleCreateZone} disabled={!newZone.name} className="px-6 py-2 font-bold bg-primary text-on-primary rounded-full disabled:opacity-50">Create Zone</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
