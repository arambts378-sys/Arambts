import { EventData } from "@/types/event";

interface AboutProps {
  event: EventData;
}

export default function About({ event }: AboutProps) {
  return (
    <section id="about" className="bg-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-16 xl:space-x-24">
          
          {/* Content Column */}
          <div className="w-full lg:w-1/2 mb-16 lg:mb-0">
            <div className="inline-flex items-center space-x-2 mb-8">
              <span className="w-8 h-[1px] bg-brand-maroon"></span>
              <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                About the Event
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-brand-dark leading-tight tracking-tight mb-8">
              Where leaders meet ideas, people, and possibilities.
            </h2>
            
            <div className="prose prose-lg text-brand-muted">
              <p className="text-xl leading-relaxed">
                {event.name} brings together business leaders, technology professionals, entrepreneurs, and decision-makers for two focused days of conversations, insights, and networking.
              </p>
              <p className="mt-6 leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>

          {/* Image Column */}
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-soft">
              {/* Placeholder image for About section */}
              <img
                src="https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop"
                alt="People conversing at the event"
                className="w-full h-full object-cover"
              />
              {/* Subtle decorative border overlay */}
              <div className="absolute inset-0 border border-brand-maroon/10 mix-blend-overlay"></div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
