import { useTauriQuery } from '@/lib/tauri'

interface ZoneMetric {
  metricType: string
  value: number
  sampleCount: number | null
  time: string
}

interface ZoneSummary {
  zoneId: string
  metrics: ZoneMetric[]
}

function findMetric(metrics: ZoneMetric[], type: string): number | null {
  return metrics.find(m => m.metricType === type)?.value ?? null
}

function aqiColor(aqi: number | null): string {
  if (aqi == null) return 'border-muted bg-muted/30'
  if (aqi <= 50) return 'border-green-500/40 bg-green-500/5'
  if (aqi <= 100) return 'border-yellow-500/40 bg-yellow-500/5'
  if (aqi <= 150) return 'border-orange-500/40 bg-orange-500/5'
  return 'border-red-500/40 bg-red-500/5'
}

function aqiLabel(aqi: number | null): string {
  if (aqi == null) return 'no data'
  if (aqi <= 50) return 'good'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'unhealthy (sensitive)'
  return 'unhealthy'
}

export function DisplayPage() {
  const zones = useTauriQuery<ZoneSummary[]>('public_zone_summary', {}, { refetchInterval: 10_000 })

  if (zones.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading...</p>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">air quality display</h1>
        <p className="text-sm text-muted-foreground">
          {(zones.data ?? []).length} monitoring regions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(zones.data ?? []).map(z => {
          const temp = findMetric(z.metrics, 'temperature')
          const humidity = findMetric(z.metrics, 'humidity')
          const aqi = findMetric(z.metrics, 'air_quality')
          const noise = findMetric(z.metrics, 'noise_level')
          const latestTime = z.metrics[0]?.time

          return (
            <div key={z.zoneId} className={`rounded-lg border-2 p-4 space-y-3 ${aqiColor(aqi)}`}>
              <h2 className="font-medium">{z.zoneId.replaceAll('_', ' ')}</h2>

              {aqi != null && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">{aqi.toFixed(0)}</span>
                  <span className="text-sm text-muted-foreground">{aqiLabel(aqi)}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-sm">
                <MetricCell label="temp" value={temp} unit="°C" />
                <MetricCell label="humidity" value={humidity} unit="%" />
                <MetricCell label="noise" value={noise} unit="dB" />
              </div>

              {latestTime && (
                <p className="text-xs text-muted-foreground">
                  {new Date(latestTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetricCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="tabular-nums font-medium">
        {value != null ? `${value.toFixed(1)}${unit}` : 'n/a'}
      </p>
    </div>
  )
}
