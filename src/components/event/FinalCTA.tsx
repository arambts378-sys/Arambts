import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="bg-brand-maroon py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-medium text-brand-white leading-tight tracking-tight mb-6">
          Be part of the conversation.
        </h2>
        <p className="text-xl md:text-2xl text-brand-cream/80 mb-12 max-w-2xl mx-auto font-light">
          Two days. One room. Ideas that move business forward.
        </p>
        
        <Link
          href="#registration"
          className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-brand-maroon bg-brand-white hover:bg-brand-soft transition-colors shadow-lg hover:shadow-xl rounded-sm"
        >
          Register Now
        </Link>
      </div>
    </section>
  );
}
