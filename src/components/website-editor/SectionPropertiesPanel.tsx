import React from 'react';
import HeroPropertiesPanel from './HeroPropertiesPanel';
import HeaderPropertiesPanel from './HeaderPropertiesPanel';
import FooterPropertiesPanel from './FooterPropertiesPanel';
import FinalCTAPropertiesPanel from './FinalCTAPropertiesPanel';
import AboutPropertiesPanel from './AboutPropertiesPanel';
import SpeakersPropertiesPanel from './SpeakersPropertiesPanel';
import AgendaPropertiesPanel from './AgendaPropertiesPanel';
import VenuePropertiesPanel from './VenuePropertiesPanel';
import SponsorsPropertiesPanel from './SponsorsPropertiesPanel';
import ExhibitorsPropertiesPanel from './ExhibitorsPropertiesPanel';
import ContactPropertiesPanel from './ContactPropertiesPanel';
import EventInfoPropertiesPanel from './EventInfoPropertiesPanel';
import RegistrationPropertiesPanel from './RegistrationPropertiesPanel';

export default function SectionPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  if (!section) return null;

  switch (section.type) {
    case 'home':
    case 'hero':
      return <HeroPropertiesPanel section={section} updateSection={updateSection} />;
    case 'header':
      return <HeaderPropertiesPanel section={section} updateSection={updateSection} />;
    case 'footer':
      return <FooterPropertiesPanel section={section} updateSection={updateSection} />;
    case 'final_cta':
      return <FinalCTAPropertiesPanel section={section} updateSection={updateSection} />;
    case 'about':
      return <AboutPropertiesPanel section={section} updateSection={updateSection} />;
    case 'speakers':
      return <SpeakersPropertiesPanel section={section} updateSection={updateSection} />;
    case 'agenda':
      return <AgendaPropertiesPanel section={section} updateSection={updateSection} />;
    case 'venue':
      return <VenuePropertiesPanel section={section} updateSection={updateSection} />;
    case 'sponsors':
      return <SponsorsPropertiesPanel section={section} updateSection={updateSection} />;
    case 'exhibitors':
      return <ExhibitorsPropertiesPanel section={section} updateSection={updateSection} />;
    case 'contact':
      return <ContactPropertiesPanel section={section} updateSection={updateSection} />;
    case 'event_info':
      return <EventInfoPropertiesPanel section={section} updateSection={updateSection} />;
    case 'registration':
      return <RegistrationPropertiesPanel section={section} updateSection={updateSection} />;
    default:
      return <div className="text-sm text-gray-500">Settings for this section type are currently limited to ordering and visibility.</div>;
  }
}
