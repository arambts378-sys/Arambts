import React from "react";

export function EventLifecycle() {
  const steps = [
    { title: "Create", desc: "Set up your event instantly." },
    { title: "Configure", desc: "Add details, tickets, and team." },
    { title: "Publish", desc: "Launch your event website." },
    { title: "Register", desc: "Capture attendees and revenue." },
    { title: "Operate", desc: "Check-in and on-site management." },
    { title: "Analyze", desc: "Review performance and data." },
  ];

  return (
    <section className="bg-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-brand-dark mb-16">
          One connected event lifecycle.
        </h2>
        
        <div className="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-brand-border -z-10"></div>
          
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center bg-brand-white px-2">
              <div className="w-12 h-12 rounded-full border-2 border-brand-maroon flex items-center justify-center bg-brand-white text-brand-maroon font-bold text-lg mb-4">
                {index + 1}
              </div>
              <h3 className="text-lg font-medium text-brand-dark mb-2">{step.title}</h3>
              <p className="text-sm text-brand-muted max-w-[120px] leading-relaxed">{step.desc}</p>
              
              {/* Mobile connecting line */}
              {index < steps.length - 1 && (
                <div className="md:hidden w-[1px] h-8 bg-brand-border mt-8"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Capabilities() {
  return (
    <section id="solutions" className="bg-brand-dark text-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 md:mb-24">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight tracking-tight max-w-3xl">
            Everything from one event workspace.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          <div>
            <h3 className="text-brand-maroon font-mono uppercase tracking-wider text-sm mb-6">Plan</h3>
            <ul className="space-y-4 text-brand-cream/80 text-lg">
              <li className="hover:text-brand-white transition-colors">Event Management</li>
              <li className="hover:text-brand-white transition-colors">Event Website</li>
              <li className="hover:text-brand-white transition-colors">Venues & Spaces</li>
            </ul>
          </div>
          <div>
            <h3 className="text-brand-maroon font-mono uppercase tracking-wider text-sm mb-6">Register</h3>
            <ul className="space-y-4 text-brand-cream/80 text-lg">
              <li className="hover:text-brand-white transition-colors">Registration</li>
              <li className="hover:text-brand-white transition-colors">Tickets</li>
              <li className="hover:text-brand-white transition-colors">Attendees</li>
            </ul>
          </div>
          <div>
            <h3 className="text-brand-maroon font-mono uppercase tracking-wider text-sm mb-6">Manage</h3>
            <ul className="space-y-4 text-brand-cream/80 text-lg">
              <li className="hover:text-brand-white transition-colors">People</li>
              <li className="hover:text-brand-white transition-colors">Agenda</li>
              <li className="hover:text-brand-white transition-colors">Speakers</li>
              <li className="hover:text-brand-white transition-colors">Sponsors</li>
              <li className="hover:text-brand-white transition-colors">Exhibitors</li>
            </ul>
          </div>
          <div>
            <h3 className="text-brand-maroon font-mono uppercase tracking-wider text-sm mb-6">Operate</h3>
            <ul className="space-y-4 text-brand-cream/80 text-lg">
              <li className="hover:text-brand-white transition-colors">Check-in</li>
              <li className="hover:text-brand-white transition-colors">Operations</li>
              <li className="hover:text-brand-white transition-colors">Communications</li>
            </ul>
          </div>
          <div>
            <h3 className="text-brand-maroon font-mono uppercase tracking-wider text-sm mb-6">Analyze</h3>
            <ul className="space-y-4 text-brand-cream/80 text-lg">
              <li className="hover:text-brand-white transition-colors">Analytics</li>
              <li className="hover:text-brand-white transition-colors">Reports</li>
              <li className="hover:text-brand-white transition-colors">Integrations</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
