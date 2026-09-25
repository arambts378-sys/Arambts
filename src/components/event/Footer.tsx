import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: "About", href: "#about" },
    { label: "Speakers", href: "#speakers" },
    { label: "Agenda", href: "#agenda" },
    { label: "Venue", href: "#venue" },
    { label: "Sponsors", href: "#sponsors" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <footer className="bg-brand-dark py-16 md:py-24 text-brand-white border-t border-brand-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16">
          <div className="mb-8 md:mb-0">
            <h3 className="text-2xl font-bold text-brand-maroon tracking-tight mb-2">
              ARAM BTS
            </h3>
            <p className="text-brand-cream/60 font-medium">
              Events Beyond Boundaries
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-4">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-brand-cream/80 hover:text-brand-white transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="pt-8 border-t border-brand-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-brand-cream/40">
          <p>
            &copy; {Math.max(currentYear, 2027)} ARAM BTS. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <Link href="#" className="hover:text-brand-cream/80 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-brand-cream/80 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
