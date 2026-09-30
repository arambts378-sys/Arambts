"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

interface QRScannerProps {
  eventId: string;
  accessZoneId: string;
  onScanResult: (result: ScanLog) => void;
  disabled?: boolean;
  scannerToken?: string | null;
}

export type ScanResultState = 'idle' | 'starting' | 'ready' | 'validating' | 'allowed' | 'denied' | 'camera_error' | 'network_error';

export interface ScanLog {
  id: string;
  timestamp: string;
  result: 'allowed' | 'denied';
  reason: string | null;
  message: string;
}

// Module-level lock for Strict Mode mount/unmount sequencing
let globalScannerCleanupPromise: Promise<void> | null = null;

export default function QRScanner({ eventId, accessZoneId, onScanResult, disabled, scannerToken }: QRScannerProps) {
  const containerId = "qr-reader";
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isRunningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const activeStartPromiseRef = useRef<Promise<void> | null>(null);

  const [status, setStatus] = useState<ScanResultState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<{ result: string, message: string, reason?: string | null } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const startScanner = async (cameraId?: string) => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    
    // 1. Prevent duplicate starts synchronously
    if (isStartingRef.current || isStoppingRef.current) return;
    isStartingRef.current = true;
    
    const doStart = async () => {
      try {
        setStatus('starting');

        // Stop if currently running
        if (isRunningRef.current || scanner.isScanning) {
          try {
            await scanner.stop();
          } catch (e) {
            console.warn("Failed to stop scanner before restart", e);
          }
          isRunningRef.current = false;
        }

        const config: Html5QrcodeCameraScanConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        const targetCamera = cameraId ? cameraId : { facingMode: "environment" };

        await scanner.start(
          targetCamera,
          config,
          onScanSuccess,
          undefined
        );
        
        isRunningRef.current = true;
        if (cameraId) setActiveCameraId(cameraId);
        setStatus('ready');
        setErrorMessage(null);
        setCurrentResult(null);
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setStatus('camera_error');
        setErrorMessage(err.message || 'Failed to start camera.');
        isRunningRef.current = false;
      } finally {
        isStartingRef.current = false;
      }
    };

    activeStartPromiseRef.current = doStart();
    await activeStartPromiseRef.current;
  };

  // Initialize Scanner and fetch cameras
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      // Wait for any previous Strict Mode unmount to finish completely
      while (globalScannerCleanupPromise) {
        await globalScannerCleanupPromise;
      }
      if (!isMounted) return;

      const scanner = new Html5Qrcode(containerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      scannerRef.current = scanner;

      try {
        setStatus('starting');
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          await startScanner(devices[0].id);
        } else {
          setStatus('camera_error');
          setErrorMessage('No cameras found on this device.');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('camera_error');
          setErrorMessage(err.message || 'Camera permission denied or unavailable.');
        }
      }
    };

    const mountPromise = init();

    return () => {
      isMounted = false;
      isStoppingRef.current = true;
      
      let resolveCleanup: () => void;
      globalScannerCleanupPromise = new Promise((resolve) => { resolveCleanup = resolve; });

      const cleanup = async () => {
        try {
          // Wait for initialization to finish
          await mountPromise;
          
          // Wait for any active start() to resolve
          if (activeStartPromiseRef.current) {
            await activeStartPromiseRef.current;
          }

          const scanner = scannerRef.current;
          if (scanner) {
            // MUST await stop() before clear()
            if (isRunningRef.current || scanner.isScanning) {
              try {
                await scanner.stop();
              } catch (e) {
                console.warn("Error stopping scanner during cleanup", e);
              }
              isRunningRef.current = false;
            }
            try {
              scanner.clear();
            } catch (e) {
              console.warn("Error clearing scanner during cleanup", e);
            }
          }
        } catch (e) {
          console.error("Cleanup sequence error:", e);
        } finally {
          scannerRef.current = null;
          isStoppingRef.current = false;
          
          // Release lock for next mount
          globalScannerCleanupPromise = null;
          resolveCleanup();
        }
      };

      cleanup();
    };
  }, []);

  // Handle disabled state changes
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || isStoppingRef.current) return;
    
    if (disabled) {
      if (scanner.getState() === 2) { // SCANNING
        try { scanner.pause(); } catch(e) {}
      }
    } else {
      if (scanner.getState() === 3) { // PAUSED
        try { scanner.resume(); } catch(e) {}
      } else if (!isRunningRef.current && !isStartingRef.current && activeCameraId && status !== 'camera_error' && status !== 'starting') {
        startScanner(activeCameraId);
      }
    }
  }, [disabled, activeCameraId, status]);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing || disabled || isStoppingRef.current) return;
    setIsProcessing(true);
    setStatus('validating');

    const scanner = scannerRef.current;
    if (scanner && scanner.getState() === 2) {
      try { scanner.pause(); } catch(e) {}
    }

    try {
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: decodedText, accessZoneId, scannerToken })
      });

      const data = await res.json();
      
      if (!res.ok && res.status >= 500) {
        throw new Error('Server error');
      }

      setStatus(data.result === 'allowed' ? 'allowed' : 'denied');
      setCurrentResult({
        result: data.result,
        reason: data.reason,
        message: data.message || 'Check-in processed'
      });

      onScanResult({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        result: data.result,
        reason: data.reason,
        message: data.message
      });

    } catch (err: any) {
      setStatus('network_error');
      setCurrentResult({
        result: 'denied',
        message: 'Connection unavailable. Check-in requires a live connection.'
      });
    }

    setTimeout(() => {
      if (isStoppingRef.current) return;
      setIsProcessing(false);
      setCurrentResult(null);
      setStatus('ready');
      if (scannerRef.current && scannerRef.current.getState() === 3) {
        try { scannerRef.current.resume(); } catch(e) {}
      }
    }, 2500);
  };

  const switchCamera = () => {
    if (cameras.length > 1 && !isStartingRef.current && !isStoppingRef.current) {
      const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      startScanner(cameras[nextIndex].id);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      
      {/* Status Header */}
      <div className="w-full text-center mb-4 min-h-[2rem]">
        {status === 'starting' && <p className="text-on-surface-variant font-medium">Starting camera...</p>}
        {status === 'ready' && (
          <div className="flex items-center justify-center gap-2 text-primary font-bold">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Scanner Ready
          </div>
        )}
        {status === 'validating' && (
          <div className="flex items-center justify-center gap-2 text-on-surface font-bold">
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            Validating...
          </div>
        )}
        {status === 'camera_error' && (
          <p className="text-error font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {errorMessage}
          </p>
        )}
        {status === 'network_error' && (
          <p className="text-error font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">wifi_off</span>
            Connection Unavailable
          </p>
        )}
      </div>

      {/* Camera Viewfinder */}
      <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 flex items-center justify-center">
        
        {/* The actual video target */}
        <div 
          id={containerId} 
          className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover"
        ></div>

        {/* Overlay States */}
        {status === 'allowed' && currentResult && (
          <div className="absolute inset-0 bg-green-700/90 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">check_circle</span>
            <h2 className="text-display-sm font-bold uppercase mb-2">CHECK-IN SUCCESSFUL</h2>
            <p className="text-body-lg opacity-90">{currentResult.message}</p>
          </div>
        )}

        {status === 'denied' && currentResult && (
          <div className="absolute inset-0 bg-error/90 z-20 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[64px] mb-2">cancel</span>
            <h2 className="text-title-lg font-bold uppercase mb-2">CHECK-IN DENIED</h2>
            <p className="text-body-lg opacity-90">{currentResult.message}</p>
          </div>
        )}

      </div>

      {/* Camera Controls */}
      {cameras.length > 1 && status !== 'camera_error' && (
        <button 
          onClick={switchCamera}
          className="mt-6 flex items-center gap-2 text-primary font-medium hover:bg-primary-container px-4 py-2 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">flip_camera_ios</span>
          Switch Camera
        </button>
      )}

      {status === 'camera_error' && (
        <button 
          onClick={() => startScanner()}
          className="mt-6 flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
          Retry Camera
        </button>
      )}

    </div>
  );
}

