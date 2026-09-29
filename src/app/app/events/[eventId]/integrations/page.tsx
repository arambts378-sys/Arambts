"use client";
import { createClient } from '@/lib/supabase/client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { integrationsService, EventIntegration, IntegrationProvider } from '@/services/integrations';

export default function IntegrationsPage() {
  const routeParams = useParams();
  const eventId = routeParams?.eventId as string;
  const { getEvent, isHydrated } = useAppContext();

  const [integrations, setIntegrations] = useState<EventIntegration[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Sheet State
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [isSheetActive, setIsSheetActive] = useState(false);

  // Email State
  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '587',
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
    subject: '',
    customMessage: ''
  });
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isEmailActive, setIsEmailActive] = useState(false);

  useEffect(() => {
    if (!isHydrated || !eventId) return;

    const loadIntegrations = async () => {
      try {
        const data = await integrationsService.getEventIntegrations(eventId);
        setIntegrations(data);
        
        const supabase = createClient();
        const { data: jobsData, error: jobsError } = await supabase
          .from('integration_jobs')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (!jobsError) {
          setJobs(jobsData || []);
        }
        setLoadingJobs(false);

        const sheet = data.find(i => i.provider === 'google_sheets');
        if (sheet) {
          setIsSheetActive(sheet.is_active);
          setSheetWebhookUrl(sheet.config?.webhookUrl || '');
        }

        const email = data.find(i => i.provider === 'email');
        if (email) {
          setIsEmailActive(email.is_active);
          setEmailConfig({
            host: email.config?.host || '',
            port: email.config?.port || '587',
            user: email.config?.user || '',
            pass: '', // Never display the password
            fromName: email.config?.fromName || '',
            fromEmail: email.config?.fromEmail || '',
            subject: email.config?.subject || '',
            customMessage: email.config?.customMessage || ''
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load integrations');
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, [isHydrated, eventId]);

  if (!isHydrated) return null;
  const event = getEvent(eventId);
  if (!event) return <div className="p-10 text-center">Event not found</div>;

  const saveIntegration = async (provider: IntegrationProvider, config: any, isActive: boolean) => {
    try {
      setSaving(provider);
      setError(null);
      await integrationsService.saveIntegration(eventId, provider, config, isActive);
      // alert('Integration saved successfully');
    } catch (err: any) {
      setError(err.message || `Failed to save ${provider} integration`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSheet = (e: React.FormEvent) => {
    e.preventDefault();
    saveIntegration('google_sheets', { webhookUrl: sheetWebhookUrl }, isSheetActive);
  };

  const handleSaveEmail = async (e?: React.FormEvent, activeState?: boolean) => {
    if (e) e.preventDefault();
    try {
      setSaving('email');
      setError(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/events/${eventId}/integrations/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...emailConfig, active: activeState !== undefined ? activeState : isEmailActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save email configuration');
      
      setSuccessMsg('Email configuration saved successfully.');
      // Update UI with sanitized config
      setEmailConfig({
        ...emailConfig,
        host: data.host,
        port: data.port,
        user: data.user,
        pass: '', // Ensure password stays clear
        fromName: data.fromName,
        fromEmail: data.fromEmail,
        subject: data.subject,
        customMessage: data.customMessage
      });
      if (activeState !== undefined) setIsEmailActive(activeState);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await fetch(`/api/events/${eventId}/integrations/email/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...emailConfig, testEmail: testEmailAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Test failed');
      
      setSuccessMsg(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('integration_jobs')
      .update({
        status: 'pending',
        attempts: 0,
        last_error: null,
        next_attempt_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('event_id', eventId);

    if (error) {
      alert('Failed to retry job: ' + error.message);
    } else {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'pending', attempts: 0, next_attempt_at: new Date().toISOString() } : j));
      // Optional: wake up processor immediately
      integrationsService.triggerJobProcessor().catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-outline-variant/60 bg-white flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href={`/app/events/${eventId}`} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Event
          </Link>
          <div className="h-6 w-px bg-outline-variant/60"></div>
          <h1 className="font-bold text-title-lg text-primary">{event.name} <span className="text-on-surface-variant font-normal">/ Integrations</span></h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="mb-8">
            <h2 className="text-headline-md font-bold text-on-surface mb-2">Connect Your Tools</h2>
            <p className="text-body-lg text-on-surface-variant">
              Automatically sync registrations and send automated communications.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-green-100 text-green-800 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined">check_circle</span>
              <p className="font-medium">{successMsg}</p>
            </div>
          )}

          {/* Google Sheets Integration */}
          <div className="bg-white border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">table_chart</span>
                </div>
                <div>
                  <h3 className="text-title-lg font-bold">Google Sheets Sync</h3>
                  <p className="text-body-sm text-on-surface-variant">Automatically add new registrations to a spreadsheet.</p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isSheetActive} onChange={e => {
                    setIsSheetActive(e.target.checked);
                    if (!e.target.checked) saveIntegration('google_sheets', { webhookUrl: sheetWebhookUrl }, false);
                  }} />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${isSheetActive ? 'bg-primary' : 'bg-surface-variant'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isSheetActive ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>
            
            {isSheetActive && (
              <form onSubmit={handleSaveSheet} className="p-6 bg-surface-container-lowest/30">
                <div className="space-y-4 max-w-2xl">
                  <p className="text-body-md text-on-surface-variant">
                    Provide a Webhook URL (e.g. from Zapier, Make.com, or Google Apps Script) to receive a POST request with attendee data whenever a new registration occurs.
                  </p>
                  <div>
                    <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Webhook URL</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://hooks.zapier.com/..."
                      value={sheetWebhookUrl}
                      onChange={e => setSheetWebhookUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-outline-variant rounded-lg focus:border-primary outline-none"
                    />
                  </div>
                  <button type="submit" disabled={saving === 'google_sheets'} className="px-5 py-2.5 bg-primary text-white font-bold rounded hover:bg-primary/90 flex items-center gap-2">
                    {saving === 'google_sheets' ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Email Confirmation Integration */}
          <div className="bg-white border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">mail</span>
                </div>
                <div>
                  <h3 className="text-title-lg font-bold">Automated Email Confirmations</h3>
                  <p className="text-body-sm text-on-surface-variant">Send custom confirmation emails via your SMTP server.</p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isEmailActive} onChange={e => {
                    const newActive = e.target.checked;
                    setIsEmailActive(newActive);
                    handleSaveEmail(undefined, newActive);
                  }} />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${isEmailActive ? 'bg-primary' : 'bg-surface-variant'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isEmailActive ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>
            
            {isEmailActive && (
              <form onSubmit={handleSaveEmail} className="p-6 bg-surface-container-lowest/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                  
                  {/* Server Details */}
                  <div className="space-y-4 md:col-span-2 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                    <h4 className="font-bold text-on-surface mb-2 border-b pb-2">SMTP Server Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">SMTP Host</label>
                        <input type="text" required placeholder="smtp.gmail.com" value={emailConfig.host} onChange={e => setEmailConfig({...emailConfig, host: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">SMTP Port</label>
                        <input type="text" required placeholder="587" value={emailConfig.port} onChange={e => setEmailConfig({...emailConfig, port: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Username / Email</label>
                        <input type="text" required value={emailConfig.user} onChange={e => setEmailConfig({...emailConfig, user: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Password / App Password</label>
                        <input type="password" placeholder="Leave blank to keep existing password" value={emailConfig.pass} onChange={e => setEmailConfig({...emailConfig, pass: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Message Template */}
                  <div className="space-y-4 md:col-span-2 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                    <h4 className="font-bold text-on-surface mb-2 border-b pb-2">Email Template</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">From Name</label>
                        <input type="text" placeholder={event.name} value={emailConfig.fromName} onChange={e => setEmailConfig({...emailConfig, fromName: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div>
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">From Email (Reply-To)</label>
                        <input type="email" placeholder="events@yourcompany.com" value={emailConfig.fromEmail} onChange={e => setEmailConfig({...emailConfig, fromEmail: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Subject Line</label>
                        <input type="text" placeholder={`Registration Confirmed: ${event.name}`} value={emailConfig.subject} onChange={e => setEmailConfig({...emailConfig, subject: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Custom Message Body (Optional)</label>
                        <textarea rows={4} placeholder="We are excited to see you! Here are some instructions..." value={emailConfig.customMessage} onChange={e => setEmailConfig({...emailConfig, customMessage: e.target.value})} className="w-full px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none"></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col md:flex-row gap-4 items-end justify-between border-t border-outline-variant/50 pt-4">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="block text-label-sm font-bold text-on-surface-variant mb-1">Test Recipient Email (Optional)</label>
                        <input type="email" placeholder="test@example.com" value={testEmailAddress} onChange={e => setTestEmailAddress(e.target.value)} className="w-full md:w-64 px-3 py-2 bg-white border border-outline-variant rounded focus:border-primary outline-none" />
                      </div>
                      <button type="button" onClick={handleTestEmail} disabled={testing || saving === 'email'} className="px-5 py-2.5 bg-surface-variant text-on-surface-variant font-bold rounded hover:bg-outline-variant transition-colors flex items-center gap-2 mb-[2px]">
                        {testing ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                    <button type="submit" disabled={saving === 'email' || testing} className="px-5 py-2.5 bg-primary text-white font-bold rounded hover:bg-primary/90 flex items-center gap-2 mb-[2px]">
                      {saving === 'email' ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>

                  <div className="md:col-span-2 text-center mt-2">
                    <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      SMTP credentials are stored securely and are never exposed to the browser.
                    </p>
                  </div>

                </div>
              </form>
            )}
          </div>

          {/* Integration Activity UI */}
          <div className="bg-white border border-outline-variant/60 rounded-2xl overflow-hidden shadow-sm mt-10">
            <div className="p-6 border-b border-outline-variant/40 bg-surface-container-lowest">
              <h3 className="text-title-lg font-bold">Integration Activity</h3>
              <p className="text-body-sm text-on-surface-variant">Recent automated integration jobs for this event.</p>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest/50 border-b border-outline-variant/40">
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Registration</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Attendee</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Attempts</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {loadingJobs ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">Loading jobs...</td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">No integration jobs found.</td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-surface-container-lowest/30 transition-colors">
                        <td className="px-6 py-4 text-body-md font-medium">
                          {job.event_type === 'volunteer_invitation' || job.event_type === 'volunteer_access_assigned' 
                            ? job.event_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                            : (job.payload?.registrationNumber || '-')}
                        </td>
                        <td className="px-6 py-4 text-body-md text-on-surface-variant">
                          {job.event_type === 'volunteer_invitation' || job.event_type === 'volunteer_access_assigned'
                            ? job.payload?.recipient_email
                            : `${job.payload?.attendee?.firstName || ''} ${job.payload?.attendee?.lastName || ''}`.trim() || '-'}
                        </td>
                        <td className="px-6 py-4 text-body-md capitalize">{job.provider.replace('_', ' ')}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-bold ${
                            job.status === 'success' ? 'bg-green-100 text-green-700' :
                            job.status === 'failed' ? 'bg-red-100 text-red-700' :
                            job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-body-md text-on-surface-variant text-center">{job.attempts} / {job.max_attempts}</td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                          {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-body-md">
                          {job.status === 'failed' && (
                            <button onClick={() => handleRetryJob(job.id)} className="text-primary hover:underline font-medium text-label-md">
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Coming Soon integrations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-50">
            <div className="bg-white border border-outline-variant/60 rounded-xl p-6 text-center">
               <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined">chat</span>
                </div>
                <h4 className="font-bold">WhatsApp Sync</h4>
                <p className="text-xs text-on-surface-variant mt-1">Coming Soon</p>
            </div>
            <div className="bg-white border border-outline-variant/60 rounded-xl p-6 text-center">
               <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <h4 className="font-bold">CRM Integration</h4>
                <p className="text-xs text-on-surface-variant mt-1">Coming Soon</p>
            </div>
            <div className="bg-white border border-outline-variant/60 rounded-xl p-6 text-center">
               <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <h4 className="font-bold">Advanced Analytics</h4>
                <p className="text-xs text-on-surface-variant mt-1">Coming Soon</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
