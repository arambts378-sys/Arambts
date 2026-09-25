import { Metadata } from "next";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/shared/Card";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      description: "For simple events and workshops.",
      price: "PRICE PLACEHOLDER",
      features: [
        "Event management",
        "Event website",
        "Registration",
        "Basic attendee management",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Professional",
      description: "For complete corporate events and conferences.",
      price: "PRICE PLACEHOLDER",
      features: [
        "Full event workspace",
        "Advanced registration",
        "Ticket management",
        "Agenda & sessions",
        "Speakers",
        "Sponsors",
        "Exhibitors",
        "Operations",
        "Check-in",
        "Analytics",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large-scale portfolios and complex requirements.",
      price: "Custom",
      features: [
        "Advanced workspace controls",
        "Custom integrations",
        "Advanced permissions",
        "Enterprise support",
        "Custom requirements",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="bg-brand-soft min-h-screen py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-brand-dark leading-tight tracking-tight mb-6 uppercase">
            SIMPLE PRICING.<br />BUILT FOR EVENTS.
          </h1>
          <p className="text-xl text-brand-muted leading-relaxed">
            Choose the platform experience that fits the scale and complexity of your events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <Card key={idx} className={`flex flex-col relative ${plan.popular ? 'border-brand-maroon shadow-md border-2' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-maroon text-brand-white text-xs font-bold font-mono px-3 py-1 uppercase tracking-wider rounded-full">
                  Most Popular
                </div>
              )}
              <CardHeader className="pt-8 pb-6">
                <h3 className="text-2xl font-medium text-brand-dark mb-2">{plan.name}</h3>
                <p className="text-brand-muted h-12">{plan.description}</p>
                <div className="mt-6 font-mono text-3xl text-brand-dark tracking-tighter">
                  {plan.price}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-4">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start">
                      <svg className="h-5 w-5 text-brand-maroon mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-brand-dark">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-6 pb-8 border-t-0 bg-transparent">
                <Button variant={plan.popular ? "primary" : "outline"} className="w-full h-12">
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-24 max-w-3xl mx-auto text-center border-t border-brand-border pt-16">
          <h3 className="text-2xl font-medium text-brand-dark mb-6">You own your event.</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="bg-brand-white p-6 border border-brand-border shadow-sm">
              <h4 className="font-mono text-sm uppercase tracking-wider text-brand-maroon mb-4">Organizer Owns</h4>
              <ul className="space-y-2 text-brand-dark font-medium">
                <li>• Event</li>
                <li>• Ticket Pricing</li>
                <li>• Ticket Sales</li>
                <li>• Customer Relationship</li>
                <li>• Event Revenue</li>
              </ul>
            </div>
            <div className="bg-brand-white p-6 border border-brand-border shadow-sm">
              <h4 className="font-mono text-sm uppercase tracking-wider text-brand-muted mb-4">ARAM BTS Provides</h4>
              <ul className="space-y-2 text-brand-muted">
                <li>• Event management infrastructure</li>
                <li>• Registration capabilities</li>
                <li>• Payment integration support</li>
                <li>• Verification</li>
                <li>• Status synchronization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
