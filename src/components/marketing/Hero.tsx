import React from 'react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="pt-24 pb-32 bg-brand-soft text-center px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-brand-maroon font-bold tracking-wider uppercase mb-6">Unified Event Management Platform</div>
        <h1 className="text-5xl md:text-7xl font-bold text-brand-dark mb-8 leading-tight">
          One Platform.<br />Every Event Workflow.
        </h1>
        <p className="text-xl text-brand-muted mb-12">
          Create, configure, publish, register, operate, and analyze professional events effortlessly.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/signup" className="bg-brand-maroon text-white px-8 py-3 rounded-lg font-bold hover:bg-brand-maroon/90">
            Create Your Event
          </Link>
          <Link href="/about" className="bg-white text-brand-dark border border-brand-border px-8 py-3 rounded-lg font-bold hover:bg-gray-50">
            Explore Platform
          </Link>
        </div>
      </div>
    </section>
  );
}
