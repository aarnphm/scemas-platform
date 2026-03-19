// AlertingManager read operations (HandleActiveAlerts boundary)
// writes (acknowledge, resolve) also here since they're simple state transitions

import { router, protectedProcedure } from '../trpc'
import { alerts, auditLogs } from '@scemas/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'
import { AlertStatusSchema } from '@scemas/types'

export const alertsRouter = router({
  // list alerts with optional status filter
  list: protectedProcedure
    .input(z.object({
      status: AlertStatusSchema.optional(),
      zone: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = []
      if (input.status) conditions.push(eq(alerts.status, input.status))
      if (input.zone) conditions.push(eq(alerts.zone, input.zone))

      return ctx.db.query.alerts.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(alerts.createdAt)],
        limit: input.limit,
      })
    }),

  // get single alert by id
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.alerts.findFirst({
        where: eq(alerts.id, input.id),
      })
    }),

  // acknowledge an alert (lifecycle: active → acknowledged)
  acknowledge: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const now = new Date()
      await ctx.db
        .update(alerts)
        .set({
          status: 'acknowledged',
          acknowledgedBy: ctx.user.id,
          acknowledgedAt: now,
        })
        .where(eq(alerts.id, input.id))

      // audit log
      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'alert.acknowledged',
        details: { alertId: input.id },
      })

      return { success: true }
    }),

  // resolve an alert (lifecycle: acknowledged → resolved)
  resolve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(alerts)
        .set({ status: 'resolved', resolvedAt: new Date() })
        .where(eq(alerts.id, input.id))

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'alert.resolved',
        details: { alertId: input.id },
      })

      return { success: true }
    }),
})
