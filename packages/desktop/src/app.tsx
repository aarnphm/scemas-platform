import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import { useAuthStore } from './store/auth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 } },
})

const router = createAppRouter(queryClient)

// expose sign-out for tray menu (called via window.eval from rust)
;(window as Record<string, unknown>).__traySignOut = () => {
  useAuthStore.getState().clearSession()
  window.history.pushState({}, '', '/sign-in')
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
