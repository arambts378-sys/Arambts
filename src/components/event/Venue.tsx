import { EventData } from "@/types/event";
import Link from "next/link";

interface VenueProps {
  event: EventData;
}

export default function Venue({ event }: VenueProps) {
  return (
    <section id="venue" className="bg-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <div className="inline-flex items-center space-x-2 mb-6">
            <span className="w-8 h-[1px] bg-brand-maroon"></span>
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              Venue
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
            {event.venue}
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-12 xl:space-x-16">
          <div className="w-full lg:w-2/3 mb-12 lg:mb-0">
            <div className="relative aspect-video w-full overflow-hidden bg-brand-soft">
              {/* Placeholder image for venue */}
              <img
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070&auto=format&fit=crop"
                alt="Venue building"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border border-brand-maroon/10 mix-blend-overlay"></div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex flex-col justify-center">
            <div className="space-y-10">
              <div>
                <h3 className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-2">Location</h3>
                <p className="text-2xl font-light text-brand-dark">{event.location}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-2">Dates</h3>
                <p className="text-2xl font-light text-brand-dark">{event.date}</p>
              </div>

              <div>
                <Link
                  href="#"
                  className="inline-flex items-center space-x-2 text-brand-maroon font-medium hover:text-brand-deep-maroon transition-colors group"
                >
                  <span>View on Map</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
