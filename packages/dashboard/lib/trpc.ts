// tRPC client hooks (integrates with TanStack Query)
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/router'

export const trpc = createTRPCReact<AppRouter>()
