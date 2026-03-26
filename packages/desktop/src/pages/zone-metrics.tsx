import { useParams } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTauriQuery } from '@/lib/tauri'

interface TimeSeriesPoint {
  time: string
  temperature: number | null
  humidity: number | null
  airQuality: number | null
  noiseLevel: number | null
}

const METRIC_KEYS = ['temperature', 'humidity', 'airQuality', 'noiseLevel'] as const

const METRIC_LABELS: Record<string, string> = {
  temperature: 'temperature subagent',
  humidity: 'humidity subagent',
  airQuality: 'air quality subagent',
  noiseLevel: 'noise subagent',
}

const METRIC_LEGEND: Record<string, string> = {
  temperature: 'temperature (c)',
  humidity: 'humidity (%)',
  airQuality: 'air quality (ug/m3)',
  noiseLevel: 'noise (db)',
}

const METRIC_UNITS: Record<string, string> = {
  temperature: 'c',
  humidity: '%',
  airQuality: 'ug/m3',
  noiseLevel: 'db',
}

const METRIC_COLORS: Record<string, string> = {
  temperature: '#ea9a97',
  humidity: '#e8813a',
  airQuality: '#a692c3',
  noiseLevel: '#a0430a',
}

const PERIOD_OPTIONS = [
  { label: '3h', value: 3 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
] as const

export function ZoneMetricsPage() {
  const { zone } = useParams({ strict: false })
  const [hours, setHours] = useState(168)

  const series = useTauriQuery<TimeSeriesPoint[]>(
    'telemetry_time_series',
    { zone, hours },
    { placeholderData: prev => prev },
  )

  const chartData = useMemo(
    () =>
      (series.data ?? []).map(pt => ({
        time: new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: pt.temperature,
        humidity: pt.humidity,
        airQuality: pt.airQuality,
        noiseLevel: pt.noiseLevel,
      })),
    [series.data],
  )

  const summaries = useMemo(() => {
    const result: Record<string, { avg: number; count: number; latest: number | null }> = {}
    for (const key of METRIC_KEYS) {
      let total = 0
      let count = 0
      let latest: number | null = null
      for (const pt of series.data ?? []) {
        const v = pt[key]
        if (v != null) {
          total += v
          count++
          latest = v
        }
      }
      result[key] = { avg: count > 0 ? total / count : 0, count, latest }
    }
    return result
  }, [series.data])

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">
          {(zone ?? '').replaceAll('_', ' ')} metrics
        </h1>
        <p className="text-sm text-muted-foreground">
          region drill-down for the four sensor subagents
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">time series</h2>
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setHours(o.value)}
                className={`h-7 rounded-md px-2 text-xs font-medium transition-colors ${
                  hours === o.value
                    ? 'border border-input bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-80">
          {series.isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <span className="text-sm text-muted-foreground">loading...</span>
            </div>
          )}
          {chartData.length === 0 && !series.isFetching ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground text-pretty">
                no data for {(zone ?? '').replaceAll('_', ' ')}, last{' '}
                {PERIOD_OPTIONS.find(o => o.value === hours)?.label ?? `${hours}h`}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {METRIC_KEYS.map(key => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={METRIC_LEGEND[key]}
                    stroke={METRIC_COLORS[key]}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {METRIC_KEYS.map(key => {
          const s = summaries[key]
          return (
            <div key={key} className="rounded-lg border p-5 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {METRIC_LABELS[key]}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-4xl font-semibold tabular-nums">
                  {s.count > 0 ? s.avg.toFixed(1) : '\u2014'}
                </p>
                <span className="text-sm text-muted-foreground">{METRIC_UNITS[key]}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.count} sensors</span>
                {s.latest != null && <span>latest {s.latest.toFixed(1)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
