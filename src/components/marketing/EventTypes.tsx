import React from 'react';

export function EventTypes() {
  const types = ['Conference', 'Summit', 'Workshop', 'Training', 'Webinar', 'Exhibition', 'Networking', 'Sports', 'Other'];
  return (
    <section className="py-24 bg-brand-soft" id="solutions">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-brand-dark mb-12 text-center">Supports Every Event Type</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {types.map(type => (
            <div key={type} className="bg-white border border-brand-border px-6 py-3 rounded-full font-medium text-brand-dark">
              {type}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
