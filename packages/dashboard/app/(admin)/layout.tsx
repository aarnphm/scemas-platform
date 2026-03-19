// SystemAdminAgent: Presentation layer (PAC)
// Control: coordinates admin sidebar, admin auth gate
// Abstraction: rules, users, platform health, audit logs

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 border-r border-border bg-card p-4">
        <div className="mb-8">
          <h2 className="text-lg font-semibold">SCEMAS</h2>
          <p className="text-xs text-muted-foreground">system admin</p>
        </div>
        <ul className="space-y-1 text-sm">
          <li><a href="/rules" className="block rounded px-3 py-2 hover:bg-muted">threshold rules</a></li>
          <li><a href="/users" className="block rounded px-3 py-2 hover:bg-muted">users</a></li>
          <li><a href="/health" className="block rounded px-3 py-2 hover:bg-muted">platform health</a></li>
          <li><a href="/audit" className="block rounded px-3 py-2 hover:bg-muted">audit logs</a></li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
