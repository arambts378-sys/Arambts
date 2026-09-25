import { EventData } from "@/types/event";

interface SponsorsProps {
  event: EventData;
}

export default function Sponsors({ event }: SponsorsProps) {
  return (
    <section id="sponsors" className="bg-brand-soft py-24 md:py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 md:mb-24">
          <div className="inline-flex items-center space-x-2 mb-6">
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              Sponsors
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-brand-dark max-w-3xl mx-auto leading-tight tracking-tight">
            Supported by organizations building the future.
          </h2>
        </div>

        {event.sponsors && event.sponsors.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
            {event.sponsors.map((sponsor) => (
              <div key={sponsor.id} className="w-full max-w-[200px] aspect-[3/2] flex items-center justify-center filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="text-2xl md:text-3xl font-bold text-brand-dark tracking-tighter">
                  {sponsor.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-brand-border rounded-xl flex items-center justify-center bg-brand-white">
            <p className="text-brand-muted font-medium">Sponsor information will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
