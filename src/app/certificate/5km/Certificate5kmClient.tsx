"use client";

import React, { useState } from 'react';
import { getCertificate5kmSvg } from '@/lib/certificate/template5km';

export default function Certificate5kmClient() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const svgContent = getCertificate5kmSvg(formData.name);

  const handleAction = async (action: 'download' | 'email') => {
    if (!formData.name.trim()) {
      setMessage({ text: 'Please enter your name.', type: 'error' });
      return;
    }
    if (action === 'email' && !formData.email.trim()) {
      setMessage({ text: 'Please enter your email to send the certificate.', type: 'error' });
      return;
    }

    setStatus('LOADING');
    setMessage(null);

    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          email: formData.email, 
          action,
          certificateType: '5KM'
        })
      });

      if (!res.ok) {
        // If it's a JSON error response, try to parse it
        try {
          const errorData = await res.json();
          setMessage({ text: errorData.error || 'Failed to process request.', type: 'error' });
        } catch {
          setMessage({ text: 'Failed to process request.', type: 'error' });
        }
        return;
      }

      if (action === 'download') {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = objectUrl;
        
        const safeName = formData.name.trim().replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
        link.download = `ARAM-BTS-5KM-Certificate-${safeName}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        
        setMessage({ text: 'Certificate downloaded successfully!', type: 'success' });
      } else {
        const data = await res.json();
        if (data.success) {
          setMessage({ text: 'Certificate generated and queued for email delivery!', type: 'success' });
        } else {
          setMessage({ text: data.error || 'Failed to process request.', type: 'error' });
        }
      }
    } catch (err) {
      setMessage({ text: 'Network error. Please try again later.', type: 'error' });
    } finally {
      setStatus('IDLE');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-outline-variant/30 p-6 md:p-10 flex flex-col items-center">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-primary uppercase tracking-wider">ARAM BTS 5KM</h1>
          <h2 className="text-xl font-bold text-on-surface-variant mt-2">Your Certificate</h2>
        </div>

        {/* Live Preview */}
        <div className="w-full mb-10 border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm bg-gray-50 flex items-center justify-center p-2 md:p-6">
          <div 
            className="w-full max-w-3xl [&>svg]:block [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        </div>

        {message && (
          <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold text-center ${message.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-green-100 text-green-800'}`}>
            {message.text}
          </div>
        )}

        <form className="w-full max-w-md flex flex-col gap-5 text-left" onSubmit={(e) => e.preventDefault()}>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-on-surface-variant">Name on Certificate *</label>
            <input 
              type="text" 
              required
              maxLength={100}
              placeholder="e.g. Santhosh S"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-on-surface-variant">Email Address (Optional for download)</label>
            <input 
              type="email" 
              maxLength={150}
              placeholder="e.g. hello@example.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="button" 
              onClick={() => handleAction('download')}
              disabled={status === 'LOADING'}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {status === 'LOADING' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined">download</span>
              )}
              DOWNLOAD CERTIFICATE
            </button>

            <button 
              type="button" 
              onClick={() => handleAction('email')}
              disabled={status === 'LOADING'}
              className="w-full py-4 bg-surface-variant text-primary font-bold rounded-xl hover:bg-surface-variant/80 transition-all border border-primary/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">mail</span>
              SEND TO EMAIL
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
