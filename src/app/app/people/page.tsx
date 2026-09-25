import React from 'react';
import Link from 'next/link';

export default function PeopleDirectoryPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">People Directory</h1>
        <p className="text-on-surface-variant text-lg">Module Coming Soon</p>
        
        <div className="pt-8 flex gap-4 justify-center">
          <Link href="/app" className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
