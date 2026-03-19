// MonitorSCEMASPlatformStatus boundary

import { router, protectedProcedure } from '../trpc'
import { platformStatus } from '@scemas/db/schema'
import { desc } from 'drizzle-orm'

const RUST_URL = process.env.INTERNAL_RUST_URL ?? 'http://localhost:3001'

export const healthRouter = router({
  // platform status from database
  status: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.platformStatus.findMany({
        orderBy: [desc(platformStatus.time)],
        limit: 10,
      })
    }),

  // ingestion health from rust engine
  ingestion: protectedProcedure
    .query(async () => {
      try {
        const res = await fetch(`${RUST_URL}/internal/health`)
        if (!res.ok) return { status: 'error', message: 'rust engine unreachable' }
        return { status: 'ok', ...(await res.json()) }
      } catch {
        return { status: 'error', message: 'rust engine not running' }
      }
    }),
})
