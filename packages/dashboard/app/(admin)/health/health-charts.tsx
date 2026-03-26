'use client'

import { IngestionFunnelChart } from '@/components/charts/ingestion-funnel-chart'
import { PlatformHealthChart } from '@/components/charts/platform-health-chart'

export function IngestionFunnelWrapper({
  stats,
}: {
  stats: { totalReceived: number; totalAccepted: number; totalRejected: number }
}) {
  return (
    <IngestionFunnelChart
      stats={{
        received: stats.totalReceived,
        accepted: stats.totalAccepted,
        rejected: stats.totalRejected,
      }}
    />
  )
}

export function PlatformHealthWrapper({
  data,
}: {
  data: Array<{ time: string; latencyMs: number; errorRate: number }>
}) {
  const reversed = [...data].toReversed()
  return <PlatformHealthChart data={reversed} />
}
