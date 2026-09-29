import Link from "next/link";

export default function Footer({ event, section }: any) {
  const content = section?.content || {};

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
          <div className="mb-8 md:mb-0 max-w-sm">
            <h3 className="text-2xl font-bold text-brand-maroon tracking-tight mb-2">
              {content.logoText || "ARAM BTS"}
            </h3>
            <p className="text-brand-cream/60 font-medium">
              {content.description || "Building the future of business and technology through meaningful connections."}
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
            &copy; {new Date().getFullYear()} {content.copyrightText || "ARAM BTS. All rights reserved."}
          </p>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {(content.showSocial ?? true) && (
              <div className="flex space-x-4 mb-2 md:mb-0 md:mr-4">
                <Link href="#" className="hover:text-brand-white transition-colors" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
                <Link href="#" className="hover:text-brand-white transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
            <div className="flex space-x-6">
              <Link href="#" className="hover:text-brand-cream/80 transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-brand-cream/80 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
