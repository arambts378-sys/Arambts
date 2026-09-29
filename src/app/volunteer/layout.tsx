export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-surface-variant border-b border-outline-variant px-6 py-4">
        <h1 className="text-xl font-bold text-on-surface">Volunteer Portal</h1>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
