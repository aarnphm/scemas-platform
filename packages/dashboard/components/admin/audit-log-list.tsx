'use client'

import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

export function AuditLogList() {
  const auditQuery = trpc.audit.list.useQuery({ limit: 50 })

  if (auditQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Spinner />
          loading audit logs
        </span>
      </div>
    )
  }

  if (auditQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-card p-4 text-sm text-destructive">
        {auditQuery.error.message}
      </div>
    )
  }

  const logs = auditQuery.data ?? []

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        recent audit events
      </div>
      {logs.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          no audit events have been recorded yet
        </p>
      ) : (
        <div className="divide-y divide-border">
          {logs.map(log => (
            <div className="space-y-2 px-4 py-4" key={log.id}>
              <p className="text-sm font-medium">{log.action}</p>
              <p className="text-xs text-muted-foreground">
                actor: {log.userId ?? 'system'} | {log.createdAt.toLocaleString()}
              </p>
              <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                {formatAuditDetails(log.details)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatAuditDetails(details: unknown): string {
  if (details === null || details === undefined) {
    return 'no structured details recorded'
  }

  if (typeof details === 'string') {
    return details
  }

  return JSON.stringify(details, null, 2)
}
