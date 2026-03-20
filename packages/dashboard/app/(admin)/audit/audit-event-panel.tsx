'use client'

import { AuditEventChart } from '@/components/charts/audit-event-chart'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

export function AuditEventPanel() {
  const query = trpc.audit.frequency.useQuery({ hours: 24 }, { refetchInterval: 30_000 })

  if (query.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Spinner />
          loading event frequency
        </span>
      </div>
    )
  }

  const data = query.data ?? []
  const totalSuccess = data.reduce((sum, d) => sum + d.success, 0)
  const totalErrors = data.reduce((sum, d) => sum + d.errors, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">events (last 24h)</h2>
        <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          {query.isFetching ? <Spinner /> : null}
          <span>{totalSuccess} success</span>
          <span>{totalErrors} errors</span>
        </div>
      </div>
      <div className="mt-2">
        <AuditEventChart data={data} />
      </div>
    </div>
  )
}
