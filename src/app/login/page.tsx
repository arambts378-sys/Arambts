"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Label } from '@/components/shared/Label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required.');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push('/app');
      router.refresh(); // Ensure layout re-renders with new session
    } catch (err: any) {
      setError('An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-soft">
      {/* Left Panel: Deep Maroon Branded Area */}
      <div className="relative w-full lg:w-1/2 bg-brand-deep flex flex-col justify-between p-8 lg:p-16 text-brand-white border-b lg:border-b-0 lg:border-r border-brand-border">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-maroon rounded flex items-center justify-center font-bold text-lg border border-brand-white/10 shadow-sm">
              A
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">ARAM BTS</div>
              <div className="text-xs uppercase tracking-widest text-brand-white/70 font-mono">Platform</div>
            </div>
          </Link>
        </div>

        <div className="max-w-lg my-12 lg:my-auto z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-white/10 border border-brand-white/20 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-xs uppercase tracking-widest font-semibold text-brand-cream">
              Events Beyond Boundaries
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Manage every event from one connected platform.
          </h1>
          <p className="text-lg text-brand-white/80 leading-relaxed max-w-md">
            Create, manage, operate and analyze events flawlessly. Engineered for high-stakes production, timeline discipline, and large-scale operational integrity.
          </p>
        </div>

        <div className="text-xs font-mono text-brand-white/50 pt-6 border-t border-brand-white/10 flex justify-between">
          <span>Unified Workspace Gateway</span>
          <span>v2.4.8-LTS</span>
        </div>
        
        {/* Subtle decorative background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-maroon/20 to-transparent pointer-events-none"></div>
      </div>

      {/* Right Panel: Authentication Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-brand-cream">
        <div className="w-full max-w-md bg-brand-white p-8 md:p-10 border border-brand-border shadow-xl rounded-xl">
          <div className="text-center mb-10">
            <div className="text-brand-maroon font-bold tracking-widest uppercase text-sm mb-2">
              Welcome Back
            </div>
            <h2 className="text-3xl font-bold text-brand-dark">Sign in to ARAM BTS</h2>
            <p className="text-brand-muted mt-2">
              Access your workspace and operations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-md text-sm font-medium">
                {error}
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-brand-maroon hover:text-brand-deep transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-12 text-lg mt-2" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-brand-border text-center">
            <p className="text-brand-muted">
              Don't have an account?{' '}
              <Link href="/signup" className="font-bold text-brand-maroon hover:text-brand-deep transition-colors underline underline-offset-4">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}