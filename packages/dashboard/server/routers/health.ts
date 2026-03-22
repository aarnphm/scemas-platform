// MonitorSCEMASPlatformStatus boundary

import { platformStatus } from '@scemas/db/schema'
import { desc } from 'drizzle-orm'
import { callRustEndpoint } from '../rust-client'
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
    try {
      const { data, status } = await callRustEndpoint('/internal/health', { method: 'GET' })

      if (status >= 400) {
        return { status: 'error' as const, message: 'rust engine unreachable' }
      }

      return { status: 'ok' as const, ...(isRecord(data) ? data : {}) }
    } catch {
      return { status: 'error' as const, message: 'rust engine not running' }
    }
  }),

  // server lifecycle phase (no auth, used by status indicators)
  lifecycle: publicProcedure.query(async () => {
    try {
      const { data, status } = await callRustEndpoint('/internal/health', { method: 'GET' })
      if (status >= 400 || !isRecord(data)) {
        return { phase: 'unreachable' as const, drainStage: null, inflight: 0 }
      }
      const lifecycle = isRecord(data.lifecycle) ? data.lifecycle : null
      return {
        phase: typeof lifecycle?.phase === 'string' ? lifecycle.phase : 'unknown',
        drainStage: typeof lifecycle?.drainStage === 'string' ? lifecycle.drainStage : null,
        inflight: typeof lifecycle?.inflight === 'number' ? lifecycle.inflight : 0,
      }
    } catch {
      return { phase: 'unreachable' as const, drainStage: null, inflight: 0 }
    }
  }),
})

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null
}
