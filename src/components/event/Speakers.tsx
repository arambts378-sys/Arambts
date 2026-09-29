import { useState, useEffect } from "react";
import { EventData } from "@/types/event";
import { speakersService } from "@/services/speakers";
import { EventPerson } from "@/types";

interface SpeakersProps {
  event: any; // Using any because event from page might not have full db shape
  section?: any;
}

export default function Speakers({ event, section }: SpeakersProps) {
  const content = section?.content || {};
  const [speakers, setSpeakers] = useState<EventPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpeakers = async () => {
      if (!event?.id) return;
      try {
        const data = await speakersService.getEventSpeakers(event.id);
        setSpeakers(data);
      } catch (error) {
        console.error("Error fetching speakers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpeakers();
  }, [event?.id]);

  const showOrganization = content.showOrganization ?? true;
  const showRole = content.showRole ?? true;
  const layout = content.layout || 'grid';
  return (
    <section id="speakers" className="bg-brand-soft py-24 md:py-32 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center space-x-2 mb-6">
              <span className="w-8 h-[1px] bg-brand-maroon"></span>
              <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                {content.heading || "Speakers"}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
              {content.title || "Voices shaping what comes next."}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-maroon"></div>
          </div>
        ) : speakers && speakers.length > 0 ? (
          <div className={layout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12" : "flex flex-nowrap overflow-x-auto gap-8 pb-8 snap-x"}>
            {speakers.map((speaker) => (
              <div key={speaker.id} className={`group cursor-default ${layout === 'carousel' ? 'w-72 flex-shrink-0 snap-center' : ''}`}>
                <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-brand-border">
                  {speaker.person?.avatar_url ? (
                    <img
                      src={speaker.person.avatar_url}
                      alt={`${speaker.person.first_name} ${speaker.person.last_name || ''}`}
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 ease-out scale-100 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-muted bg-brand-border/50">
                      No Image
                    </div>
                  )}
                  {/* Subtle overlay to fit the theme */}
                  <div className="absolute inset-0 bg-brand-maroon/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-multiply"></div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-medium text-brand-dark mb-1">
                    {speaker.person?.first_name} {speaker.person?.last_name}
                  </h3>
                  {showRole && speaker.person?.job_title && (
                    <p className="text-brand-maroon font-medium mb-1">
                      {speaker.person.job_title}
                    </p>
                  )}
                  {showOrganization && speaker.person?.organization && (
                    <p className="text-brand-muted text-sm uppercase tracking-wide font-mono">
                      {speaker.person.organization}
                    </p>
                  )}
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
