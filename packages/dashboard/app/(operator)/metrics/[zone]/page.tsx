import { notFound } from 'next/navigation'
import { buildMetricSubagentPanels } from '@/lib/metric-panels'
import { formatZoneName } from '@/lib/zones'
import { getManager } from '@/server/cached'
import { ZoneTimeSeriesPanel } from './zone-time-series'

// region drill-down: all 4 sensor subagent metrics for a specific monitoring region
export default async function ZoneMetricsPage({ params }: { params: Promise<{ zone: string }> }) {
  const { zone } = await params
  const manager = getManager()
  const readings = await manager.getRecentZoneReadings(zone, 120)

  if (readings.length === 0) {
    notFound()
  }

  const panels = buildMetricSubagentPanels(readings)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">{formatZoneName(zone)} metrics</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          region drill-down for the four sensor subagents
        </p>
      </div>
      <ZoneTimeSeriesPanel zone={zone} />
      <div className="grid gap-4 md:grid-cols-2">
        {panels.map(panel => {
          const zoneData = panel.zones[0]
          return (
            <div className="rounded-lg border border-border bg-card p-4" key={panel.metricType}>
              <p className="text-xs uppercase text-muted-foreground">{panel.title}</p>
              <p className="mt-1 font-mono text-3xl tabular-nums">
                {zoneData?.averageValue ?? '--'}{' '}
                <span className="text-sm text-muted-foreground">{panel.unit}</span>
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{zoneData?.sensorCount ?? 0} sensors</span>
                <span>latest {zoneData?.latestValue ?? '--'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
