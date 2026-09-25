import React from "react";
import { Button } from "../shared/Button";

export function EventWebsiteSection() {
  return (
    <section className="bg-brand-soft py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center lg:space-x-16">
          <div className="w-full lg:w-1/2 mb-16 lg:mb-0">
            <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-8">
              Build an event website without starting from scratch.
            </h2>
            <p className="text-lg text-brand-muted leading-relaxed mb-8">
              Create your event website from structured event information or start from an uploaded flyer. ARAM BTS generates a premium, responsive website instantly.
            </p>
            
            <div className="bg-brand-white border border-brand-border p-6 shadow-sm mb-8 font-mono text-sm">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-brand-maroon">01</span>
                <span className="text-brand-dark">Upload Flyer</span>
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-brand-maroon">02</span>
                <span className="text-brand-dark">AI understands event information</span>
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-brand-maroon">03</span>
                <span className="text-brand-dark">Structured Event Data</span>
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-brand-maroon">04</span>
                <span className="text-brand-dark">Website Generated</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-brand-maroon">05</span>
                <span className="text-brand-dark">Review, Edit & Publish</span>
              </div>
            </div>
            
            <Button variant="outline">Learn about Website Builder</Button>
          </div>
          
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[4/5] bg-brand-white border border-brand-border shadow-xl rounded-sm overflow-hidden p-2">
              <div className="w-full h-full bg-brand-soft border border-brand-border relative overflow-hidden">
                <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop" className="absolute top-0 w-full h-1/3 object-cover" alt="Hero banner preview" />
                <div className="absolute top-[30%] left-4 right-4 bg-brand-white p-4 shadow-sm border border-brand-border">
                  <div className="h-4 w-1/3 bg-brand-soft mb-2"></div>
                  <div className="h-8 w-3/4 bg-brand-dark mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 w-24 bg-brand-maroon rounded"></div>
                    <div className="h-8 w-24 border border-brand-border rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RolesSection() {
  const roles = [
    "Workspace Owner",
    "Organizer",
    "Event Manager",
    "Registration Manager",
    "Check-in Staff",
    "Speaker",
    "Sponsor",
    "Exhibitor",
    "Attendee"
  ];

  return (
    <section className="bg-brand-white py-24 md:py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight mb-6">
          One event.<br />
          Different roles.<br />
          One connected workspace.
        </h2>
        
        <p className="text-xl text-brand-muted max-w-2xl mx-auto mb-16">
          Role-based experiences inside a single ecosystem. Everyone sees exactly what they need to manage their part of the event.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {roles.map((role, idx) => (
            <div key={idx} className="bg-brand-soft border border-brand-border px-6 py-3 text-brand-dark font-medium hover:border-brand-maroon hover:text-brand-maroon transition-colors cursor-default">
              {role}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
