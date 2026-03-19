// TelemetryManager tRPC router
// ingest: proxies to rust internal API (pipe-and-filter pattern)
// reads: direct drizzle queries (no pattern needed for reads)

import { router, protectedProcedure } from '../trpc'
import { SensorReadingSchema } from '@scemas/types'
import { sensorReadings } from '@scemas/db/schema'
import { desc, eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'

import { buildDeviceAuthToken, getInternalRustUrl } from '../env'
import { createDataDistributionManager } from '../data-distribution-manager'

const RUST_URL = getInternalRustUrl()

export const telemetryRouter = router({
  // IngestSensorStreams boundary: proxies to rust for pipe-and-filter demonstration
  ingest: protectedProcedure
    .input(SensorReadingSchema)
    .mutation(async ({ input }) => {
      const res = await fetch(`${RUST_URL}/internal/telemetry/ingest`, {
        method: 'POST',
        body: JSON.stringify(input),
        headers: {
          'Content-Type': 'application/json',
          'x-scemas-device-id': input.sensorId,
          'x-scemas-device-token': buildDeviceAuthToken(),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'telemetry ingestion failed')
      }
      return res.json()
    }),

  // get recent readings for a zone (operator view: full data)
  getByZone: protectedProcedure
    .input(z.object({
      zone: z.string(),
      metricType: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.sensorReadings.findMany({
        where: input.metricType
          ? and(eq(sensorReadings.zone, input.zone), eq(sensorReadings.metricType, input.metricType))
          : eq(sensorReadings.zone, input.zone),
        orderBy: [desc(sensorReadings.time)],
        limit: input.limit,
      })
    }),

  // get latest reading per sensor (for dashboard map)
  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      const manager = createDataDistributionManager(ctx.db)
      return manager.getLatestSensorReadings(100)
    }),
})
