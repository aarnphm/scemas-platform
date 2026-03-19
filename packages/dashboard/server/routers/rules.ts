// DefineThresholdRules boundary (AlertingManager, admin-only)

import { router, adminProcedure } from '../trpc'
import { thresholdRules, auditLogs } from '@scemas/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { CreateThresholdRuleSchema } from '@scemas/types'

export const rulesRouter = router({
  list: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.thresholdRules.findMany({
        orderBy: [desc(thresholdRules.createdAt)],
      })
    }),

  create: adminProcedure
    .input(CreateThresholdRuleSchema)
    .mutation(async ({ input, ctx }) => {
      const [rule] = await ctx.db.insert(thresholdRules).values({
        metricType: input.metricType,
        thresholdValue: input.thresholdValue,
        comparison: input.comparison,
        zone: input.zone ?? null,
        createdBy: ctx.user.id,
      }).returning()

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'rule.created',
        details: { ruleId: rule.id, ...input },
      })

      return rule
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      ruleStatus: z.enum(['active', 'inactive']),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(thresholdRules)
        .set({ ruleStatus: input.ruleStatus })
        .where(eq(thresholdRules.id, input.id))

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'rule.updated',
        details: input,
      })

      return { success: true }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(thresholdRules).where(eq(thresholdRules.id, input.id))

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'rule.deleted',
        details: input,
      })

      return { success: true }
    }),
})
