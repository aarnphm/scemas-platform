'use client'

import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertFrequencyChart } from '@/components/charts/alert-frequency-chart'
import { ZoneMetricsChart } from '@/components/charts/zone-metrics-chart'
import { PeriodSelector } from '@/components/period-selector'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { CHART_PERIODS } from '@/lib/chart-utils'
import { trpc } from '@/lib/trpc'
import { formatZoneName } from '@/lib/zones'

export function DashboardChartsPanel({ availableZones }: { availableZones: string[] }) {
  const [selectedZone, setSelectedZone] = useState(availableZones[0] ?? '')
  const [hours, setHours] = useState(6)
  const timeSeriesQuery = trpc.telemetry.getTimeSeries.useQuery(
    { zone: selectedZone, hours },
    {
      enabled: selectedZone.length > 0,
      refetchInterval: 30_000,
      placeholderData: keepPreviousData,
    },
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-balance">region metrics</h2>
        <div className="flex items-center gap-2">
          {timeSeriesQuery.isFetching ? <Spinner /> : null}
          <PeriodSelector periods={CHART_PERIODS} value={hours} onChange={setHours} />
          <select
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            onChange={e => setSelectedZone(e.target.value)}
            value={selectedZone}
          >
            {availableZones.map(zone => (
              <option key={zone} value={zone}>
                {formatZoneName(zone)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        {timeSeriesQuery.isError ? (
          <p className="h-72 text-sm text-destructive">{timeSeriesQuery.error.message}</p>
        ) : (
          <ZoneMetricsChart
            data={timeSeriesQuery.data ?? []}
            zoneName={formatZoneName(selectedZone)}
            hours={hours}
          />
        )}
      </div>
    </div>
  )
}

export function AlertFrequencyPanel() {
  const [hours, setHours] = useState(24)
  const frequencyQuery = trpc.alerts.frequency.useQuery(
    { hours },
    { refetchInterval: 30_000, placeholderData: keepPreviousData },
  )

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-balance">alert frequency</h2>
        <div className="flex items-center gap-2">
          {frequencyQuery.isFetching ? <Spinner /> : null}
          <PeriodSelector periods={CHART_PERIODS} value={hours} onChange={setHours} />
        </div>
      </div>
      <div className="mt-4 h-56">
        {frequencyQuery.isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : frequencyQuery.isError ? (
          <p className="text-sm text-destructive">{frequencyQuery.error.message}</p>
        ) : (
          <AlertFrequencyChart data={frequencyQuery.data ?? []} hours={hours} />
        )}
      </div>
    </div>
  )
}
