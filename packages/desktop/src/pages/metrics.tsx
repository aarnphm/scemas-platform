import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTauriQuery } from '@/lib/tauri'

interface SensorReading {
  id: number
  sensorId: string
  metricType: string
  value: number
  zone: string
  time: string
}

const METRIC_TYPES = ['temperature', 'humidity', 'air_quality', 'noise_level'] as const

const METRIC_LABELS: Record<string, string> = {
  temperature: 'temperature',
  humidity: 'humidity',
  air_quality: 'air quality',
  noise_level: 'noise level',
}

const METRIC_UNITS: Record<string, string> = {
  temperature: '\u00b0C',
  humidity: '%',
  air_quality: 'AQI',
  noise_level: 'dB',
}

interface ZoneBreakdown {
  zone: string
  avg: number
  count: number
}

interface MetricSummary {
  avg: number
  count: number
  latestTime: string
  zones: ZoneBreakdown[]
}

export function MetricsPage() {
  const readings = useTauriQuery<SensorReading[]>('telemetry_get_latest', { limit: 200 })

  const grouped = useMemo(() => {
    const map: Record<
      string,
      {
        total: number
        count: number
        latestTime: string
        zones: Record<string, { total: number; count: number }>
      }
    > = {}

    for (const r of readings.data ?? []) {
      if (!map[r.metricType]) {
        map[r.metricType] = { total: 0, count: 0, latestTime: r.time, zones: {} }
      }
      const g = map[r.metricType]
      g.total += r.value
      g.count++
      if (r.time > g.latestTime) g.latestTime = r.time

      if (!g.zones[r.zone]) {
        g.zones[r.zone] = { total: 0, count: 0 }
      }
      g.zones[r.zone].total += r.value
      g.zones[r.zone].count++
    }

    const result: Record<string, MetricSummary> = {}
    for (const [metric, g] of Object.entries(map)) {
      const zones: ZoneBreakdown[] = Object.entries(g.zones)
        .map(([zone, z]) => ({ zone, avg: z.total / z.count, count: z.count }))
        .sort((a, b) => a.zone.localeCompare(b.zone))

      result[metric] = {
        avg: g.count > 0 ? g.total / g.count : 0,
        count: g.count,
        latestTime: g.latestTime,
        zones,
      }
    }
    return result
  }, [readings.data])

  if (readings.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading...</p>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <h1 className="text-xl font-semibold text-balance">metrics</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {METRIC_TYPES.map(m => {
          const g = grouped[m]
          return (
            <div key={m} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{METRIC_LABELS[m]}</h2>
                <span className="text-xs text-muted-foreground">{METRIC_UNITS[m]}</span>
              </div>

              {g ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-semibold tabular-nums">{g.avg.toFixed(2)}</p>
                    <span className="text-sm text-muted-foreground">{METRIC_UNITS[m]}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{g.count} sensors</span>
                    <span>{new Date(g.latestTime).toLocaleTimeString()}</span>
                  </div>

                  <div className="space-y-1 pt-1 border-t">
                    <p className="text-xs font-medium text-muted-foreground pt-1">by zone</p>
                    {g.zones.map(z => (
                      <Link
                        key={z.zone}
                        to="/metrics/$zone"
                        params={{ zone: z.zone }}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-secondary transition-colors"
                      >
                        <span>{z.zone}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {z.avg.toFixed(2)} {METRIC_UNITS[m]}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">no data</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
