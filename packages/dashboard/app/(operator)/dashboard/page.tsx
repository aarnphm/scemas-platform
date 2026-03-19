// CityOperatorAgent main dashboard view
// shows: map with sensors, metric cards, active alert list
// this is the primary Presentation component for the operator agent

import { Suspense } from 'react'
import { alerts } from '@scemas/db/schema'
import { desc, eq } from 'drizzle-orm'

import { getDb, getManager } from '@/server/cached'
import { Spinner } from '@/components/ui/spinner'

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">operator dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Suspense fallback={<SensorCoverageSkeleton />}>
          <SensorCoveragePanel />
        </Suspense>
        <Suspense fallback={<MetricCardsSkeleton />}>
          <MetricCards />
        </Suspense>
      </div>

      <Suspense fallback={<AlertsSkeleton />}>
        <ActiveAlertsPanel />
      </Suspense>
    </div>
  )
}

async function SensorCoveragePanel() {
  const manager = getManager()
  const latestReadings = await manager.getLatestSensorReadings(100)
  const coveredZones = new Set(latestReadings.map(reading => reading.zone)).size

  return (
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
  )
}

async function MetricCards() {
  const manager = getManager()
  const latestReadings = await manager.getLatestSensorReadings(100)
  const metricSummary = summarizeLatestMetrics(latestReadings)

  return (
    <div className="space-y-4">
      {metricSummary.map(metric => (
        <div key={metric.key} className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="font-mono text-2xl">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}

async function ActiveAlertsPanel() {
  const db = getDb()
  const activeAlerts = await db.query.alerts.findMany({
    where: eq(alerts.status, 'active'),
    orderBy: [desc(alerts.createdAt)],
    limit: 5,
  })

  return (
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
  )
}

function SensorCoverageSkeleton() {
  return (
    <div className="col-span-2 flex h-96 items-center justify-center rounded-lg border border-border bg-card p-4">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        loading sensor coverage
      </span>
    </div>
  )
}

function MetricCardsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-lg border border-border bg-card p-4" />
      ))}
    </div>
  )
}

function AlertsSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      <Spinner />
      loading alerts
    </div>
  )
}

function summarizeLatestMetrics(
  latestReadings: Awaited<ReturnType<ReturnType<typeof getManager>['getLatestSensorReadings']>>,
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
