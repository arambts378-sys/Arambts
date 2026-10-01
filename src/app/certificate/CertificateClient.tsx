"use client";

import React, { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

type CertType = 'none' | '3km' | '5km';

export default function CertificateClient() {
  const [selectedType, setSelectedType] = useState<CertType>('none');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS'>('IDLE');
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  // Allow URL parameter selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get('type');
    if (typeParam === '3km') setSelectedType('3km');
    if (typeParam === '5km') setSelectedType('5km');
  }, []);

  // Debounce the name so we don't bombard the server on every keystroke
  const [debouncedName] = useDebounce(formData.name, 500);

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
          certificateType: selectedType === '5km' ? '5KM' : 'standard'
        })
      });

      if (!res.ok) {
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
        const prefix = selectedType === '5km' ? 'ARAM-BTS-5KM-Certificate' : 'ARAM-BTS-Certificate';
        link.download = `${prefix}-${safeName}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
        
        setMessage({ text: 'Certificate downloaded successfully!', type: 'success' });
      } else {
        const data = await res.json();
        if (data.success) {
          setMessage({ text: data.message || 'Certificate sent to your email successfully!', type: 'success' });
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

  if (selectedType === 'none') {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center py-10 px-4 font-sans">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg border border-outline-variant/30 p-8 text-center flex flex-col items-center">
          <h1 className="text-3xl font-black text-primary uppercase tracking-wider mb-2">Certificate of Completion</h1>
          <h2 className="text-lg font-bold text-on-surface-variant mb-8">Select your walkathon category</h2>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={() => setSelectedType('3km')}
              className="w-full py-5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md text-xl"
            >
              [ 3 KM ]<br/><span className="text-sm font-medium opacity-90">3 KM Certificate</span>
            </button>
            <button
              onClick={() => setSelectedType('5km')}
              className="w-full py-5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-md text-xl"
            >
              [ 5 KM ]<br/><span className="text-sm font-medium opacity-90">5 KM Certificate</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-outline-variant/30 p-6 md:p-10 flex flex-col items-center">
        
        <div className="w-full flex justify-start mb-4">
          <button 
            onClick={() => { setSelectedType('none'); setMessage(null); setFormData({name: '', email: ''}); }}
            className="text-primary font-bold flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back
          </button>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-primary uppercase tracking-wider">
            {selectedType === '5km' ? 'ARAM BTS 5KM' : 'ARAM BTS'}
          </h1>
          <h2 className="text-xl font-bold text-on-surface-variant mt-2">Your Certificate</h2>
        </div>

        {/* Live Preview */}
        <div className="w-full mb-10 border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm bg-gray-50 flex items-center justify-center p-2 md:p-6 min-h-[300px]">
          {debouncedName.trim() === '' ? (
            <div className="text-gray-400 text-sm font-medium py-20 text-center">
              Enter your name below to generate preview
            </div>
          ) : (
            <img 
              src={`/api/certificates/preview?type=${selectedType === '5km' ? '5KM' : 'standard'}&name=${encodeURIComponent(debouncedName.trim())}`}
              alt="Certificate Preview"
              className="w-full max-w-3xl h-auto drop-shadow-sm rounded"
              style={{ aspectRatio: '3367/2381' }}
            />
          )}
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
