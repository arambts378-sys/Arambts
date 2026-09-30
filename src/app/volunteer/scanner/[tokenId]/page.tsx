'use client';

import { useState, useEffect, use } from 'react';
import QRScanner from '@/components/check-in/QRScanner';

export default function VolunteerScannerPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  useEffect(() => {
    fetchSessionInfo();
  }, [tokenId]);

  const fetchSessionInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/scanner-sessions/${tokenId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired scanner link');
      }
      
      setSessionInfo(data);
      if (data.allowedZones?.length > 0) {
        setSelectedZoneId(data.allowedZones[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-on-surface-variant font-medium">Validating scanner access...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
        <div className="max-w-md w-full bg-error-container text-error p-8 rounded-3xl text-center space-y-4">
          <span className="material-symbols-outlined text-4xl">gpp_bad</span>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-surface-variant/30 px-6 py-4 flex flex-col gap-2 border-b border-outline-variant/30">
        <h1 className="text-xl font-bold">ARAM BTS Scanner</h1>
        <div className="flex flex-col text-sm text-on-surface-variant gap-1">
          <p>Event: <span className="font-semibold text-on-surface">{sessionInfo.event.name}</span></p>
          <p>Access Scope: <span className="font-semibold text-on-surface">
            {sessionInfo.allowedDistanceCategories?.length > 0 
              ? sessionInfo.allowedDistanceCategories.map((d: any) => d.name).join(', ')
              : 'All Participants'}
          </span></p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full gap-6">
        
        {/* Zone Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant">Current Zone</label>
          <select 
            className="w-full bg-surface-variant text-on-surface border-none rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary font-medium"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
          >
            <option value="" disabled>Select a zone</option>
            {sessionInfo.allowedZones.map((z: any) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>

        {/* Scanner Component handles camera, check-in fetch, and result overlays automatically */}
        <div className="mt-4">
          {selectedZoneId ? (
            <QRScanner 
              eventId={sessionInfo.event.id}
              accessZoneId={selectedZoneId}
              scannerToken={tokenId}
              onScanResult={(log) => {
                console.log('Scan log:', log);
              }}
            />
          ) : (
            <div className="text-center p-8 bg-surface-variant/30 rounded-2xl text-on-surface-variant border border-outline-variant/30 border-dashed">
              Please select a zone to start scanning.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
