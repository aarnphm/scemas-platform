import { MetricSubagentPanels, buildMetricSubagentPanels } from '@/components/operator/metric-subagent-panels'
import { createDb } from '@scemas/db'
import { notFound } from 'next/navigation'

import { createDataDistributionManager } from '@/server/data-distribution-manager'
import { getDatabaseUrl } from '@/server/env'

// zone drill-down: all 4 sensor subagent metrics for a specific zone
export default async function ZoneMetricsPage({
  params,
}: {
  params: Promise<{ zone: string }>
}) {
  const { zone } = await params
  const db = createDb(getDatabaseUrl())
  const manager = createDataDistributionManager(db)
  const readings = await manager.getRecentZoneReadings(zone, 120)

  if (readings.length === 0) {
    notFound()
  }

  const panels = buildMetricSubagentPanels(readings)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{zone.replaceAll('_', ' ')} metrics</h1>
      <p className="text-sm text-muted-foreground">
        zone drill-down for the four sensor subagents. this is the operator view, so raw zone-level telemetry remains visible.
      </p>
      <MetricSubagentPanels panels={panels} showZoneLinks={false} />
    </div>
  )
}
