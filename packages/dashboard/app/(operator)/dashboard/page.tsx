// CityOperatorAgent main dashboard view
// shows: map with sensors, metric cards, active alert list
// this is the primary Presentation component for the operator agent

import { createDb } from '@scemas/db'
import { alerts } from '@scemas/db/schema'
import { desc, eq } from 'drizzle-orm'

import { createDataDistributionManager } from '@/server/data-distribution-manager'
import { getDatabaseUrl } from '@/server/env'

export default async function OperatorDashboard() {
  const db = createDb(getDatabaseUrl())
  const manager = createDataDistributionManager(db)
  const [latestReadings, activeAlerts] = await Promise.all([
    manager.getLatestSensorReadings(100),
    db.query.alerts.findMany({
      where: eq(alerts.status, 'active'),
      orderBy: [desc(alerts.createdAt)],
      limit: 5,
    }),
  ])

  const metricSummary = summarizeLatestMetrics(latestReadings)
  const coveredZones = new Set(latestReadings.map(reading => reading.zone)).size

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">operator dashboard</h1>

      {/* map + metrics grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-96 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium">live sensor coverage</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestReadings.length} latest sensor streams across {coveredZones} zones
          </p>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {latestReadings.slice(0, 8).map(reading => (
              <p key={`${reading.sensorId}-${reading.time.toISOString()}`}>
                {reading.sensorId}: {reading.metricType} {reading.value} in {reading.zone}
              </p>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {metricSummary.map(metric => (
            <div key={metric.key} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="font-mono text-2xl">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">active alerts</h2>
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">no active alerts right now</p>
        ) : (
          <div className="space-y-2 text-sm">
            {activeAlerts.map(alert => (
              <p key={alert.id}>
                {alert.zone}: {alert.metricType} at {alert.triggeredValue} ({alert.status})
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function summarizeLatestMetrics(
  latestReadings: Awaited<ReturnType<ReturnType<typeof createDataDistributionManager>['getLatestSensorReadings']>>,
) {
  const metrics = new Map<string, { total: number; count: number }>()

  for (const reading of latestReadings) {
    const aggregate = metrics.get(reading.metricType) ?? { total: 0, count: 0 }
    aggregate.total += reading.value
    aggregate.count += 1
    metrics.set(reading.metricType, aggregate)
  }

  return [
    formatMetricSummary('temperature', 'temperature', metrics.get('temperature')),
    formatMetricSummary('humidity', 'humidity', metrics.get('humidity')),
    formatMetricSummary('air_quality', 'air quality', metrics.get('air_quality')),
    formatMetricSummary('noise_level', 'noise level', metrics.get('noise_level')),
  ]
}

function formatMetricSummary(
  metricKey: string,
  label: string,
  summary: { total: number; count: number } | undefined,
) {
  if (!summary || summary.count === 0) {
    return { key: metricKey, label, value: '--' }
  }

  const average = Math.round((summary.total / summary.count) * 10) / 10
  return { key: metricKey, label, value: `${average}` }
}
