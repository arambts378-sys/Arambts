"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function CertificateClient() {
  const [step, setStep] = useState<'SCAN_QR' | 'FORM' | 'GENERATING' | 'SUCCESS'>('SCAN_QR');
  const [token, setToken] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [certUrl, setCertUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', email: '' });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanning = useRef(false);

  useEffect(() => {
    if (step === 'SCAN_QR') {
      let mounted = true;
      let scanner: Html5Qrcode | null = null;

      const initScanner = async () => {
        try {
          // Check cameras first
          const devices = await Html5Qrcode.getCameras();
          if (!mounted) return;

          if (devices && devices.length > 0) {
            // Ensure container is empty before creating a new scanner
            const container = document.getElementById("cert-qr-reader");
            if (container) container.innerHTML = '';

            scanner = new Html5Qrcode("cert-qr-reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
            scannerRef.current = scanner;

            await scanner.start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              handleScan,
              undefined
            );

            // If unmounted while starting, stop it immediately
            if (!mounted) {
              await scanner.stop();
              scanner.clear();
            } else {
              isScanning.current = true;
            }
          } else {
            setError('No camera found on this device.');
          }
        } catch (err: any) {
          if (mounted) {
            setError('Camera permission denied or unavailable.');
          }
        }
      };
      
      initScanner();

      return () => {
        mounted = false;
        if (scanner && scanner.isScanning) {
          scanner.stop().then(() => {
            scanner?.clear();
          }).catch(console.error);
        }
      };
    }
  }, [step]);

  const handleScan = async (decodedText: string) => {
    if (step !== 'SCAN_QR') return;
    
    // Stop scanning to prevent multiple requests
    if (scannerRef.current && isScanning.current) {
      try {
        await scannerRef.current.stop();
        isScanning.current = false;
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/certificates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: decodedText })
      });
      const data = await res.json();
      
      if (data.success) {
        setToken(decodedText);
        setDistance(data.distance);
        setStep('FORM');
        setError(null);
      } else {
        setError(data.error || 'Invalid QR code');
        // Restart scanning if error? For now, require manual refresh for simplicity and to avoid spam.
      }
    } catch (err) {
      setError('Network error validating QR.');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('GENERATING');
    setError(null);

    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: formData.name, email: formData.email })
      });
      const data = await res.json();

      if (data.success) {
        setCertUrl(data.certificate_url);
        setStep('SUCCESS');
      } else {
        setError(data.error || 'Failed to generate certificate.');
        setStep('FORM');
      }
    } catch (err) {
      setError('Network error generating certificate.');
      setStep('FORM');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-outline-variant/30 p-8 flex flex-col items-center text-center">
        
        <div className="mb-6">
          <h1 className="text-2xl font-black text-primary uppercase tracking-wider">ARAM BTS</h1>
          <h2 className="text-lg font-bold text-on-surface-variant">Get Your Certificate</h2>
        </div>

        {error && (
          <div className="mb-6 w-full p-4 bg-error-container text-on-error-container rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {step === 'SCAN_QR' && (
          <div className="w-full flex flex-col items-center">
            <p className="mb-4 text-on-surface-variant text-sm font-medium">Scan the official certificate QR code to continue.</p>
            {/* Removed aspect-square to let video determine height, preventing cropping and aspect ratio distortion */}
            <div id="cert-qr-reader" className="w-full bg-black rounded-2xl overflow-hidden shadow-inner [&_video]:w-full [&_video]:h-auto"></div>
          </div>
        )}

        {step === 'FORM' && (
          <form onSubmit={handleGenerate} className="w-full flex flex-col gap-4 text-left">
            <div className="p-4 bg-primary/10 rounded-xl mb-2 border border-primary/20 text-center">
              <h3 className="text-xl font-bold text-primary">{distance} WALKATHON</h3>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-widest mt-1">Certificate</p>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-on-surface-variant">Full Name *</label>
              <input 
                type="text" 
                required
                maxLength={100}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-on-surface-variant">Email Address *</label>
              <input 
                type="email" 
                required
                maxLength={150}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <button type="submit" className="mt-4 w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">
              GENERATE CERTIFICATE
            </button>
          </form>
        )}

        {step === 'GENERATING' && (
          <div className="w-full flex flex-col items-center py-8 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-on-surface-variant">Generating certificate...</p>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl">check</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-on-surface">CERTIFICATE READY</h2>
              <p className="text-sm text-on-surface-variant mt-2">Certificate generated successfully.</p>
            </div>
            
            <a 
              href={certUrl!} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md text-center"
            >
              DOWNLOAD CERTIFICATE
            </a>
            
            <p className="text-xs text-on-surface-variant bg-surface-variant/50 p-4 rounded-xl">
              Your certificate is ready for download. It will also be sent to <strong>{formData.email}</strong>. Email delivery may take a few minutes.
            </p>
            
            <button 
              onClick={() => {
                setFormData({ name: '', email: '' });
                setStep('SCAN_QR');
                setToken('');
              }}
              className="mt-4 text-sm font-bold text-primary hover:underline"
            >
              Generate another
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
