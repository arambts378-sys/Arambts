"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Label } from '@/components/shared/Label';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!fullName || !email || !password) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push('/app');
      router.refresh();
    } catch (err: any) {
      setError('An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-soft p-8">
      <div className="w-full max-w-md bg-brand-white p-8 md:p-10 border border-brand-border shadow-xl rounded-xl">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <div className="w-10 h-10 bg-brand-maroon rounded mx-auto flex items-center justify-center font-bold text-lg text-brand-white">
              A
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-brand-dark">Create Account</h2>
          <p className="text-brand-muted mt-2">
            Get started with ARAM BTS.
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-md text-sm font-medium">
              {error}
            </div>
          )}
          
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="mt-1.5"
              required
            />
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full h-12 text-lg mt-2" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-brand-border text-center">
          <p className="text-brand-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-brand-maroon hover:text-brand-deep transition-colors underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
