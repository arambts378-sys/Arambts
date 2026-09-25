import { EventData } from "@/types/event";

interface ExhibitorsProps {
  event: EventData;
}

export default function Exhibitors({ event }: ExhibitorsProps) {
  return (
    <section id="exhibitors" className="bg-brand-white py-16 md:py-24 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="inline-flex items-center space-x-2 mb-4">
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              Exhibitors
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-medium text-brand-dark">
            Explore the people and organizations behind the ideas.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {event.exhibitors.map((exhibitor) => (
            <div key={exhibitor.id} className="p-6 border border-brand-border bg-brand-soft hover:bg-brand-border/30 transition-colors">
              <span className="text-lg font-medium text-brand-dark">
                {exhibitor.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
