import { EventData } from "@/types/event";

interface AgendaProps {
  event: EventData;
  section?: any;
}

export default function Agenda({ event, section }: AgendaProps) {
  const content = section?.content || {};
  return (
    <section id="agenda" className="bg-brand-white py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 md:mb-24 max-w-2xl">
          <div className="inline-flex items-center space-x-2 mb-6">
            <span className="w-8 h-[1px] bg-brand-maroon"></span>
            <span className="text-sm font-mono text-brand-maroon uppercase tracking-widest font-semibold">
              {content.heading || "Agenda"}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-brand-dark leading-tight tracking-tight">
            {content.title || "Two days of ideas, conversations, and action."}
          </h2>
        </div>

        {event.agenda && event.agenda.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            {event.agenda.map((day) => (
              <div key={day.id}>
                {/* Day Header */}
                <div className="mb-10 pb-6 border-b-2 border-brand-dark">
                  <h3 className="text-3xl font-medium text-brand-dark mb-2">
                    Day {day.dayNumber}
                  </h3>
                  <p className="text-brand-muted text-lg font-mono uppercase tracking-wider">
                    {day.date}
                  </p>
                </div>

                {/* Day Items */}
                <div className="space-y-8">
                  {day.items.map((item, index) => (
                    <div key={item.id} className="relative pl-8 md:pl-0">
                      {/* Timeline Line for Mobile */}
                      <div className="absolute left-[7px] top-2 bottom-[-24px] w-[1px] bg-brand-border md:hidden last:hidden"></div>
                      {/* Timeline Dot for Mobile */}
                      <div className="absolute left-1 top-2 w-3 h-3 rounded-full bg-brand-maroon md:hidden"></div>

                      <div className="flex flex-col md:flex-row md:items-baseline group">
                        <div className="md:w-32 flex-shrink-0 mb-2 md:mb-0">
                          <span className="text-lg font-mono text-brand-maroon font-semibold md:group-hover:text-brand-deep-maroon transition-colors">
                            {item.time}
                          </span>
                        </div>
                        <div className="md:flex-grow md:pl-8 md:border-l border-brand-border md:group-hover:border-brand-maroon transition-colors">
                          <h4 className="text-xl md:text-2xl font-medium text-brand-dark leading-tight">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="mt-2 text-brand-muted">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 border-2 border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center bg-brand-soft">
            <svg className="w-12 h-12 text-brand-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-medium text-brand-dark mb-2">Agenda Available Soon</h3>
            <p className="text-brand-muted font-medium">The event agenda is currently being finalized.</p>
          </div>
        )}
      </div>
    </section>
  );
}
