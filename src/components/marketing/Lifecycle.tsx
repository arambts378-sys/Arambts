import React from 'react';

export function Lifecycle() {
  const steps = ['Create', 'Configure', 'Publish', 'Register', 'Operate', 'Analyze'];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-brand-dark">The Complete Event Lifecycle</h2>
          <p className="text-brand-muted mt-4">Everything you need in one connected product.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {steps.map((step, idx) => (
            <div key={idx} className="bg-brand-soft border border-brand-border p-6 rounded-lg text-center">
              <div className="text-brand-maroon font-bold text-2xl mb-2">0{idx + 1}</div>
              <div className="font-medium text-brand-dark">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
