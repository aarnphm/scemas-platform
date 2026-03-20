import { notFound } from 'next/navigation'
import {
  MetricSubagentPanels,
  buildMetricSubagentPanels,
} from '@/components/operator/metric-subagent-panels'
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
      <h1 className="text-xl font-semibold text-balance">{formatZoneName(zone)} metrics</h1>
      <p className="text-sm text-muted-foreground text-pretty">
        region drill-down for the four sensor subagents. this is the operator view, so raw
        region-level telemetry remains visible.
      </p>
      <ZoneTimeSeriesPanel zone={zone} />
      <MetricSubagentPanels panels={panels} showZoneLinks={false} />
    </div>
  )
}
