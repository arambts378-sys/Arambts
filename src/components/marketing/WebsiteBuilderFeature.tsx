import React from 'react';

export function WebsiteBuilderFeature() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-bold text-brand-dark mb-6">AI-Assisted Website Builder</h2>
          <p className="text-brand-muted text-lg mb-8">
            Upload your event flyer. The platform automatically extracts structured details and generates your initial website configuration. From there, use our modular editor to customize and publish instantly.
          </p>
          <ul className="space-y-4 font-medium text-brand-dark">
            <li>→ Upload Flyer</li>
            <li>→ Event details extracted</li>
            <li>→ Website generated</li>
            <li>→ Organizer edits</li>
            <li>→ Publish</li>
          </ul>
        </div>
        <div className="bg-brand-soft border border-brand-border rounded-xl aspect-square flex items-center justify-center p-8">
          <div className="w-full h-full border-2 border-dashed border-brand-maroon/30 rounded-lg flex flex-col items-center justify-center text-brand-maroon">
             <span className="material-symbols-outlined text-6xl mb-4">upload_file</span>
             <span className="font-bold">Drop Event Flyer Here</span>
          </div>
        </div>
      </div>
    </section>
  );
}
