// AccessManager controller (repository pattern)
// handles: SignupForAccount, LoginToSCEMAS boundaries
// passive data store: deterministic queries against postgres via drizzle

import { router, publicProcedure, protectedProcedure } from '../trpc'
import { SignupSchema, LoginSchema } from '@scemas/types'
import { accounts } from '@scemas/db/schema'
import { eq } from 'drizzle-orm'

export const authRouter = router({
  signup: publicProcedure
    .input(SignupSchema)
    .mutation(async ({ input, ctx }) => {
      // TODO phase 3: argon2 hash password, insert account, return JWT
      return { success: true, message: 'signup stub' }
    }),

  login: publicProcedure
    .input(LoginSchema)
    .mutation(async ({ input, ctx }) => {
      // TODO phase 3: verify credentials, issue JWT
      return { success: true, message: 'login stub' }
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.accounts.findFirst({
        where: eq(accounts.id, ctx.user.id),
        columns: { id: true, email: true, username: true, role: true },
      })
      return user
    }),
})
