// zone drill-down: all 4 sensor subagent metrics for a specific zone
export default function ZoneMetricsPage({ params }: { params: Promise<{ zone: string }> }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">zone detail</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">4 sensor subagent charts: temperature, humidity, air quality, noise (phase 6)</p>
      </div>
    </div>
  )
}
