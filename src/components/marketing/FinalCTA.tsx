import React from 'react';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-32 bg-brand-dark text-center px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl font-bold text-white mb-8">Ready to build?</h2>
        <p className="text-xl text-gray-300 mb-12">Create, Manage, Operate, and Analyze from one platform.</p>
        <Link href="/signup" className="bg-brand-maroon text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-brand-maroon/90 inline-block">
          Create Your Event
        </Link>
      </div>
    </section>
  );
}
