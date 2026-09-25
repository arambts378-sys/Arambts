import React from 'react';
import { Header } from '@/components/marketing/Header';
import { Hero } from '@/components/marketing/Hero';
import { Lifecycle } from '@/components/marketing/Lifecycle';
import { EventTypes } from '@/components/marketing/EventTypes';
import { WebsiteBuilderFeature } from '@/components/marketing/WebsiteBuilderFeature';
import { Roles } from '@/components/marketing/Roles';
import { Operations } from '@/components/marketing/Operations';
import { FinalCTA } from '@/components/marketing/FinalCTA';
import { Footer } from '@/components/marketing/Footer';

export default function MarketingHomepage() {
  return (
    <main className="min-h-screen bg-brand-soft font-sans">
      <Header />
      <div id="platform">
        <Hero />
        <Lifecycle />
        <WebsiteBuilderFeature />
        <Operations />
        <Roles />
        <EventTypes />
        <FinalCTA />
      </div>
      <Footer />
    </main>
  );
}
