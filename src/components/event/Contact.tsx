import { EventData } from "@/types/event";

interface ContactProps {
  event: EventData;
  section?: any;
}

export default function Contact({ event, section }: ContactProps) {
  const content = section?.content || {};
  return (
    <section id="contact" className="bg-brand-soft py-16 md:py-24 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end">
          <div className="mb-10 md:mb-0">
            <div className="inline-flex items-center space-x-2 mb-4">
              <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
                {content.heading || "Contact"}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-medium text-brand-dark mb-4">
              {content.title || "Have questions?"}
            </h2>
            <p className="text-lg text-brand-muted max-w-md">
              {content.description || "Reach out to our team for more information regarding the event, registration, or sponsorship opportunities."}
            </p>
          </div>

          <div className="flex flex-col space-y-6 md:space-y-4 text-brand-dark">
            {(content.showEmail ?? true) && event.contact?.email && (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono text-brand-muted uppercase tracking-widest w-20">
                  Email
                </span>
                <a href={`mailto:${event.contact.email}`} className="text-lg font-medium hover:text-brand-maroon transition-colors">
                  {event.contact.email}
                </a>
              </div>
            )}
            
            {(content.showPhone ?? true) && event.contact?.phone && (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono text-brand-muted uppercase tracking-widest w-20">
                  Phone
                </span>
                <a href={`tel:${event.contact.phone.replace(/\s+/g, '')}`} className="text-lg font-medium hover:text-brand-maroon transition-colors">
                  {event.contact.phone}
                </a>
              </div>
            )}

            {event.contact?.location && (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-mono text-brand-muted uppercase tracking-widest w-20">
                  Location
                </span>
                <span className="text-lg font-medium">
                  {event.contact.location}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
