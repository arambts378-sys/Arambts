import { EventData } from "@/types/event";

interface EventInfoProps {
  event: EventData;
}

export default function EventInfo({ event }: EventInfoProps) {
  // Split date to get the month/year part visually separated if needed
  const dateParts = event.date.split(" ");
  const dateRange = dateParts[0]; // e.g., "12–13"
  const monthYear = dateParts.slice(1).join(" "); // e.g., "March 2027"

  // Split time
  const timeParts = event.time.split(" – ");
  const startTime = timeParts[0];
  const endTime = timeParts.length > 1 ? timeParts[1] : "";

  return (
    <section className="bg-brand-soft py-16 md:py-24 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-brand-border/60">
          {/* Date */}
          <div className="flex flex-col pt-8 md:pt-0 first:pt-0 md:px-8 first:pl-0">
            <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Date</span>
            <div className="text-4xl md:text-5xl font-light text-brand-dark mb-2">
              {dateRange}
            </div>
            <div className="text-xl text-brand-maroon font-medium">
              {monthYear}
            </div>
          </div>

          {/* Time & Format */}
          <div className="flex flex-col pt-8 md:pt-0 md:px-8">
            <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Time & Format</span>
            <div className="text-2xl font-light text-brand-dark mb-2">
              {startTime}
            </div>
            <div className="text-lg text-brand-muted mb-4">
              to {endTime}
            </div>
            <div className="inline-flex items-center space-x-2 text-sm font-medium text-brand-dark bg-brand-border/30 px-3 py-1 rounded-sm w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-maroon"></span>
              <span>{event.type} • {event.format}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col pt-8 md:pt-0 md:px-8 last:pr-0">
            <span className="text-sm font-mono text-brand-muted uppercase tracking-wider mb-4">Location</span>
            <div className="text-2xl font-light text-brand-dark mb-2">
              {event.venue}
            </div>
            <div className="text-lg text-brand-muted">
              {event.location}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
