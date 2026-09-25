import React from 'react';

export function Roles() {
  const roles = ['Workspace Owner', 'Organizer', 'Event Manager', 'Registration Manager', 'Check-in Staff', 'Speaker', 'Sponsor', 'Exhibitor', 'Attendee'];
  return (
    <section className="py-24 bg-brand-soft">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-brand-dark mb-6">One Product. Many Workflows.</h2>
        <p className="text-brand-muted mb-12">Connected operations for every role across your event ecosystem.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {roles.map(role => (
            <span key={role} className="bg-white px-4 py-2 border border-brand-border rounded text-brand-dark font-medium">{role}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
