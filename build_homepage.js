const fs = require('fs');
const path = require('path');

const marketingDir = path.resolve('src/components/marketing');
if (!fs.existsSync(marketingDir)) {
  fs.mkdirSync(marketingDir, { recursive: true });
}

const writeComponent = (name, content) => {
  fs.writeFileSync(path.join(marketingDir, name), content.trim() + '\n');
};

writeComponent('Header.tsx', `
import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-brand-soft border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-brand-dark flex items-center gap-2">
          <span className="text-brand-maroon">ARAM</span> BTS
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#platform" className="text-brand-dark font-medium">Platform</Link>
          <Link href="#solutions" className="text-brand-muted hover:text-brand-dark transition-colors">Solutions</Link>
          <Link href="/pricing" className="text-brand-muted hover:text-brand-dark transition-colors">Pricing</Link>
          <Link href="/about" className="text-brand-muted hover:text-brand-dark transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-brand-dark font-medium">Login</Link>
          <Link href="/signup" className="bg-brand-maroon text-white px-5 py-2 rounded font-medium hover:bg-brand-maroon/90">
            Create Event
          </Link>
        </div>
      </div>
    </header>
  );
}
`);

writeComponent('Hero.tsx', `
import React from 'react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="pt-24 pb-32 bg-brand-soft text-center px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-brand-maroon font-bold tracking-wider uppercase mb-6">Unified Event Management Platform</div>
        <h1 className="text-5xl md:text-7xl font-bold text-brand-dark mb-8 leading-tight">
          One Platform.<br />Every Event Workflow.
        </h1>
        <p className="text-xl text-brand-muted mb-12">
          Create, configure, publish, register, operate, and analyze professional events effortlessly.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/signup" className="bg-brand-maroon text-white px-8 py-3 rounded-lg font-bold hover:bg-brand-maroon/90">
            Create Your Event
          </Link>
          <Link href="/about" className="bg-white text-brand-dark border border-brand-border px-8 py-3 rounded-lg font-bold hover:bg-gray-50">
            Explore Platform
          </Link>
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('Lifecycle.tsx', `
import React from 'react';

export function Lifecycle() {
  const steps = ['Create', 'Configure', 'Publish', 'Register', 'Operate', 'Analyze'];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-brand-dark">The Complete Event Lifecycle</h2>
          <p className="text-brand-muted mt-4">Everything you need in one connected product.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {steps.map((step, idx) => (
            <div key={idx} className="bg-brand-soft border border-brand-border p-6 rounded-lg text-center">
              <div className="text-brand-maroon font-bold text-2xl mb-2">0{idx + 1}</div>
              <div className="font-medium text-brand-dark">{step}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('EventTypes.tsx', `
import React from 'react';

export function EventTypes() {
  const types = ['Conference', 'Summit', 'Workshop', 'Training', 'Webinar', 'Exhibition', 'Networking', 'Sports', 'Other'];
  return (
    <section className="py-24 bg-brand-soft" id="solutions">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-brand-dark mb-12 text-center">Supports Every Event Type</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {types.map(type => (
            <div key={type} className="bg-white border border-brand-border px-6 py-3 rounded-full font-medium text-brand-dark">
              {type}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('WebsiteBuilderFeature.tsx', `
import React from 'react';

export function WebsiteBuilderFeature() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-bold text-brand-dark mb-6">AI-Assisted Website Builder</h2>
          <p className="text-brand-muted text-lg mb-8">
            Upload your event flyer. The platform automatically extracts structured details and generates your initial website configuration. From there, use our modular editor to customize and publish instantly.
          </p>
          <ul className="space-y-4 font-medium text-brand-dark">
            <li>→ Upload Flyer</li>
            <li>→ Event details extracted</li>
            <li>→ Website generated</li>
            <li>→ Organizer edits</li>
            <li>→ Publish</li>
          </ul>
        </div>
        <div className="bg-brand-soft border border-brand-border rounded-xl aspect-square flex items-center justify-center p-8">
          <div className="w-full h-full border-2 border-dashed border-brand-maroon/30 rounded-lg flex flex-col items-center justify-center text-brand-maroon">
             <span className="material-symbols-outlined text-6xl mb-4">upload_file</span>
             <span className="font-bold">Drop Event Flyer Here</span>
          </div>
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('Roles.tsx', `
import React from 'react';

export function Roles() {
  const roles = ['Workspace Owner', 'Organizer', 'Event Manager', 'Registration Manager', 'Check-in Staff', 'Speaker', 'Sponsor', 'Exhibitor', 'Attendee'];
  return (
    <section className="py-24 bg-brand-soft">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-brand-dark mb-6">One Product. Many Workflows.</h2>
        <p className="text-brand-muted mb-12">Connected operations for every role across your event ecosystem.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {roles.map(role => (
            <span key={role} className="bg-white px-4 py-2 border border-brand-border rounded text-brand-dark font-medium">{role}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('Operations.tsx', `
import React from 'react';

export function Operations() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-brand-dark mb-12">Flawless Event Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">Registration & Ticketing</h3>
            <p className="text-brand-muted">Dynamic flows for complex attendee types.</p>
          </div>
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">QR Check-in</h3>
            <p className="text-brand-muted">Fast, secure on-site badge scanning and verification.</p>
          </div>
          <div className="p-8 bg-brand-soft rounded-xl border border-brand-border">
            <h3 className="text-xl font-bold mb-4 text-brand-dark">Live Analytics</h3>
            <p className="text-brand-muted">Real-time operational awareness across venues.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
`);

writeComponent('FinalCTA.tsx', `
import React from 'react';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="py-32 bg-brand-dark text-center px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl font-bold text-white mb-8">Ready to build?</h2>
        <p className="text-xl text-gray-300 mb-12">Create, Manage, Operate, and Analyze from one platform.</p>
        <Link href="/signup" className="bg-brand-maroon text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-brand-maroon/90 inline-block">
          Create Your Event
        </Link>
      </div>
    </section>
  );
}
`);

writeComponent('Footer.tsx', `
import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-brand-border py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <div className="font-bold text-xl text-brand-dark mb-2">ARAM BTS</div>
          <div className="text-brand-muted">Events Beyond Boundaries</div>
        </div>
        <nav className="flex flex-wrap justify-center gap-8">
          <Link href="#platform" className="text-brand-muted hover:text-brand-dark">Platform</Link>
          <Link href="/pricing" className="text-brand-muted hover:text-brand-dark">Pricing</Link>
          <Link href="/about" className="text-brand-muted hover:text-brand-dark">About</Link>
          <Link href="/contact" className="text-brand-muted hover:text-brand-dark">Contact</Link>
          <Link href="/login" className="text-brand-muted hover:text-brand-dark">Login</Link>
        </nav>
      </div>
    </footer>
  );
}
`);

const pagePath = path.resolve('src/app/(marketing)/page.tsx');
fs.writeFileSync(pagePath, `
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
`.trim() + '\n');

console.log('Done rewriting marketing homepage architecture!');
