// tRPC server instance + context
// this is the Control layer of PAC: coordinates between Presentation (react) and Abstraction (drizzle/rust)

import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { createDb } from '@scemas/db'

type AuthUser = { id: string; role: string }

export type Context = {
  db: ReturnType<typeof createDb>
  user: AuthUser | null
}

export type AuthenticatedContext = Context & { user: AuthUser }

export async function createContext(): Promise<Context> {
  const db = createDb(process.env.DATABASE_URL!)
  // TODO: extract user from JWT cookie in phase 3 (auth)
  return { db, user: null }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware

// auth middleware: rejects if no user, narrows type so ctx.user is guaranteed non-null
const enforceAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'not authenticated' })
  }
  return next({ ctx: { db: ctx.db, user: ctx.user } })
})

export const protectedProcedure = t.procedure.use(enforceAuth)

// admin-only middleware (stacks on enforceAuth)
const enforceAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'admin access required' })
  }
  return next({ ctx: { db: ctx.db, user: ctx.user } })
})

export const adminProcedure = t.procedure.use(enforceAuth).use(enforceAdmin)
