// MonitorSCEMASPlatformStatus boundary

import { platformStatus } from '@scemas/db/schema'
import { desc } from 'drizzle-orm'
import { callRustEndpoint } from '../rust-client'
import { decodeIngestionHealth, decodeLifecycleHealth, fetchRustHealthPayload } from '../health'
import { router, publicProcedure, adminProcedure } from '../trpc'

export const healthRouter = router({
  // lightweight backend reachability check (no auth required)
  ping: publicProcedure.query(async () => {
    try {
      const { status } = await callRustEndpoint('/internal/health', { method: 'GET' })
      return { ok: status < 400 }
    } catch {
      return { ok: false }
    }
  }),

  // platform status from database
  status: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.platformStatus.findMany({ orderBy: [desc(platformStatus.time)], limit: 10 })
  }),

  // platform status time series (more rows for charting)
  statusTimeSeries: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.platformStatus.findMany({ orderBy: [desc(platformStatus.time)], limit: 50 })
  }),

  // ingestion health from rust engine
  ingestion: adminProcedure.query(async () => {
    const data = await fetchRustHealthPayload()

    if (!data) {
      return { status: 'error' as const, message: 'rust engine not running' }
    }

    return { status: 'ok' as const, ...decodeIngestionHealth(data) }
  }),

  // server lifecycle phase (no auth, used by status indicators)
  lifecycle: publicProcedure.query(async () => {
    const data = await fetchRustHealthPayload()

    if (!data) {
      return { phase: 'unreachable' as const, drainStage: null, inflight: 0 }
    }

    return decodeLifecycleHealth(data)
  }),
})
