import { auditLogs } from '@scemas/db/schema'
import { desc } from 'drizzle-orm'
import { z } from 'zod'
import { adminProcedure, router } from '../trpc'

export const auditRouter = router({
  list: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(200) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.auditLogs.findMany({
        orderBy: [desc(auditLogs.createdAt)],
        limit: input?.limit ?? 200,
      })
    }),

  frequency: adminProcedure
    .input(z.object({ hours: z.number().min(1).max(168).default(24) }).optional())
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24
      const rows = await ctx.db.$client`
        SELECT
          date_trunc('hour', created_at) as hour,
          COUNT(*) FILTER (WHERE action LIKE '%success%' OR action LIKE '%created%' OR action LIKE '%updated%' OR action LIKE '%acknowledged%' OR action LIKE '%resolved%') as success,
          COUNT(*) FILTER (WHERE action LIKE '%failed%' OR action LIKE '%denied%') as errors,
          COUNT(*) as total
        FROM audit_logs
        WHERE created_at > NOW() - make_interval(hours => ${hours})
        GROUP BY hour
        ORDER BY hour ASC
      `
      return rows.map(row => ({
        hour: row.hour instanceof Date ? row.hour.toISOString() : String(row.hour),
        success: Number(row.success ?? 0),
        errors: Number(row.errors ?? 0),
        total: Number(row.total ?? 0),
      }))
    }),
})
