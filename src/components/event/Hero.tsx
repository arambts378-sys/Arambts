import Link from "next/link";
import { EventData } from "@/types/event";

interface HeroProps {
  event: EventData;
}

export default function Hero({ event }: HeroProps) {
  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center bg-brand-dark overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Placeholder image from unsplash (professional conference) */}
        <img
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"
          alt="Conference audience and stage"
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/40 to-brand-dark/80 mix-blend-multiply" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 mb-8 rounded-full border border-brand-maroon/50 bg-brand-maroon/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-brand-maroon animate-pulse" />
            <span className="text-xs font-mono font-medium tracking-wider text-brand-cream uppercase">
              {event.name}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-brand-white leading-tight tracking-tight mb-8">
            {event.name}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8 text-brand-cream/90 mb-10 text-lg md:text-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{event.date}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-brand-maroon" />
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.venue}, {event.location}</span>
            </div>
          </div>

          <p className="text-lg md:text-2xl text-brand-cream/80 max-w-2xl mb-12 leading-relaxed">
            {event.description}
          </p>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              href="#registration"
              className="inline-flex items-center justify-center px-8 py-4 text-base md:text-lg font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-brand-maroon/20 rounded-sm"
            >
              Register Now
            </Link>
            <Link
              href="#agenda"
              className="inline-flex items-center justify-center px-8 py-4 text-base md:text-lg font-medium text-brand-white border border-brand-white/30 hover:bg-brand-white/10 transition-all duration-300 backdrop-blur-sm rounded-sm"
            >
              View Agenda
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
