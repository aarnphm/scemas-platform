'use client'

import { ZoneMetricsChart } from '@/components/charts/zone-metrics-chart'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

export function ZoneTimeSeriesPanel({ zone }: { zone: string }) {
  const query = trpc.telemetry.getTimeSeries.useQuery(
    { zone, hours: 6 },
    { refetchInterval: 30_000 },
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">time series (last 6h)</h2>
        {query.isFetching ? <Spinner /> : null}
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
          <ZoneMetricsChart data={query.data ?? []} />
        )}
      </div>
    </div>
  )
}
