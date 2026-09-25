import { EventData } from "@/types/event";

interface SpeakersProps {
  event: EventData;
}

export default function Speakers({ event }: SpeakersProps) {
  return (
    <section id="speakers" className="bg-brand-soft py-24 md:py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 mb-6">
              <span className="w-8 h-[1px] bg-brand-maroon"></span>
              <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                Speakers
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
              Voices shaping what comes next.
            </h2>
          </div>
        </div>

        {event.speakers && event.speakers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {event.speakers.map((speaker) => (
              <div key={speaker.id} className="group cursor-default">
                <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-brand-border">
                  {speaker.imageUrl ? (
                    <img
                      src={speaker.imageUrl}
                      alt={speaker.name}
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 ease-out scale-100 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-muted">
                      No Image
                    </div>
                  )}
                  {/* Subtle overlay to fit the theme */}
                  <div className="absolute inset-0 bg-brand-maroon/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-multiply"></div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-medium text-brand-dark mb-1">
                    {speaker.name}
                  </h3>
                  <p className="text-brand-maroon font-medium mb-1">
                    {speaker.role}
                  </p>
                  <p className="text-brand-muted text-sm uppercase tracking-wide font-mono">
                    {speaker.organization}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-brand-border rounded-xl flex items-center justify-center bg-brand-white">
            <p className="text-brand-muted font-medium">Speaker information will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
