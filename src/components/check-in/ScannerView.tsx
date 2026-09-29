"use client";

import React, { useEffect, useState } from 'react';
import QRScanner, { ScanLog } from './QRScanner';
import Link from 'next/link';

interface ScannerViewProps {
  eventId: string;
  eventName: string;
  zoneId: string;
  zoneName: string;
  assignmentStartsAt: string | null;
  assignmentEndsAt: string | null;
  zoneStartsAt: string | null;
  zoneEndsAt: string | null;
}

export default function ScannerView({
  eventId,
  eventName,
  zoneId,
  zoneName,
  assignmentStartsAt,
  assignmentEndsAt,
  zoneStartsAt,
  zoneEndsAt
}: ScannerViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // We update local time every second for UX countdowns.
    // The backend uses server time and remains authoritative.
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate effective access window
  // effective_start = MAX(assignment.starts_at, zone.starts_at)
  // effective_end = MIN(assignment.ends_at, zone.ends_at)
  let effectiveStart: Date | null = null;
  let effectiveEnd: Date | null = null;

  const aStart = assignmentStartsAt ? new Date(assignmentStartsAt) : null;
  const zStart = zoneStartsAt ? new Date(zoneStartsAt) : null;
  if (aStart && zStart) effectiveStart = new Date(Math.max(aStart.getTime(), zStart.getTime()));
  else if (aStart) effectiveStart = aStart;
  else if (zStart) effectiveStart = zStart;

  const aEnd = assignmentEndsAt ? new Date(assignmentEndsAt) : null;
  const zEnd = zoneEndsAt ? new Date(zoneEndsAt) : null;
  if (aEnd && zEnd) effectiveEnd = new Date(Math.min(aEnd.getTime(), zEnd.getTime()));
  else if (aEnd) effectiveEnd = aEnd;
  else if (zEnd) effectiveEnd = zEnd;

  let state: 'BEFORE_OPEN' | 'OPEN' | 'CLOSED' = 'OPEN';
  
  if (effectiveStart && currentTime < effectiveStart) {
    state = 'BEFORE_OPEN';
  } else if (effectiveEnd && currentTime >= effectiveEnd) {
    state = 'CLOSED';
  }

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusDisplay = () => {
    if (state === 'BEFORE_OPEN') {
      return (
        <div className="bg-surface-variant text-on-surface-variant p-4 rounded-xl text-center mb-6">
          <p className="font-bold uppercase tracking-wider text-sm mb-1">Checkpoint closed</p>
          <p className="text-body-md" suppressHydrationWarning>
            Opens at {effectiveStart ? formatTime(effectiveStart) : 'TBD'}
          </p>
        </div>
      );
    }
    if (state === 'CLOSED') {
      return (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl text-center mb-6">
          <p className="font-bold uppercase tracking-wider text-sm mb-1">Checkpoint Closed</p>
          <p className="text-body-md" suppressHydrationWarning>
            Access ended at {effectiveEnd ? formatTime(effectiveEnd) : 'TBD'}
          </p>
        </div>
      );
    }
    return (
      <div className="bg-primary-container text-on-primary-container p-4 rounded-xl text-center mb-6">
        <p className="font-bold uppercase tracking-wider text-sm mb-1 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Scanner Active
        </p>
        {effectiveEnd && (
          <p className="text-body-sm opacity-90 mt-1" suppressHydrationWarning>
            Access ends at {formatTime(effectiveEnd)}
          </p>
        )}
      </div>
    );
  };

  const handleScanResult = (result: ScanLog) => {
    // Logging can be handled locally if needed, QRScanner handles UI overlays.
    console.log('Scanned:', result);
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-4 safe-top sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link href={`/check-in?event=${eventId}`} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <span className="material-symbols-outlined block">arrow_back</span>
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-title-md font-bold truncate leading-tight tracking-tight uppercase">{eventName}</h1>
            <p className="text-label-md text-white/80 uppercase font-medium">{zoneName}</p>
          </div>
          <div className="w-10"></div> {/* Spacer to center title */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col pt-6">
        
        {getStatusDisplay()}

        <div className={`transition-opacity duration-300 ${state !== 'OPEN' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <QRScanner 
            eventId={eventId}
            accessZoneId={zoneId}
            onScanResult={handleScanResult}
            disabled={state !== 'OPEN'}
          />
        </div>

        {state === 'BEFORE_OPEN' && (
          <div className="mt-8 text-center px-6">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-50 mb-4 block">hourglass_empty</span>
            <p className="text-body-lg text-on-surface-variant font-medium">Please wait for the checkpoint to open before scanning participants.</p>
          </div>
        )}

      </main>
    </div>
  );
}
