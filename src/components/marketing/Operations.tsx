import React from 'react';

export function Operations() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-brand-dark mb-12">Flawless Event Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">Registration & Ticketing</h3>
            <p className="text-brand-muted">Dynamic flows for complex attendee types.</p>
          </div>
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">QR Check-in</h3>
            <p className="text-brand-muted">Fast, secure on-site badge scanning and verification.</p>
          </div>
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">Live Analytics</h3>
            <p className="text-brand-muted">Real-time operational awareness across venues.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
