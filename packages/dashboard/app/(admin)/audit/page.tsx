// AlertAndAuditLogDB viewer (admin-only)
export default function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">audit logs</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">audit log table: auth events, alert actions, config changes (phase 6)</p>
      </div>
    </div>
  )
}
