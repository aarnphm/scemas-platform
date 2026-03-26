'use client'

import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { ZoneMetricsChart } from '@/components/charts/zone-metrics-chart'
import { PeriodSelector } from '@/components/period-selector'
import { Spinner } from '@/components/ui/spinner'
import { CHART_PERIODS } from '@/lib/chart-utils'
import { trpc } from '@/lib/trpc'
import { formatZoneName } from '@/lib/zones'

export function ZoneTimeSeriesPanel({ zone }: { zone: string }) {
  const [hours, setHours] = useState(6)
  const query = trpc.telemetry.getTimeSeries.useQuery(
    { zone, hours },
    { refetchInterval: 30_000, placeholderData: keepPreviousData },
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-balance">time series</h2>
        <div className="flex items-center gap-2">
          {query.isFetching ? <Spinner /> : null}
          <PeriodSelector periods={CHART_PERIODS} value={hours} onChange={setHours} />
        </div>
      </div>
      <div className="mt-4 h-72">
        {query.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : query.isError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{query.error.message}</p>
          </div>
        ) : (
          <ZoneMetricsChart data={query.data ?? []} zoneName={formatZoneName(zone)} hours={hours} />
        )}
      </div>
    </div>
  )
}
