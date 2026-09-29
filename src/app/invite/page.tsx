"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function InviteRedemption() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const nextParam = searchParams.get('next');
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventId, setEventId] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const handleRedeem = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/invitations/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem invitation.');
      }

      setSuccess(true);
      setEventId(data.eventId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-container-lowest text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-outline-variant shadow-sm">
          <span className="material-symbols-outlined text-[64px] text-green-600 mb-4">check_circle</span>
          <h1 className="text-headline-md font-bold mb-2">Access Granted</h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            You have successfully redeemed your invitation. You now have access to the assigned checkpoints.
          </p>
          <button 
            onClick={() => {
              // Ensure nextParam is a safe internal relative path
              if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
                router.push(nextParam);
              } else {
                router.push(`/app/events/${eventId}/operations/check-in`);
              }
            }}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Open Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-container-lowest text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-outline-variant shadow-sm">
        <span className="material-symbols-outlined text-[48px] text-primary mb-4">mail</span>
        <h1 className="text-headline-sm font-bold mb-4">Event Access Invitation</h1>
        
        {error ? (
          <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6 font-medium">
            {error}
          </div>
        ) : (
          <p className="text-body-md text-on-surface-variant mb-8">
            You have been invited to join an event's operational team.
          </p>
        )}

        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-on-surface">
              Create your ARAM BTS account to accept this invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href={`/signup?redirect=/invite?token=${token}${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}`}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors block text-center"
              >
                Create Account
              </Link>
              <Link 
                href={`/login?redirect=/invite?token=${token}${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}`}
                className="w-full bg-surface-container text-on-surface py-3 rounded-xl font-bold hover:bg-surface-variant transition-colors block text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-surface-container-low p-4 rounded-xl text-left border border-outline-variant/60">
              <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">Signed in as</p>
              <p className="font-medium text-on-surface truncate">{userEmail}</p>
            </div>
            <button 
              onClick={handleRedeem}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Accept Invitation
            </button>
            <button 
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Sign in with a different account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <InviteRedemption />
    </Suspense>
  );
}
