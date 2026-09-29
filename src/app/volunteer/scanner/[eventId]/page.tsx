'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QRScanner = dynamic(() => import('@/components/check-in/QRScanner'), { ssr: false });

export default function VolunteerScannerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user's assigned zones for this event
    fetch('/api/volunteer/me')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load assignments');
        return res.json();
      })
      .then(data => {
        const assignment = data.find((a: any) => a.event_id === eventId);
        if (!assignment) {
          throw new Error('You do not have an active assignment for this event.');
        }
        if (assignment.zones && assignment.zones.length > 0) {
          setZones(assignment.zones);
          setSelectedZone(assignment.zones[0].zone_id);
        } else {
          setError('No zones assigned. You cannot scan anything yet.');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  const handleScanResult = (result: any) => {
    setLogs(prev => [result, ...prev].slice(0, 5)); // Keep last 5 logs
  };

  if (loading) return <div className="p-8">Loading scanner...</div>;
  
  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto mt-12 bg-error-container text-error rounded-3xl text-center">
        <span className="material-symbols-outlined text-[48px] mb-4">error</span>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>{error}</p>
        <button 
          onClick={() => router.push('/volunteer')}
          className="mt-6 bg-surface text-on-surface px-6 py-2 rounded-full font-bold w-full"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-surface text-on-surface">
      <div className="p-4 bg-surface-variant flex gap-2 overflow-x-auto border-b">
        {zones.map(z => (
          <button
            key={z.zone_id}
            onClick={() => setSelectedZone(z.zone_id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-colors ${
              selectedZone === z.zone_id 
                ? 'bg-primary text-white' 
                : 'bg-surface text-on-surface hover:bg-surface-variant'
            }`}
          >
            {z.access_zones?.name}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col p-4">
        {selectedZone ? (
          <QRScanner 
            eventId={eventId} 
            accessZoneId={selectedZone} 
            onScanResult={handleScanResult}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant">
            Please select a zone above to begin scanning.
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-sm text-on-surface-variant uppercase tracking-wider mb-2">Recent Scans</h3>
            <div className="space-y-2">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    log.result === 'allowed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <span className={`font-bold ${log.result === 'allowed' ? 'text-green-700' : 'text-red-700'}`}>
                    {log.result.toUpperCase()}
                  </span>
                  <span className="text-sm opacity-80">{log.message || log.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
