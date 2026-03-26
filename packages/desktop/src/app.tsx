import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 } },
})

const router = createAppRouter(queryClient)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
