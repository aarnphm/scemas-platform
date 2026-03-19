// MonitorSCEMASPlatformStatus boundary (DataDistributionManager)
import { ingestionFailures, platformStatus } from '@scemas/db/schema'
import { desc, eq } from 'drizzle-orm'

import { getDb } from '@/server/cached'
import { getInternalRustUrl } from '@/server/env'

type IngestionHealth = {
  total_received: number
  total_accepted: number
  total_rejected: number
}

export default async function HealthPage() {
  const db = getDb()
  const [statusRows, failureRows, ingestionHealth] = await Promise.all([
    db.query.platformStatus.findMany({
      orderBy: [desc(platformStatus.time)],
      limit: 10,
    }),
    db.query.ingestionFailures.findMany({
      where: eq(ingestionFailures.status, 'pending'),
      orderBy: [desc(ingestionFailures.createdAt)],
      limit: 10,
    }),
    fetchIngestionHealth(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">platform health</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">ingestion counters</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          received {ingestionHealth.total_received}, accepted {ingestionHealth.total_accepted}, rejected {ingestionHealth.total_rejected}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">durable downstream failures</h2>
        {failureRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            no unresolved ingest failures are recorded
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            {failureRows.map(row => (
              <div className="rounded-md border border-border/60 p-3" key={row.id}>
                <p className="font-medium">
                  {row.stage} | {row.sensorId} | {row.metricType}
                </p>
                <p className="text-xs text-muted-foreground">
                  zone {row.zone} | opened {row.createdAt.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{row.error}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">platform status history</h2>
        {statusRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            no platform status has been recorded yet
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {statusRows.map(row => (
              <p key={`${row.subsystem}-${row.time.toISOString()}`}>
                {row.subsystem}: {row.status}, latency {formatNumber(row.latencyMs)} ms, error rate {formatPercent(row.errorRate)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function fetchIngestionHealth(): Promise<IngestionHealth> {
  try {
    const response = await fetch(`${getInternalRustUrl()}/internal/health`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      return {
        total_received: 0,
        total_accepted: 0,
        total_rejected: 0,
      }
    }

    const payload = await response.json()
    if (!payload || typeof payload !== 'object') {
      return {
        total_received: 0,
        total_accepted: 0,
        total_rejected: 0,
      }
    }

    return {
      total_received: getNumericField(payload, 'total_received'),
      total_accepted: getNumericField(payload, 'total_accepted'),
      total_rejected: getNumericField(payload, 'total_rejected'),
    }
  } catch {
    return {
      total_received: 0,
      total_accepted: 0,
      total_rejected: 0,
    }
  }
}

function getNumericField(payload: Record<string, unknown>, key: string): number {
  if (!(key in payload)) {
    return 0
  }

  const value = payload[key]
  return typeof value === 'number' ? value : 0
}

function formatNumber(value: number | null): string {
  return value === null ? '--' : value.toFixed(1)
}

function formatPercent(value: number | null): string {
  return value === null ? '--' : `${(value * 100).toFixed(1)}%`
}
