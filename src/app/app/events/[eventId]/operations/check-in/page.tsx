"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

// Disable SSR for QRScanner since it requires window/navigator APIs
const QRScanner = dynamic(() => import('@/components/check-in/QRScanner'), { ssr: false });

export default function CheckInOperationsPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();
  const router = useRouter();

  const [zones, setZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    if (!isHydrated || !eventId) return;

    const loadData = async () => {
      const supabase = createClient();
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        setAuthError('User not authenticated.');
        setLoading(false);
        return;
      }

      // Load all active access zones for this event
      const { data: zonesData, error: zonesError } = await supabase
        .from('access_zones')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('name');

      if (zonesError) {
        setAuthError('Could not load checkpoints or you do not have permission.');
        setLoading(false);
        return;
      }

      setZones(zonesData || []);

      if (zonesData && zonesData.length === 1) {
        setSelectedZoneId(zonesData[0].id);
      } else if (zonesData && zonesData.length > 0) {
        setSelectedZoneId(zonesData[0].id); // default to first
      }

      setLoading(false);
    };

    loadData();
  }, [isHydrated, eventId]);

  const handleScanResult = (result: any) => {
    setRecentScans(prev => {
      const newScans = [result, ...prev];
      return newScans.slice(0, 10); // Keep only last 10 scans
    });
  };

  if (!isHydrated || loading) return <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-medium">Loading...</div>;
  const event = getEvent(eventId);
  if (!event) return <div className="min-h-screen flex items-center justify-center text-error font-medium">Event not found</div>;

  const activeZoneName = zones.find(z => z.id === selectedZoneId)?.name || '';

  return (
    <div className="min-h-[100dvh] bg-surface-container-lowest flex flex-col font-sans">
      
      {/* Mobile-First Header */}
      <header className="h-14 border-b border-outline-variant/60 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <button 
          onClick={() => router.push(`/app/events/${eventId}`)}
          className="text-primary hover:bg-primary-container p-2 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex-1 text-center truncate px-4">
          <h1 className="font-bold text-title-md text-on-surface truncate uppercase tracking-wide">{event.name}</h1>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center w-full pb-8">
        
        {authError ? (
          <div className="p-6 m-4 mt-8 bg-error-container text-on-error-container rounded-2xl text-center">
            <span className="material-symbols-outlined text-[48px] mb-2">lock</span>
            <p className="font-bold">{authError}</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="p-6 m-4 mt-8 bg-surface-container text-on-surface-variant rounded-2xl text-center">
            <span className="material-symbols-outlined text-[48px] mb-2">event_busy</span>
            <p className="font-bold">No checkpoints have been assigned to you.</p>
          </div>
        ) : (
          <div className="w-full max-w-lg mx-auto flex flex-col">
            
            {/* Zone Selector */}
            <div className="bg-white p-4 border-b border-outline-variant/30 flex flex-col items-center">
              {zones.length === 1 ? (
                <div className="text-center">
                  <p className="text-label-sm font-bold text-primary uppercase tracking-wider mb-1">Current Checkpoint</p>
                  <h2 className="text-headline-sm font-bold text-on-surface">{activeZoneName}</h2>
                </div>
              ) : (
                <div className="w-full">
                  <label className="block text-label-sm font-bold text-primary uppercase tracking-wider text-center mb-2">
                    Select Checkpoint
                  </label>
                  <select 
                    value={selectedZoneId || ''}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full p-3 bg-surface-container-lowest border border-outline rounded-xl text-title-md font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-center"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scanner Area */}
            <div className="p-4 flex-1 flex flex-col">
              {selectedZoneId && (
                <QRScanner 
                  eventId={eventId} 
                  accessZoneId={selectedZoneId} 
                  onScanResult={handleScanResult} 
                />
              )}
            </div>

            {/* Recent Scans */}
            <div className="px-4 mt-6">
              <h3 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant/40 pb-2">
                Recent Scans
              </h3>
              <div className="space-y-3">
                {recentScans.length === 0 ? (
                  <p className="text-body-sm text-center text-on-surface-variant italic py-4">No recent activity</p>
                ) : (
                  recentScans.map((scan) => (
                    <div 
                      key={scan.id} 
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        scan.result === 'allowed' 
                          ? 'bg-green-50 border-green-200 text-green-900' 
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <span className={`material-symbols-outlined mt-0.5 ${scan.result === 'allowed' ? 'text-green-600' : 'text-red-600'}`}>
                        {scan.result === 'allowed' ? 'check_circle' : 'cancel'}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-body-md leading-tight">
                          {scan.result === 'allowed' ? 'Allowed' : 'Denied'}
                        </p>
                        <p className="text-body-sm mt-0.5 opacity-90">{scan.message || scan.reason}</p>
                      </div>
                      <span className="text-label-sm font-medium opacity-70 mt-1 whitespace-nowrap">
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
