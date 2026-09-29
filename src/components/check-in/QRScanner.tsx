"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from 'html5-qrcode';

interface QRScannerProps {
  eventId: string;
  accessZoneId: string;
  onScanResult: (result: ScanLog) => void;
  disabled?: boolean;
  accessToken?: string;
}

export type ScanResultState = 'idle' | 'starting' | 'ready' | 'validating' | 'allowed' | 'denied' | 'camera_error' | 'network_error';

export interface ScanLog {
  id: string;
  timestamp: string;
  result: 'allowed' | 'denied';
  reason: string | null;
  message: string;
}

export default function QRScanner({ eventId, accessZoneId, onScanResult, disabled, accessToken }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  const [status, setStatus] = useState<ScanResultState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<{ result: string, message: string, reason?: string | null } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Scanner and fetch cameras
  useEffect(() => {
    let isMounted = true;
    
    const initCamera = async () => {
      try {
        setStatus('starting');
        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Prefer back camera if available (usually index 1, or by facingMode)
            // html5-qrcode doesn't expose facingMode directly here always, but we'll try 'environment' first
            startScanner(devices[0].id); // default to first if no environment fallback 
          } else {
            setStatus('camera_error');
            setErrorMessage('No cameras found on this device.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('camera_error');
          setErrorMessage(err.message || 'Camera permission denied or unavailable.');
        }
      }
    };

    const scanner = new Html5Qrcode(containerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
    scannerRef.current = scanner;

    initCamera();

    return () => {
      isMounted = false;
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
      scanner.clear();
    };
  }, []);

  // Handle disabled state changes
  useEffect(() => {
    if (!scannerRef.current) return;
    
    if (disabled) {
      if (scannerRef.current.getState() === 2) { // 2 = SCANNING
        scannerRef.current.pause(); // pause is safer for quick toggles
      }
    } else {
      if (scannerRef.current.getState() === 3) { // 3 = PAUSED
        scannerRef.current.resume();
      } else if (!scannerRef.current.isScanning && activeCameraId && status !== 'camera_error') {
        startScanner(activeCameraId);
      }
    }
  }, [disabled, activeCameraId, status]);

  const startScanner = async (cameraId?: string) => {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      
      const config: Html5QrcodeCameraScanConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      const targetCamera = cameraId 
        ? cameraId 
        : { facingMode: "environment" };

      await scannerRef.current.start(
        targetCamera,
        config,
        onScanSuccess,
        undefined // ignore individual frame failures
      );
      
      if (cameraId) setActiveCameraId(cameraId);
      setStatus('ready');
      setErrorMessage(null);
      setCurrentResult(null);
    } catch (err: any) {
      console.error(err);
      setStatus('camera_error');
      setErrorMessage(err.message || 'Failed to start camera.');
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing || disabled) return;
    setIsProcessing(true);
    setStatus('validating');

    // Pause camera scanning but keep preview
    if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 = SCANNING
      scannerRef.current.pause();
    }

    try {
      const res = await fetch(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: decodedText, accessZoneId, accessToken })
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

      // Pass result up
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

    // Wait a short delay, then resume scanner
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentResult(null);
      setStatus('ready');
      if (scannerRef.current && scannerRef.current.getState() === 3) { // 3 = PAUSED
        scannerRef.current.resume();
      }
    }, 2500);
  };

  const switchCamera = () => {
    if (cameras.length > 1) {
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
