import React from "react";
import Link from "next/link";
import { Button } from "../shared/Button";

export function ProductShowcase() {
  return (
    <section className="bg-brand-dark py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-medium text-brand-white mb-16">
          A unified product experience.
        </h2>
        
        {/* Abstract UI representation */}
        <div className="relative mx-auto max-w-5xl">
          <div className="aspect-[16/10] bg-brand-soft rounded-sm overflow-hidden border border-brand-white/10 shadow-2xl flex flex-col">
            {/* Fake browser/app header */}
            <div className="h-12 border-b border-brand-border flex items-center px-4 space-x-2 bg-brand-white">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <div className="ml-4 h-6 w-64 bg-brand-soft rounded-sm border border-brand-border hidden sm:block"></div>
            </div>
            
            {/* App body */}
            <div className="flex-1 flex">
              {/* Sidebar */}
              <div className="w-48 border-r border-brand-border bg-brand-soft hidden md:flex flex-col py-4 px-3 space-y-2">
                <div className="h-6 w-2/3 bg-brand-dark/10 rounded mb-4"></div>
                <div className="h-8 w-full bg-brand-maroon/10 rounded border border-brand-maroon/20"></div>
                <div className="h-8 w-full bg-brand-dark/5 rounded"></div>
                <div className="h-8 w-full bg-brand-dark/5 rounded"></div>
                <div className="h-8 w-full bg-brand-dark/5 rounded"></div>
                <div className="h-8 w-full bg-brand-dark/5 rounded"></div>
              </div>
              
              {/* Main content */}
              <div className="flex-1 p-6 md:p-8 bg-brand-white flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <div className="h-8 w-1/3 bg-brand-dark/10 rounded"></div>
                  <div className="h-8 w-24 bg-brand-maroon rounded"></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="h-24 bg-brand-soft border border-brand-border rounded p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-brand-dark/20 rounded"></div>
                    <div className="h-8 w-1/3 bg-brand-dark rounded"></div>
                  </div>
                  <div className="h-24 bg-brand-soft border border-brand-border rounded p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-brand-dark/20 rounded"></div>
                    <div className="h-8 w-1/3 bg-brand-dark rounded"></div>
                  </div>
                  <div className="h-24 bg-brand-soft border border-brand-border rounded p-4 flex flex-col justify-between">
                    <div className="h-4 w-1/2 bg-brand-dark/20 rounded"></div>
                    <div className="h-8 w-1/3 bg-brand-dark rounded"></div>
                  </div>
                </div>
                
                <div className="flex-1 bg-brand-soft border border-brand-border rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="bg-brand-maroon py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-medium text-brand-white leading-tight tracking-tight mb-6">
          Build better events.<br />
          From one connected platform.
        </h2>
        <p className="text-xl md:text-2xl text-brand-cream/80 mb-12 max-w-3xl mx-auto font-light">
          Create your event, bring your team together, and manage the entire event lifecycle from one workspace.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/app/events/new">
            <Button size="lg" className="w-full sm:w-auto bg-brand-white text-brand-maroon hover:bg-brand-soft shadow-lg hover:shadow-xl">
              Create an Event
            </Button>
          </Link>
          <Link href="#platform">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-brand-white border-brand-white hover:bg-brand-white/10">
              Explore the Platform
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
