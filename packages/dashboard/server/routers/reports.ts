// ReportEnvironmentalHazard boundary (SRS CP-C3)
// public users submit hazard reports, admins triage, operators see stats

import { hazardReports, auditLogs, alertSubscriptions } from '@scemas/db/schema'
import { CreateHazardReportSchema, UpdateHazardReportStatusSchema } from '@scemas/types'
import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { normalizeZoneId } from '@/lib/zones'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'

export const reportsRouter = router({
  submit: publicProcedure.input(CreateHazardReportSchema).mutation(async ({ input, ctx }) => {
    const [report] = await ctx.db
      .insert(hazardReports)
      .values({
        zone: normalizeZoneId(input.zone) ?? input.zone,
        category: input.category,
        description: input.description,
        contactEmail: input.contactEmail ?? null,
        reportedBy: ctx.user?.id ?? null,
      })
      .returning({ id: hazardReports.id, status: hazardReports.status })

    await ctx.db.insert(auditLogs).values({
      userId: ctx.user?.id ?? null,
      action: 'report.submitted',
      details: { reportId: report.id, zone: input.zone, category: input.category },
    })

    return report
  }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        zone: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const conditions = []

      if (input.status) {
        conditions.push(eq(hazardReports.status, input.status))
      }

      if (input.zone) {
        conditions.push(eq(hazardReports.zone, input.zone))
      }

      // operators only see reports for their subscribed zones
      if (ctx.user.role !== 'admin') {
        const subscription = await ctx.db.query.alertSubscriptions.findFirst({
          where: eq(alertSubscriptions.userId, ctx.user.id),
        })
        const subscribedZones = subscription?.zones ?? []
        if (subscribedZones.length > 0) {
          conditions.push(inArray(hazardReports.zone, subscribedZones))
        }
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      return ctx.db.query.hazardReports.findMany({
        where,
        orderBy: [desc(hazardReports.createdAt)],
        limit: input.limit,
        offset: input.offset,
      })
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.hazardReports.findFirst({
        where: eq(hazardReports.id, input.id),
      })
    }),

  updateStatus: adminProcedure
    .input(UpdateHazardReportStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const now = new Date()
      const isResolution = input.status === 'resolved' || input.status === 'dismissed'

      await ctx.db
        .update(hazardReports)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote ?? null,
          updatedAt: now,
          resolvedAt: isResolution ? now : null,
        })
        .where(eq(hazardReports.id, input.id))

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: `report.${input.status}`,
        details: { reportId: input.id, reviewNote: input.reviewNote ?? null },
      })

      return { success: true }
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const conditions = []

    if (ctx.user.role !== 'admin') {
      const subscription = await ctx.db.query.alertSubscriptions.findFirst({
        where: eq(alertSubscriptions.userId, ctx.user.id),
      })
      const subscribedZones = subscription?.zones ?? []
      if (subscribedZones.length > 0) {
        conditions.push(inArray(hazardReports.zone, subscribedZones))
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await ctx.db
      .select({ status: hazardReports.status, count: count() })
      .from(hazardReports)
      .where(where)
      .groupBy(hazardReports.status)

    const byStatus: Record<string, number> = {}
    for (const row of rows) {
      byStatus[row.status] = row.count
    }

    const pending = byStatus['pending'] ?? 0
    const reviewing = byStatus['reviewing'] ?? 0
    const resolved = byStatus['resolved'] ?? 0
    const dismissed = byStatus['dismissed'] ?? 0

    return { pending, reviewing, resolved, dismissed, total: pending + reviewing + resolved + dismissed }
  }),
})
