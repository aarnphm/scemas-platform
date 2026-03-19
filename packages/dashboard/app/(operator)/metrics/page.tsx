import { MetricSubagentPanels, buildMetricSubagentPanels } from '@/components/operator/metric-subagent-panels'
import { createDb } from '@scemas/db'

import { createDataDistributionManager } from '@/server/data-distribution-manager'
import { getDatabaseUrl } from '@/server/env'

// VisualizeCityMetrics boundary (DataDistributionManager)
export default async function MetricsPage() {
  const db = createDb(getDatabaseUrl())
  const manager = createDataDistributionManager(db)
  const panels = buildMetricSubagentPanels(await manager.getLatestSensorReadings(200))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">city metrics</h1>
      <p className="text-sm text-muted-foreground">
        four distinct sensor subagents summarize the latest telemetry by metric family, with zone drill-downs for operators
      </p>
      <MetricSubagentPanels panels={panels} />
    </div>
  )
}
