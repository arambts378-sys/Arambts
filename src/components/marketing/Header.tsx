import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-brand-soft border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-brand-dark flex items-center gap-2">
          <span className="text-brand-maroon">ARAM</span> BTS
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#platform" className="text-brand-dark font-medium">Platform</Link>
          <Link href="#solutions" className="text-brand-muted hover:text-brand-dark transition-colors">Solutions</Link>
          <Link href="/pricing" className="text-brand-muted hover:text-brand-dark transition-colors">Pricing</Link>
          <Link href="/about" className="text-brand-muted hover:text-brand-dark transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-brand-dark font-medium">Login</Link>
          <Link href="/signup" className="bg-brand-maroon text-white px-5 py-2 rounded font-medium hover:bg-brand-maroon/90">
            Create Event
          </Link>
        </div>
      </div>
    </header>
  );
}
