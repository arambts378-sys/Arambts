"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

export default function AnalyticsPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!isHydrated || !eventId) return;
    
    const event = getEvent(eventId);
    if (!event) return;

    if (event.type !== 'Walkathon') {
      setLoading(false);
      return;
    }

    const loadWalkathonStats = async () => {
      const supabase = createClient();
      
      // Fetch distance categories
      const { data: categories } = await supabase
        .from('walkathon_distance_categories')
        .select('*')
        .eq('event_id', eventId);
        
      // Fetch registrations with distance category
      const { data: registrations } = await supabase
        .from('registrations')
        .select('id, distance_category_id, status')
        .eq('event_id', eventId)
        .in('status', ['confirmed']);
        
      // Fetch check_ins joined with zones
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select(`
          id, registration_id, result, 
          access_zones ( checkpoint_type, distance_km, sequence )
        `)
        .eq('event_id', eventId)
        .eq('result', 'allowed');

      if (!categories || !registrations || !checkIns) {
        setLoading(false);
        return;
      }

      // Compute stats
      const totalRegistered = registrations.length;
      
      const byCategory: Record<string, { name: string, count: number }> = {};
      categories.forEach(c => {
        byCategory[c.id] = { name: c.name, count: 0 };
      });
      
      registrations.forEach(r => {
        if (r.distance_category_id && byCategory[r.distance_category_id]) {
          byCategory[r.distance_category_id].count++;
        }
      });
      
      // Compute Progress
      const progressByReg: Record<string, { started: boolean, reachedCheckpoints: Set<number>, finished: boolean }> = {};
      
      registrations.forEach(r => {
        progressByReg[r.id] = { started: false, reachedCheckpoints: new Set(), finished: false };
      });

      checkIns.forEach(ci => {
        if (!progressByReg[ci.registration_id]) return;
        const zone = ci.access_zones as any;
        if (!zone) return;
        
        if (zone.checkpoint_type === 'START') {
          progressByReg[ci.registration_id].started = true;
        } else if (zone.checkpoint_type === 'FINISH') {
          progressByReg[ci.registration_id].finished = true;
        } else if (zone.checkpoint_type === 'CHECKPOINT' && zone.distance_km) {
          progressByReg[ci.registration_id].reachedCheckpoints.add(zone.distance_km);
        }
      });

      let started = 0;
      let finished = 0;
      let notStarted = 0;
      
      // Dynamic checkpoints counters
      const checkpointsHit: Record<number, number> = {};
      
      Object.values(progressByReg).forEach(p => {
        if (p.started) started++;
        else notStarted++;
        
        if (p.finished) finished++;
        
        p.reachedCheckpoints.forEach(km => {
          checkpointsHit[km] = (checkpointsHit[km] || 0) + 1;
        });
      });

      setStats({
        totalRegistered,
        byCategory: Object.values(byCategory),
        progress: {
          started,
          finished,
          notStarted,
          checkpointsHit
        }
      });
      
      setLoading(false);
    };

    loadWalkathonStats();
  }, [isHydrated, eventId, getEvent]);

  if (!isHydrated || loading) return <div className="p-10 text-center">Loading...</div>;
  const event = getEvent(eventId);
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  if (event.type !== 'Walkathon') {
    return (
      <div className="min-h-screen bg-surface-container-lowest p-8 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container py-1 px-3 rounded-full mb-4">
            <span className="font-semibold text-primary">{event.name}</span>
            <span>/</span>
            <span>Analytics</span>
          </div>
          
          <h1 className="text-4xl font-bold text-primary">Analytics</h1>
          <p className="text-on-surface-variant text-lg">Detailed analytics are only available for Walkathon events currently.</p>
          
          <div className="pt-8">
            <Link href={`/app/events/${eventId}`} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors">
              Back to Event Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/app/events/${eventId}`} className="text-primary hover:underline text-sm font-medium mb-2 inline-block">
            ← Back to Event Workspace
          </Link>
          <h1 className="text-headline-md font-bold text-on-surface uppercase tracking-tight">Walkathon Analytics</h1>
          <p className="text-body-lg text-on-surface-variant">Live progress and registration metrics derived from check-ins.</p>
        </div>
      </div>

      {stats && (
        <>
          <h2 className="text-title-lg font-bold mt-8 mb-4">Registrations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
              <p className="text-label-md uppercase font-bold text-on-surface-variant">Total Registered</p>
              <p className="text-display-sm font-bold text-primary mt-2">{stats.totalRegistered}</p>
            </div>
            {stats.byCategory.map((cat: any, i: number) => (
              <div key={i} className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
                <p className="text-label-md uppercase font-bold text-on-surface-variant">{cat.name} Participants</p>
                <p className="text-display-sm font-bold text-on-surface mt-2">{cat.count}</p>
              </div>
            ))}
          </div>

          <h2 className="text-title-lg font-bold mt-8 mb-4">Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
              <p className="text-label-md uppercase font-bold text-on-surface-variant">Started</p>
              <p className="text-display-sm font-bold text-green-600 mt-2">{stats.progress.started}</p>
            </div>
            
            {Object.entries(stats.progress.checkpointsHit)
              .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
              .map(([km, count]: any) => (
                <div key={km} className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
                  <p className="text-label-md uppercase font-bold text-on-surface-variant">Reached {km} KM</p>
                  <p className="text-display-sm font-bold text-blue-600 mt-2">{count}</p>
                </div>
            ))}

            <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
              <p className="text-label-md uppercase font-bold text-on-surface-variant">Finished</p>
              <p className="text-display-sm font-bold text-primary mt-2">{stats.progress.finished}</p>
            </div>

            <div className="bg-white border border-outline-variant p-6 rounded-2xl shadow-sm">
              <p className="text-label-md uppercase font-bold text-on-surface-variant">Not Started</p>
              <p className="text-display-sm font-bold text-on-surface-variant mt-2">{stats.progress.notStarted}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
