'use client'

import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { AuditEventChart } from '@/components/charts/audit-event-chart'
import { PeriodSelector } from '@/components/period-selector'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { CHART_PERIODS, periodLabel } from '@/lib/chart-utils'
import { trpc } from '@/lib/trpc'

export function AuditEventPanel() {
  const [hours, setHours] = useState(24)
  const query = trpc.audit.frequency.useQuery(
    { hours },
    { refetchInterval: 30_000, placeholderData: keepPreviousData },
  )

  const data = query.data ?? []
  const totalSuccess = data.reduce((sum, d) => sum + d.success, 0)
  const totalErrors = data.reduce((sum, d) => sum + d.errors, 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-balance">events ({periodLabel(hours)})</h2>
        <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          {query.isFetching ? <Spinner /> : null}
          <span>{totalSuccess} success</span>
          <span>{totalErrors} errors</span>
          <PeriodSelector periods={CHART_PERIODS} value={hours} onChange={setHours} />
        </div>
      </div>
      <div className="mt-2 h-40">
        {query.isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <AuditEventChart data={data} hours={hours} />
        )}
      </div>
    </div>
  )
}
