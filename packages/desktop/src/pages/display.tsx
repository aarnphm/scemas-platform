import { useTauriQuery } from '@/lib/tauri'

interface ZoneSummary {
  zone: string
  zoneName: string
  aqi: number
  aqiLabel: string
  temperature: number | null
  humidity: number | null
  noiseLevel: number | null
  lastUpdated: string | null
  freshnessSeconds: number | null
}

function aqiColor(aqi: number): string {
  if (aqi <= 50) return 'border-green-500/40 bg-green-500/5'
  if (aqi <= 100) return 'border-yellow-500/40 bg-yellow-500/5'
  if (aqi <= 150) return 'border-orange-500/40 bg-orange-500/5'
  return 'border-red-500/40 bg-red-500/5'
}

export function DisplayPage() {
  const zones = useTauriQuery<ZoneSummary[]>('public_zone_summary', {})

  if (zones.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading...</p>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">air quality display</h1>
        <p className="text-sm text-muted-foreground">public zone summary</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(zones.data ?? []).map(z => (
          <div key={z.zone} className={`rounded-lg border-2 p-4 space-y-3 ${aqiColor(z.aqi)}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{z.zoneName}</h2>
              <span className="text-xs text-muted-foreground">{z.zone}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{z.aqi}</span>
              <span className="text-sm text-muted-foreground">{z.aqiLabel}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <MetricCell label="temp" value={z.temperature} unit="°C" />
              <MetricCell label="humidity" value={z.humidity} unit="%" />
              <MetricCell label="noise" value={z.noiseLevel} unit="dB" />
            </div>

            {z.lastUpdated && (
              <p className="text-xs text-muted-foreground">
                updated{' '}
                {z.freshnessSeconds != null
                  ? `${z.freshnessSeconds}s ago`
                  : new Date(z.lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
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
