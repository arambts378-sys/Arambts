import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-brand-border py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <div className="font-bold text-xl text-brand-dark mb-2">ARAM BTS</div>
          <div className="text-brand-muted">Events Beyond Boundaries</div>
        </div>
        <nav className="flex flex-wrap justify-center gap-8">
          <Link href="#platform" className="text-brand-muted hover:text-brand-dark">Platform</Link>
          <Link href="/pricing" className="text-brand-muted hover:text-brand-dark">Pricing</Link>
          <Link href="/about" className="text-brand-muted hover:text-brand-dark">About</Link>
          <Link href="/contact" className="text-brand-muted hover:text-brand-dark">Contact</Link>
          <Link href="/login" className="text-brand-muted hover:text-brand-dark">Login</Link>
        </nav>
      </div>
    </footer>
  );
}
