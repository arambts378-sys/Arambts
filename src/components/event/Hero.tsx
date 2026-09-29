import Link from "next/link";
import { EventData } from "@/types/event";
import { WebsiteSection } from "@/types";

interface HeroProps {
  event: any;
  section?: WebsiteSection;
}

export default function Hero({ event, section }: HeroProps) {
  const content = section?.content || {};
  const hasFlyer = !!content.image;
  
  const layout = content.layout || (hasFlyer ? 'banner' : 'standard');
  const imageFit = content.imageFit || 'contain';
  const overlay = content.overlay || 'none';
  const overlayOpacity = Number(content.overlayOpacity || '50') / 100;
  
  const showTitle = content.showTitle ?? (hasFlyer ? false : true);
  const showDate = content.showDate ?? (hasFlyer ? false : true);
  const showLocation = content.showLocation ?? (hasFlyer ? false : true);
  const showDescription = content.showDescription ?? (hasFlyer ? false : true);
  
  const showPrimaryCta = content.showPrimaryCta ?? true;
  const primaryCtaText = content.primaryCtaText || "Register Now";
  const primaryCtaDest = content.primaryCtaDest || `/events/${event?.slug || event?.id}/register`;
  
  const showSecondaryCta = content.showSecondaryCta ?? false;
  const secondaryCtaText = content.secondaryCtaText || "View Agenda";
  const secondaryCtaDest = content.secondaryCtaDest || "#agenda";
  
  const hasAnyEventInfo = showTitle || showDate || showLocation || showDescription || showPrimaryCta || showSecondaryCta;
  
  const heroHeight = content.heroHeight || 'medium';
  const imageAlignment = content.imageAlignment || 'center';
  
  // Height classes based on configuration
  let heightClass = 'min-h-[85vh]'; // medium
  if (heroHeight === 'small') heightClass = 'min-h-[50vh]';
  if (heroHeight === 'large') heightClass = 'min-h-[100vh]';

  // Render the Event Info blocks (Title, Date, Venue, CTA)
  const renderEventInfo = (centerText: boolean = false) => (
    <div className={`max-w-4xl ${centerText ? 'text-center mx-auto' : ''}`}>
      {showTitle && (
        <>
          <div className={`inline-flex items-center space-x-2 px-3 py-1 mb-8 rounded-full border border-brand-maroon/50 bg-brand-maroon/10 backdrop-blur-sm ${centerText ? 'mx-auto' : ''}`}>
            <span className="w-2 h-2 rounded-full bg-brand-maroon animate-pulse" />
            <span className="text-xs font-mono font-medium tracking-wider text-brand-cream uppercase">
              {event.name}
            </span>
          </div>

          <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold text-brand-white leading-tight tracking-tight mb-8 ${centerText ? 'text-center' : ''}`}>
            {event.name}
          </h1>
        </>
      )}

      {(showDate || showLocation) && (
        <div className={`flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8 text-brand-cream/90 mb-10 text-lg md:text-xl ${centerText ? 'justify-center' : ''}`}>
          {showDate && (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{event.date}</span>
            </div>
          )}
          {showDate && showLocation && (
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-brand-maroon" />
          )}
          {showLocation && (
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.venue || event.location}</span>
            </div>
          )}
        </div>
      )}

      {showDescription && event.description && (
        <p className={`text-lg md:text-2xl text-brand-cream/80 max-w-2xl mb-12 leading-relaxed ${centerText ? 'mx-auto' : ''}`}>
          {event.description}
        </p>
      )}

      <div className={`flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 ${centerText ? 'justify-center' : ''}`}>
        {showPrimaryCta && (
          <Link
            href={primaryCtaDest}
            className="inline-flex items-center justify-center px-8 py-4 text-base md:text-lg font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-brand-maroon/20 rounded-sm"
          >
            {primaryCtaText}
          </Link>
        )}
        {showSecondaryCta && (
          <Link
            href={secondaryCtaDest}
            className="inline-flex items-center justify-center px-8 py-4 text-base md:text-lg font-medium text-brand-white border border-brand-white/30 hover:bg-brand-white/10 transition-all duration-300 backdrop-blur-sm rounded-sm"
          >
            {secondaryCtaText}
          </Link>
        )}
      </div>
    </div>
  );

  // Split Layout
  if (layout === 'split' && hasFlyer) {
    return (
      <section className={`relative w-full ${heightClass} flex flex-col md:flex-row bg-brand-dark overflow-hidden`}>
        {/* Left Side: Event Info */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-16 border-r border-brand-maroon/20">
          <div className="w-full max-w-xl mx-auto">
            {renderEventInfo()}
          </div>
        </div>

        {/* Right Side: Flyer */}
        <div className="w-full md:w-1/2 relative bg-black/20 flex items-center justify-center min-h-[50vh]">
          <div className="absolute inset-0 z-0">
             <img
              src={content.image}
              alt={event.name}
              className="w-full h-full object-cover opacity-20 blur-xl"
            />
          </div>
          <img
            src={content.image}
            alt={`${event.name} Flyer`}
            className={`relative z-10 w-full h-full max-h-[85vh] p-8 object-${imageFit} object-${imageAlignment}`}
          />
        </div>
      </section>
    );
  }

  // Flyer Banner Layout
  if (layout === 'banner' && hasFlyer) {
    return (
      <section className={`relative w-full ${heightClass} flex flex-col items-center justify-center bg-brand-dark overflow-hidden py-12`}>
        {/* Background (blurred flyer) */}
        <div className="absolute inset-0 z-0 bg-brand-dark/90">
          <img
            src={content.image}
            alt="Background"
            className="w-full h-full object-cover opacity-30 blur-3xl scale-110"
          />
          {overlay === 'dark' && <div className="absolute inset-0 bg-black mix-blend-multiply" style={{ opacity: overlayOpacity }} />}
          {overlay === 'light' && <div className="absolute inset-0 bg-white mix-blend-overlay" style={{ opacity: overlayOpacity }} />}
        </div>
        
        {/* Flyer Image Container */}
        <div className="relative z-10 w-full h-full flex-1 flex flex-col items-center justify-center px-4">
          <img 
            src={content.image} 
            alt={`${event.name} Flyer`}
            className={`w-full h-full max-h-[70vh] object-${imageFit} object-${imageAlignment} drop-shadow-2xl rounded-sm`}
            style={{ maxWidth: '90%' }}
          />
          
          {hasAnyEventInfo && (
             <div className="mt-12">
               {renderEventInfo(true)}
             </div>
          )}
        </div>
      </section>
    );
  }

  // Default Standard View (No Flyer or fallback)
  return (
    <section className={`relative w-full ${heightClass} flex items-center justify-center bg-brand-dark overflow-hidden`}>
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop"
          alt="Conference audience and stage"
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/60 via-brand-dark/40 to-brand-dark/80 mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        {renderEventInfo()}
      </div>
    </section>
  );
}
