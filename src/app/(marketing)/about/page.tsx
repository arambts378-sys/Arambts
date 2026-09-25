import React from 'react';
import Link from 'next/link';

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full text-center space-y-6">
        <h1 className="text-5xl font-bold text-primary">About Us</h1>
        <p className="text-on-surface-variant text-xl">Design Pending</p>
        
        <div className="pt-8 flex gap-4 justify-center">
          <Link href="/" className="px-6 py-2.5 bg-surface-container text-on-surface rounded-lg font-semibold hover:bg-surface-container-high transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
