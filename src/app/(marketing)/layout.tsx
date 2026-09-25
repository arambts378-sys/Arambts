import React from "react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-soft">
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
