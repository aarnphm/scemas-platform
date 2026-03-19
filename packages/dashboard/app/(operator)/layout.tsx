// CityOperatorAgent: Presentation layer (PAC)
// this layout is the Control component: coordinates sidebar nav, auth gate, data fetching
// children are the Presentation views: dashboard, alerts, subscriptions, metrics

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* sidebar nav */}
      <nav className="w-56 border-r border-border bg-card p-4">
        <div className="mb-8">
          <h2 className="text-lg font-semibold">SCEMAS</h2>
          <p className="text-xs text-muted-foreground">city operator</p>
        </div>
        <ul className="space-y-1 text-sm">
          <li><a href="/dashboard" className="block rounded px-3 py-2 hover:bg-muted">dashboard</a></li>
          <li><a href="/alerts" className="block rounded px-3 py-2 hover:bg-muted">alerts</a></li>
          <li><a href="/subscriptions" className="block rounded px-3 py-2 hover:bg-muted">subscriptions</a></li>
          <li><a href="/metrics" className="block rounded px-3 py-2 hover:bg-muted">metrics</a></li>
        </ul>
      </nav>
      {/* main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
