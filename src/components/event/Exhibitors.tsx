import { EventData } from "@/types/event";

interface ExhibitorsProps {
  event: EventData;
  section?: any;
}

export default function Exhibitors({ event, section }: ExhibitorsProps) {
  const content = section?.content || {};
  return (
    <section id="exhibitors" className="bg-brand-white py-16 md:py-24 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="inline-flex items-center space-x-2 mb-4">
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              {content.heading || "Exhibitors"}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-medium text-brand-dark">
            {content.title || "Explore the people and organizations behind the ideas."}
          </h2>
        </div>

        {event.exhibitors && event.exhibitors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {event.exhibitors.map((exhibitor: any) => (
              <div key={exhibitor.id} className="p-6 border border-brand-border bg-brand-soft hover:bg-brand-border/30 transition-colors">
                <span className="text-lg font-medium text-brand-dark">
                  {exhibitor.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-soft">
            <svg className="w-12 h-12 text-brand-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-medium text-brand-dark mb-2">Exhibitors Available Soon</h3>
            <p className="text-brand-muted font-medium">Exhibitor information is currently being finalized.</p>
          </div>
        )}
      </div>
    </section>
  );
}
