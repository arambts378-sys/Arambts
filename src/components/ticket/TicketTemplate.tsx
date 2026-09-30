"use client";

import React, { useRef, useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import html2canvas from 'html2canvas';

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
      
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      
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
        className="w-full border rounded-2xl overflow-hidden shadow-sm relative flex flex-col print:block print:w-[400px] print:mx-auto print:border-2"
        style={{ width: '400px', backgroundColor: '#ffffff', borderColor: '#dac0c4', color: '#1c1c19' }}
      >
        {/* Ticket Header / Event Branding */}
        <div 
          className="px-6 py-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(to right, #5c0427, #802442)', color: '#ffffff' }}
        >
          {/* Subtle background pattern for branding */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <h4 className="text-sm font-bold tracking-widest uppercase mb-1 z-10" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>ARAM BTS</h4>
          <h2 className="text-2xl font-black z-10 leading-tight" style={{ color: '#ffffff' }}>{event?.name || 'Event Ticket'}</h2>
        </div>

        {/* Ticket Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Attendee Info */}
          <div className="flex flex-col gap-1 border-b pb-4" style={{ borderColor: '#dac0c4' }}>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#887275' }}>Attendee</span>
            <span className="text-lg font-bold leading-tight" style={{ color: '#1c1c19' }}>{fullName}</span>
            {attendee.email && (
              <span className="text-sm" style={{ color: '#554245' }}>{attendee.email}</span>
            )}
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4 border-b pb-4" style={{ borderColor: '#dac0c4' }}>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#887275' }}>Date</span>
              <span className="text-sm font-semibold" style={{ color: '#1c1c19' }}>{eventDate}</span>
              <span className="text-xs" style={{ color: '#554245' }}>{eventTime}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#887275' }}>Venue</span>
              <span className="text-sm font-semibold" style={{ color: '#1c1c19' }}>{venue}</span>
            </div>

            {isWalkathon && distanceCategory && (
              <div className="flex flex-col gap-1 col-span-2 p-3 rounded-xl border" style={{ backgroundColor: 'rgba(92, 4, 39, 0.05)', borderColor: 'rgba(92, 4, 39, 0.2)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5c0427' }}>Distance</span>
                <span className="text-lg font-black" style={{ color: '#1c1c19' }}>{distanceCategory.name}</span>
              </div>
            )}
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <div className="p-3 border rounded-xl shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#dac0c4' }}>
              {rawToken ? (
                qrDataUrl ? (
                  <img src={qrDataUrl} width={140} height={140} alt="QR Code" onLoad={() => setQrLoaded(true)} />
                ) : (
                  <div className="w-[140px] h-[140px] flex items-center justify-center">
                    <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                  </div>
                )
              ) : (
                <div className="w-[140px] h-[140px] flex items-center justify-center rounded-lg" style={{ backgroundColor: '#f1ede8', color: '#887275' }}>
                  <span className="material-symbols-outlined text-4xl">qr_code_2</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <span className="text-xs" style={{ color: '#554245' }}>Registration #</span>
              <p className="font-mono font-bold" style={{ color: '#1c1c19' }}>{registrationNumber}</p>
            </div>
          </div>
          
        </div>
        
        {/* Ticket Footer */}
        <div className="px-6 py-4 text-center border-t mt-auto" style={{ backgroundColor: '#f7f3ee', borderColor: '#dac0c4' }}>
          <p className="text-xs font-semibold flex items-center justify-center gap-1.5" style={{ color: '#554245' }}>
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Present this ticket at the event entrance
          </p>
        </div>
      </div>

      {downloadError && (
        <div className="mt-4 p-3 rounded-lg text-sm text-center print:hidden" style={{ backgroundColor: 'rgba(255, 218, 214, 0.2)', color: '#ba1a1a' }}>
          {downloadError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-[400px] print:hidden">
        <button 
          onClick={handleDownload}
          disabled={isDownloading || !rawToken || !qrLoaded}
          className="flex-1 py-3.5 font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ backgroundColor: '#5c0427', color: '#ffffff' }}
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
          className="flex-1 py-3.5 font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ backgroundColor: '#e6e2dd', color: '#1c1c19' }}
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print / Save Ticket
        </button>
      </div>
    </div>
  );
}
