// DefineThresholdRules boundary (AlertingManager, admin-only)

import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc'
import { thresholdRules } from '@scemas/db/schema'
import { desc } from 'drizzle-orm'
import { z } from 'zod'
import { CreateThresholdRuleSchema, ThresholdRuleSchema } from '@scemas/types'

import {
  callRustEndpoint,
  extractRustErrorMessage,
} from '../rust-client'

const SuccessResponseSchema = z.object({
  success: z.literal(true),
})

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
      const { data, status } = await callRustEndpoint('/internal/alerting/rules', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          createdBy: ctx.user.id,
        }),
      })

      if (status >= 400) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: extractRustErrorMessage(data) ?? 'rule creation failed',
        })
      }

      const parsed = ThresholdRuleSchema.safeParse(data)
      if (!parsed.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'rust alerting manager returned an invalid rule payload',
        })
      }

      return parsed.data
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      ruleStatus: z.enum(['active', 'inactive']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { data, status } = await callRustEndpoint(
        `/internal/alerting/rules/${input.id}/status`,
        {
          method: 'POST',
          body: JSON.stringify({
            ruleStatus: input.ruleStatus,
            updatedBy: ctx.user.id,
          }),
        },
      )

      if (status >= 400) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: extractRustErrorMessage(data) ?? 'rule update failed',
        })
      }

      const parsed = SuccessResponseSchema.safeParse(data)
      if (!parsed.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'rust alerting manager returned an invalid update response',
        })
      }

      return parsed.data
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { data, status } = await callRustEndpoint(
        `/internal/alerting/rules/${input.id}/delete`,
        {
          method: 'POST',
          body: JSON.stringify({
            deletedBy: ctx.user.id,
          }),
        },
      )

      if (status >= 400) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: extractRustErrorMessage(data) ?? 'rule deletion failed',
        })
      }

      const parsed = SuccessResponseSchema.safeParse(data)
      if (!parsed.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'rust alerting manager returned an invalid delete response',
        })
      }

      return parsed.data
    }),
})
