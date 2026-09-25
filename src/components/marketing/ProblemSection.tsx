import React from "react";

export function ProductStatement() {
  return (
    <section id="platform" className="bg-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-brand-dark leading-tight tracking-tight max-w-4xl mx-auto mb-8">
          Everything your event needs.<br />
          Connected in one place.
        </h2>
        
        <p className="text-xl md:text-2xl text-brand-muted max-w-3xl mx-auto leading-relaxed">
          ARAM BTS connects the entire workflow. From planning and registration to managing attendees, operating on-site, and analyzing the results.
        </p>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="bg-brand-soft py-24 md:py-32 border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-between space-y-12 lg:space-y-0 lg:space-x-16">
          <div className="w-full lg:w-1/2">
            <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-8">
              Your event shouldn't live across ten different tools.
            </h2>
            <p className="text-lg text-brand-muted leading-relaxed mb-8">
              Event teams often manage websites, registration, tickets, spreadsheets, speakers, sponsors, attendees, check-in, communication, and analytics across disconnected platforms. This fragmentation leads to operational friction.
            </p>
            <p className="text-xl font-medium text-brand-maroon">
              ARAM BTS connects the workflow.
            </p>
          </div>
          
          <div className="w-full lg:w-1/2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center font-mono text-sm uppercase tracking-wider text-brand-muted">
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Website</div>
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Tickets</div>
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Spreadsheets</div>
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Speakers</div>
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Check-in Apps</div>
              <div className="bg-brand-white border border-brand-border p-6 shadow-sm line-through decoration-brand-maroon/30 decoration-2">Emails</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
