'use client'

import { ZoneAQISchema, type ZoneAQI } from '@scemas/types'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { formatZoneName } from '@/lib/zones'
import { ZoneAqiBarChart } from './zone-aqi-bar-chart'

export function ZoneAqiGrid() {
  const regionAqi = useQuery({
    queryKey: ['public-zone-aqi'],
    queryFn: fetchZoneAqi,
    refetchInterval: 10_000,
  })
  const regions = regionAqi.data ?? []

  if (regionAqi.isLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          loading monitoring region data
        </span>
      </div>
    )
  }

  if (regionAqi.isError) {
    return (
      <div className="rounded-xl bg-card p-6 text-sm text-muted-foreground">
        unable to load public monitoring region air quality data right now
      </div>
    )
  }

  if (!regions.length) {
    return (
      <div className="rounded-xl bg-card p-6 text-sm text-muted-foreground">
        no aggregated telemetry is available yet. run the seed flow and wait for the analytics
        windows to fill.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            monitoring regions
          </p>
          <p className="mt-2 font-mono text-3xl tabular-nums">{regions.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            public rollup across named hamilton monitoring regions
          </p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            boundary source
          </p>
          <p className="mt-2 text-lg font-medium text-foreground">official planning units</p>
          <p className="mt-1 text-sm text-muted-foreground">
            display labels are public-facing regions, not parcel zoning or raw planning-unit ids
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regions.map(region => (
          <article
            className="flex min-h-[180px] flex-col justify-between rounded-xl border border-border/50 bg-card p-6"
            key={region.zone}
          >
            <p className="text-sm text-muted-foreground text-pretty">
              {formatZoneName(region.zone, 'title')}
            </p>
            <div className="py-3 text-center">
              <p
                className="font-mono text-6xl font-bold tabular-nums"
                style={{ color: aqiColor(region.aqi) }}
              >
                {region.aqi}
              </p>
              <p className="mt-1 text-xs uppercase text-muted-foreground">{region.label}</p>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">
                {formatMetric(region.temperature, 'temp')}
              </span>
              <span className="font-mono tabular-nums">
                {formatMetric(region.humidity, 'humidity')}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <ZoneAqiBarChart zones={regions} />
      </div>

      <p className="text-center text-xs text-muted-foreground/40">
        public monitoring-region feed: <code>/api/v1/zones/aqi</code>, refreshes every 10 seconds
      </p>
    </div>
  )
}

async function fetchZoneAqi(): Promise<ZoneAQI[]> {
  const response = await fetch('/api/v1/zones/aqi')
  if (!response.ok) {
    throw new Error('public API request failed')
  }

  const payload = await response.json()
  return ZoneAQISchema.array().parse(payload)
}

function formatMetric(value: number | undefined, label: string): string {
  if (value === undefined) {
    return `${label}: --`
  }

  return `${label}: ${value}`
}

function aqiColor(aqi: number): string {
  if (aqi <= 50) return 'oklch(0.837 0.128 66.29)'
  if (aqi <= 100) return 'oklch(0.705 0.213 47.604)'
  if (aqi <= 150) return 'oklch(0.646 0.222 41.116)'
  if (aqi <= 200) return '#ea9a97'
  if (aqi <= 300) return 'oklch(0.553 0.195 38.402)'
  return 'oklch(0.47 0.157 37.304)'
}
