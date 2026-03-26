import { useState, useMemo } from 'react'
import { useTauriQuery } from '@/lib/tauri'

const METRIC_TYPES = ['temperature', 'humidity', 'air_quality', 'noise_level']

export function SubscriptionsPage() {
  const readings = useTauriQuery<{ zone: string }[]>('telemetry_get_latest', { limit: 50 })
  const zones = useMemo(
    () => Array.from(new Set((readings.data ?? []).map(r => r.zone))).sort(),
    [readings.data],
  )

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(METRIC_TYPES)
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [minSeverity, setMinSeverity] = useState(1)
  const [webhookUrl, setWebhookUrl] = useState('')

  const toggleMetric = (m: string) =>
    setSelectedMetrics(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]))

  const toggleZone = (z: string) =>
    setSelectedZones(prev => (prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-balance">alert subscriptions</h1>
      <p className="text-sm text-muted-foreground">
        configure which alerts you receive notifications for.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">metric types</h2>
          <div className="space-y-2">
            {METRIC_TYPES.map(m => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(m)}
                  onChange={() => toggleMetric(m)}
                  className="rounded border-input"
                />
                {m.replace('_', ' ')}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">zones</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {zones.map(z => (
              <label key={z} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedZones.includes(z)}
                  onChange={() => toggleZone(z)}
                  className="rounded border-input"
                />
                {z.replaceAll('_', ' ')}
              </label>
            ))}
            {readings.isLoading && (
              <p className="text-xs text-muted-foreground">loading zones...</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">minimum severity</h2>
          <select
            value={minSeverity}
            onChange={e => setMinSeverity(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value={1}>low and above</option>
            <option value={2}>warning and above</option>
            <option value={3}>critical only</option>
          </select>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">webhook URL (optional)</h2>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/alerts"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            receives POST with alert payload when matching alerts fire
          </p>
        </div>
      </div>

      <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">
        save subscription
      </button>
    </div>
  )
}
