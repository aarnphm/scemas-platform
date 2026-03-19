import { AuditLogList } from '@/components/admin/audit-log-list'

// AlertAndAuditLogDB viewer (admin-only)
export default function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">audit logs</h1>
      <p className="text-sm text-muted-foreground">
        authentication events, device denials, alert actions, and permission changes land here
      </p>
      <AuditLogList />
    </div>
  )
}
