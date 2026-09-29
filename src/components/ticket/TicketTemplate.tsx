"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import { toPng } from 'html-to-image';

export interface TicketData {
  event: any;
  attendee: any;
  registration: any;
  walkathonParticipant?: any;
  qrImage?: string; // If rawToken isn't available, but we prefer rendering dynamically
  rawToken?: string;
  distanceCategory?: any; // The joined distance category object
}

interface TicketTemplateProps {
  data: TicketData;
  className?: string;
}

export function TicketTemplate({ data, className = '' }: TicketTemplateProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    event,
    attendee,
    registration,
    rawToken,
    distanceCategory
  } = data;

  useEffect(() => {
    if (rawToken) {
      QRCodeLib.toDataURL(rawToken, { width: 140, margin: 1, errorCorrectionLevel: 'H' })
        .then(url => setQrDataUrl(url))
        .catch(err => {
          console.error('Failed to generate QR:', err);
          setDownloadError("QR code generation failed.");
        });
    }
  }, [rawToken]);

  const isWalkathon = event?.type === 'Walkathon';
  
  // Try to use full name, fallback to first/last
  const fullName = attendee.full_name || `${attendee.firstName || attendee.first_name || ''} ${attendee.lastName || attendee.last_name || ''}`.trim();
  const eventDate = event?.date ? new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBA';
  const eventTime = event?.date ? new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Time TBA';
  const venue = event?.venue || 'Venue TBA';
  const registrationNumber = registration?.registrationNumber || registration?.registration_number || 'PENDING';

  const handleDownload = async () => {
    if (!ticketRef.current || isDownloading || !qrLoaded) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    try {
      // Ensure fonts are loaded before capturing
      await document.fonts.ready;
      
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: false
      });
      
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        throw new Error('Ticket image generation failed.');
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Ticket-${registrationNumber}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download ticket:', error);
      setDownloadError("Ticket download failed. Use Print / Save Ticket instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-lg mx-auto ${className}`}>
      
      {/* The Printable Ticket Card */}
      <div 
        ref={ticketRef}
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm relative flex flex-col print:block print:w-[400px] print:mx-auto print:border-2"
        style={{ width: '400px' }} // Fixed width for consistent image capture
      >
        {/* Ticket Header / Event Branding */}
        <div className="bg-gradient-to-r from-primary to-primary-variant px-6 py-6 text-white flex flex-col items-center justify-center text-center relative overflow-hidden print:!bg-primary print:!text-white print:-webkit-print-color-adjust-exact">
          {/* Subtle background pattern for branding */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <h4 className="text-sm font-bold tracking-widest text-white/80 uppercase mb-1 z-10">ARAM BTS</h4>
          <h2 className="text-2xl font-black z-10 leading-tight">{event?.name || 'Event Ticket'}</h2>
        </div>

        {/* Ticket Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Attendee Info */}
          <div className="flex flex-col gap-1 border-b border-outline-variant pb-4">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Attendee</span>
            <span className="text-lg font-bold text-on-surface leading-tight">{fullName}</span>
            {attendee.email && (
              <span className="text-sm text-on-surface-variant">{attendee.email}</span>
            )}
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4 border-b border-outline-variant pb-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Date</span>
              <span className="text-sm font-semibold text-on-surface">{eventDate}</span>
              <span className="text-xs text-on-surface-variant">{eventTime}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Venue</span>
              <span className="text-sm font-semibold text-on-surface">{venue}</span>
            </div>

            {isWalkathon && distanceCategory && (
              <div className="flex flex-col gap-1 col-span-2 bg-primary/5 p-3 rounded-xl border border-primary/20 print:bg-gray-100">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Distance</span>
                <span className="text-lg font-black text-on-surface">{distanceCategory.name}</span>
              </div>
            )}
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <div className="p-3 bg-white border border-outline-variant rounded-xl shadow-sm">
              {rawToken ? (
                qrDataUrl ? (
                  <img src={qrDataUrl} width={140} height={140} alt="QR Code" onLoad={() => setQrLoaded(true)} />
                ) : (
                  <div className="w-[140px] h-[140px] flex items-center justify-center">
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                  </div>
                )
              ) : (
                <div className="w-[140px] h-[140px] bg-surface-container flex items-center justify-center rounded-lg text-outline">
                  <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <span className="text-xs text-on-surface-variant">Registration #</span>
              <p className="font-mono font-bold text-on-surface">{registrationNumber}</p>
            </div>
          </div>
          
        </div>
        
        {/* Ticket Footer */}
        <div className="bg-surface-container-low px-6 py-4 text-center border-t border-outline-variant mt-auto print:bg-gray-50">
          <p className="text-xs font-semibold text-on-surface-variant flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Present this ticket at the event entrance
          </p>
        </div>
      </div>

      {downloadError && (
        <div className="mt-4 p-3 bg-error-container/20 text-error rounded-lg text-sm text-center print:hidden">
          {downloadError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-[400px] print:hidden">
        <button 
          onClick={handleDownload}
          disabled={isDownloading || !rawToken || !qrLoaded}
          className="flex-1 py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isDownloading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              Generating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">download</span>
              Download Ticket
            </>
          )}
        </button>

        <button 
          onClick={handlePrint}
          disabled={!rawToken || !qrLoaded}
          className="flex-1 py-3.5 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-surface-variant transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print / Save Ticket
        </button>
      </div>
    </div>
  );
}
