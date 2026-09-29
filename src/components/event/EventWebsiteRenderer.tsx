"use client";

import React from 'react';
import Header from "@/components/event/Header";
import Hero from "@/components/event/Hero";
import EventInfo from "@/components/event/EventInfo";
import About from "@/components/event/About";
import Speakers from "@/components/event/Speakers";
import Agenda from "@/components/event/Agenda";
import Registration from "@/components/event/Registration";
import Venue from "@/components/event/Venue";
import Sponsors from "@/components/event/Sponsors";
import Exhibitors from "@/components/event/Exhibitors";
import Contact from "@/components/event/Contact";
import FinalCTA from "@/components/event/FinalCTA";
import Footer from "@/components/event/Footer";

export type WebsiteRendererMode = 'editor' | 'preview' | 'public';

interface Props {
  event: any;
  websiteConfig: any;
  mode: WebsiteRendererMode;
  activeSectionId?: string | null;
  onSectionClick?: (sectionId: string) => void;
}

export default function EventWebsiteRenderer({ event, websiteConfig, mode, activeSectionId, onSectionClick }: Props) {
  const visibleSections = websiteConfig?.sections
    ?.filter((s: any) => s.visible)
    ?.sort((a: any, b: any) => a.order - b.order) || [];

  const renderSectionComponent = (section: any) => {
    switch (section.id) {
      case 'header': return <Header event={event} section={section} websiteConfig={websiteConfig} />;
      case 'home':
      case 'hero': return <Hero event={event} section={section} />;
      case 'event_info': return <EventInfo event={event} section={section} />;
      case 'about': return <About event={event} section={section} />;
      case 'speakers': return <Speakers event={event} section={section} />;
      case 'agenda': return <Agenda event={event} section={section} />;
      case 'register': return <Registration event={event} section={section} />;
      case 'venue': return <Venue event={event} section={section} />;
      case 'sponsors': return <Sponsors event={event} section={section} />;
      case 'exhibitors': return <Exhibitors event={event} section={section} />;
      case 'contact': return <Contact event={event} section={section} />;
      case 'final_cta': return <FinalCTA event={event} section={section} />;
      case 'footer': return <Footer event={event} section={section} />;
      default: return null;
    }
  };

  return (
    <div className="w-full flex flex-col font-sans relative">
      {visibleSections.map((section: any) => {
        const isSelected = mode === 'editor' && activeSectionId === section.id;
        const component = renderSectionComponent(section);
        
        if (!component) return null;

        if (mode === 'editor') {
          return (
            <div 
              key={section.id}
              className={`relative cursor-pointer transition-all duration-200 group ${isSelected ? 'ring-2 ring-brand-maroon ring-inset z-40' : 'hover:ring-1 hover:ring-brand-maroon/50 hover:ring-inset'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSectionClick) onSectionClick(section.id);
              }}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 bg-brand-maroon text-white text-xs font-bold px-2 py-1 rounded-br z-50 shadow-md uppercase tracking-wider">
                  {section.id.replace('_', ' ')}
                </div>
              )}
              <div className={isSelected ? 'opacity-100' : 'opacity-95 group-hover:opacity-100'}>
                {component}
              </div>
            </div>
          );
        }

        return <React.Fragment key={section.id}>{component}</React.Fragment>;
      })}
    </div>
  );
}
