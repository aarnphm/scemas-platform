import { Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useTauriQuery } from '@/lib/tauri'
import { useAuthStore } from '@/store/auth'

interface SensorReading {
  id: number
  sensorId: string
  metricType: string
  value: number
  zone: string
  time: string
}

interface TimeSeriesPoint {
  time: string
  temperature: number | null
  humidity: number | null
  airQuality: number | null
  noiseLevel: number | null
}

interface AlertFrequencyPoint {
  hour: string
  low: number
  warning: number
  critical: number
}

interface Alert {
  id: string
  ruleId: string | null
  sensorId: string
  severity: number
  status: string
  triggeredValue: number
  zone: string
  metricType: string
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  resolvedAt: string | null
  createdAt: string
}

interface CursorPage {
  items: Alert[]
  nextCursor: string | null
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

const SEVERITY_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Low', cls: 'bg-green-500/15 text-green-700' },
  2: { label: 'Warning', cls: 'bg-amber-500/15 text-amber-700' },
  3: { label: 'Critical', cls: 'bg-red-500/15 text-red-700' },
}

const PERIOD_OPTIONS = [
  { label: '3h', value: 3 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
] as const

interface MetricGroup {
  avg: number
  count: number
  latestTime: string
}

export function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const [chartHours, setChartHours] = useState(6)
  const [chartZone, setChartZone] = useState('')
  const [freqHours, setFreqHours] = useState(24)

  const readings = useTauriQuery<SensorReading[]>('telemetry_get_latest', { limit: 200 })

  const availableZones = useMemo(() => {
    const zones = new Set((readings.data ?? []).map(r => r.zone))
    return Array.from(zones).sort()
  }, [readings.data])

  const effectiveZone = chartZone || availableZones[0] || ''

  const timeSeries = useTauriQuery<TimeSeriesPoint[]>(
    'telemetry_time_series',
    { zone: effectiveZone, hours: chartHours },
    { enabled: effectiveZone !== '', placeholderData: prev => prev },
  )

  const alerts = useTauriQuery<CursorPage>('alerts_list', { limit: 50 })

  const alertFreq = useTauriQuery<AlertFrequencyPoint[]>(
    'alerts_frequency',
    { hours: freqHours },
    { placeholderData: prev => prev },
  )

  const grouped = useMemo(() => {
    const map: Record<string, MetricGroup> = {}
    for (const r of readings.data ?? []) {
      const g = map[r.metricType]
      if (!g) {
        map[r.metricType] = { avg: r.value, count: 1, latestTime: r.time }
      } else {
        g.avg = (g.avg * g.count + r.value) / (g.count + 1)
        g.count++
        if (r.time > g.latestTime) g.latestTime = r.time
      }
    }
    return map
  }, [readings.data])

  const activeAlerts = useMemo(
    () => (alerts.data?.items ?? []).filter(a => a.status !== 'resolved').slice(0, 8),
    [alerts.data],
  )

  const chartData = useMemo(
    () =>
      (timeSeries.data ?? []).map(pt => ({
        time: new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: pt.temperature,
        humidity: pt.humidity,
        airQuality: pt.airQuality,
        noiseLevel: pt.noiseLevel,
      })),
    [timeSeries.data],
  )

  const freqData = useMemo(
    () =>
      (alertFreq.data ?? []).map(pt => ({
        hour: new Date(pt.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        low: pt.low,
        warning: pt.warning,
        critical: pt.critical,
      })),
    [alertFreq.data],
  )

  const latestReadings = useMemo(() => (readings.data ?? []).slice(0, 12), [readings.data])

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-balance">operator dashboard</h1>
        <span className="text-xs text-muted-foreground">{user?.email}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {METRIC_TYPES.map(m => {
          const g = grouped[m]
          return (
            <div key={m} className="rounded-lg border p-4 space-y-1">
              <p className="text-sm text-muted-foreground">{METRIC_LABELS[m]}</p>
              <p className="text-2xl font-semibold tabular-nums">
                {g ? g.avg.toFixed(2) : '\u2014'}{' '}
                <span className="text-sm font-normal text-muted-foreground">{METRIC_UNITS[m]}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {g ? `${g.count} sensors` : 'no data'}
              </p>
              <p className="text-xs text-muted-foreground">
                {g ? new Date(g.latestTime).toLocaleTimeString() : ''}
              </p>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">region metrics</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {PERIOD_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setChartHours(o.value)}
                  className={`h-7 rounded-md px-2 text-xs font-medium ${
                    chartHours === o.value
                      ? 'border border-input bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <select
              value={effectiveZone}
              onChange={e => setChartZone(e.target.value)}
              className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
            >
              {availableZones.map(z => (
                <option key={z} value={z}>
                  {z.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative h-72">
          {timeSeries.isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <span className="text-sm text-muted-foreground">loading...</span>
            </div>
          )}
          {chartData.length === 0 && !timeSeries.isFetching ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground text-pretty">
                no data for {effectiveZone ? effectiveZone.replaceAll('_', ' ') : 'selected zone'},
                last {PERIOD_OPTIONS.find(o => o.value === chartHours)?.label ?? `${chartHours}h`}
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
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="temperature (c)"
                  stroke="#ea9a97"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  name="humidity (%)"
                  stroke="#e8813a"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="airQuality"
                  name="air quality (ug/m3)"
                  stroke="#a692c3"
                  dot={false}
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="noiseLevel"
                  name="noise (db)"
                  stroke="#a0430a"
                  dot={false}
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">live sensor feed</h2>
          </div>
          {readings.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">sensor</th>
                    <th className="px-4 py-2 font-medium">metric</th>
                    <th className="px-4 py-2 font-medium">value</th>
                    <th className="px-4 py-2 font-medium">zone</th>
                    <th className="px-4 py-2 font-medium">time</th>
                  </tr>
                </thead>
                <tbody>
                  {latestReadings.map(r => (
                    <tr key={`${r.sensorId}-${r.id}`} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{r.sensorId}</td>
                      <td className="px-4 py-2">{r.metricType.replace('_', ' ')}</td>
                      <td className="px-4 py-2 tabular-nums">{r.value.toFixed(2)}</td>
                      <td className="px-4 py-2">{r.zone}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(r.time).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">active alerts</h2>
            <Link
              to="/alerts"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              view all
            </Link>
          </div>
          {alerts.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">loading...</p>
          ) : activeAlerts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">no active alerts</p>
          ) : (
            <ul className="divide-y">
              {activeAlerts.map(a => {
                const sev = SEVERITY_LABEL[a.severity] ?? SEVERITY_LABEL[1]
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sev.cls}`}>
                      {sev.label}
                    </span>
                    <span className="truncate">{a.zone}</span>
                    <span className="text-muted-foreground">{a.metricType.replace('_', ' ')}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </span>
                    <Link
                      to="/alerts/$alertId"
                      params={{ alertId: a.id }}
                      className="text-xs underline"
                    >
                      view
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">alert frequency</h2>
          <div className="flex items-center gap-1">
            {(
              [
                { label: '6h', value: 6 },
                { label: '24h', value: 24 },
                { label: '7d', value: 168 },
                { label: '30d', value: 720 },
              ] as const
            ).map(o => (
              <button
                key={o.value}
                onClick={() => setFreqHours(o.value)}
                className={`h-7 rounded-md px-2 text-xs font-medium ${
                  freqHours === o.value
                    ? 'border border-input bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-56">
          {alertFreq.isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <span className="text-sm text-muted-foreground">loading...</span>
            </div>
          )}
          {freqData.length === 0 && !alertFreq.isFetching ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                no alerts recorded in this time window
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="low" stackId="a" fill="#f5c77e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#e8813a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="critical" stackId="a" fill="#a0430a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
