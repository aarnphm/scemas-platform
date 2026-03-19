// PublicUserAgent: Presentation layer (PAC)
// minimal layout: no sidebar, no auth, large text for digital signage
// this agent shares the same view for public users + third-party developers
// ABSTRACTION: only aggregated, non-sensitive data is shown (ZoneAQI, not raw readings)

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-foreground text-background">
      <header className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-semibold">SCEMAS</h1>
        <p className="font-mono text-sm opacity-60">hamilton, ON</p>
      </header>
      <main className="px-8 pb-8">{children}</main>
    </div>
  )
}
