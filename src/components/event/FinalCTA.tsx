import Link from "next/link";

export default function FinalCTA({ event, section }: any) {
  const content = section?.content || {};
  const title = content.title || "Ready to shape the future?";
  
  const showPrimaryCta = content.showPrimaryCta ?? true;
  const primaryCtaText = content.primaryCtaText || "Register Now";
  const primaryCtaDest = content.primaryCtaDest || `/events/${event?.slug || event?.id}/register`;
  
  const showSecondaryCta = content.showSecondaryCta ?? false;
  const secondaryCtaText = content.secondaryCtaText || "View Agenda";
  const secondaryCtaDest = content.secondaryCtaDest || "#agenda";
  return (
    <section className="bg-brand-maroon py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-medium text-brand-white leading-tight tracking-tight mb-6">
          {title}
        </h2>
        <p className="text-xl md:text-2xl text-brand-cream/80 mb-12 max-w-2xl mx-auto font-light">
          Join {event?.name} and be part of this amazing experience.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {showPrimaryCta && (
            <Link
              href={primaryCtaDest}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-brand-maroon bg-brand-white hover:bg-brand-soft transition-colors shadow-lg hover:shadow-xl rounded-sm w-full sm:w-auto"
            >
              {primaryCtaText}
            </Link>
          )}
          
          {showSecondaryCta && (
            <Link
              href={secondaryCtaDest}
              className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-brand-white border border-brand-white hover:bg-brand-white/10 transition-colors shadow-lg hover:shadow-xl rounded-sm w-full sm:w-auto"
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
