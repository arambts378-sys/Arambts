"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header({ event, section, websiteConfig }: any) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const content = section?.content || {};
  const logoText = content.logoText || "ARAM BTS";
  const showLogoText = content.showLogoText ?? true;
  const ctaText = content.ctaText || "Register Now";
  const showCta = content.showCta ?? true;
  const ctaDest = content.ctaDest || `/events/${event?.slug || event?.id}/register`;

  // Generate nav links based on visible sections
  const possibleNavSections = [
    { id: 'about', label: 'About' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'venue', label: 'Venue' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'exhibitors', label: 'Exhibitors' },
    { id: 'contact', label: 'Contact' },
  ];

  const navLinks = possibleNavSections
    .filter(nav => {
      const sec = websiteConfig?.sections?.find((s: any) => s.id === nav.id);
      return sec && sec.visible;
    })
    .map(nav => ({ label: nav.label, href: `#${nav.id}` }));

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-soft/90 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            {showLogoText && (
              <Link href="/" className="text-xl font-bold text-brand-maroon tracking-tight">
                {logoText}
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-brand-dark hover:text-brand-maroon transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            {showCta && (
              <Link
                href={ctaDest}
                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon transition-colors"
              >
                {ctaText}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-brand-dark hover:text-brand-maroon hover:bg-brand-border/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-maroon"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                /* Icon when menu is open */
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-brand-soft" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-brand-dark hover:text-brand-maroon hover:bg-brand-border/30"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {showCta && (
              <Link
                href={ctaDest}
                className="block w-full text-center mt-4 px-3 py-3 rounded-md text-base font-medium text-brand-white bg-brand-maroon hover:bg-brand-deep-maroon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
