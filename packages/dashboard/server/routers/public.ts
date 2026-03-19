// ProvidePublicAPI boundary (DataDistributionManager)
// PAC ABSTRACTION: this router returns FILTERED data for the PublicUserAgent
// public users + third-party devs see the same view: aggregated zone data only
// raw sensor_ids, device details, operator metadata are stripped

import { router, publicProcedure } from '../trpc'
import { sensorReadings } from '@scemas/db/schema'
import { sql, eq, avg, desc } from 'drizzle-orm'
import type { ZoneAQI } from '@scemas/types'

export const publicRouter = router({
  // aggregated AQI data per zone (the public/third-party view)
  // ABSTRACTION: strips sensor_id, raw values, device metadata
  // only returns zone-level aggregated information
  getZoneAQI: publicProcedure
    .query(async ({ ctx }) => {
      // aggregate latest readings by zone using drizzle query builder
      const rows = await ctx.db
        .select({
          zone: sensorReadings.zone,
          metricType: sensorReadings.metricType,
          avgValue: avg(sensorReadings.value).mapWith(Number),
        })
        .from(sensorReadings)
        .where(sql`${sensorReadings.time} > NOW() - INTERVAL '1 hour'`)
        .groupBy(sensorReadings.zone, sensorReadings.metricType)

      // transform to public-safe shape (ZoneAQI)
      const zones = new Map<string, ZoneAQI>()

      for (const row of rows) {
        if (!zones.has(row.zone)) {
          zones.set(row.zone, {
            zone: row.zone,
            aqi: 0,
            label: 'good',
          })
        }
        const z = zones.get(row.zone)!
        const val = row.avgValue ?? 0
        if (row.metricType === 'air_quality') {
          z.aqi = Math.round(val)
          z.label = aqiLabel(z.aqi)
        }
        if (row.metricType === 'temperature') z.temperature = Math.round(val * 10) / 10
        if (row.metricType === 'humidity') z.humidity = Math.round(val * 10) / 10
      }

      return Array.from(zones.values())
    }),
})

function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'good'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'unhealthy for sensitive groups'
  if (aqi <= 200) return 'unhealthy'
  if (aqi <= 300) return 'very unhealthy'
  return 'hazardous'
}
