// ManageSecurityPermissions + ModifyAccountDetails boundaries (admin-only)

import { router, adminProcedure } from '../trpc'
import { accounts, auditLogs } from '@scemas/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { RoleSchema } from '@scemas/types'

export const usersRouter = router({
  list: adminProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.accounts.findMany({
        columns: { id: true, email: true, username: true, role: true, createdAt: true },
        orderBy: [desc(accounts.createdAt)],
      })
    }),

  updateRole: adminProcedure
    .input(z.object({ userId: z.string().uuid(), role: RoleSchema }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(accounts)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(accounts.id, input.userId))

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: 'user.role_updated',
        details: input,
      })

      return { success: true }
    }),
})
