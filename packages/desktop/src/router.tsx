import { QueryClient } from '@tanstack/react-query'
import {
  createRouter,
  createRootRouteWithContext,
  createRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { ConsoleLayout } from './layouts/console-layout'
import { PublicLayout } from './layouts/public-layout'
import { AlertDetailPage } from './pages/alert-detail'
import { AlertsPage } from './pages/alerts'
import { AuditPage } from './pages/audit'
import { DashboardPage } from './pages/dashboard'
import { DevicesPage } from './pages/devices'
import { DisplayPage } from './pages/display'
import { HealthPage } from './pages/health'
import { MetricsPage } from './pages/metrics'
import { ReportsPage } from './pages/reports'
import { RulesPage } from './pages/rules'
import { SettingsPage } from './pages/settings'
import { LoginPage } from './pages/sign-in'
import { SignUpPage } from './pages/sign-up'
import { SubscriptionsPage } from './pages/subscriptions'
import { UsersPage } from './pages/users'
import { ZoneMetricsPage } from './pages/zone-metrics'
import { useAuthStore } from './store/auth'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet })

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: LoginPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user) throw redirect({ to: landingPath(user.role) })
  },
})

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user) throw redirect({ to: landingPath(user.role) })
  },
})

const consoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'console',
  component: ConsoleLayout,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (!user) throw redirect({ to: '/sign-in' })
    if (user.role === 'viewer') throw redirect({ to: '/display' })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/dashboard',
  component: DashboardPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const alertsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/alerts',
  component: AlertsPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const alertDetailRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/alerts/$alertId',
  component: AlertDetailPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const metricsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/metrics',
  component: MetricsPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const zoneMetricsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/metrics/$zone',
  component: ZoneMetricsPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const subscriptionsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/subscriptions',
  component: SubscriptionsPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'admin') throw redirect({ to: '/rules' })
  },
})

const rulesRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/rules',
  component: RulesPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const usersRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/users',
  component: UsersPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const devicesRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/devices',
  component: DevicesPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const reportsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/reports',
  component: ReportsPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const healthRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/health',
  component: HealthPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const auditRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/audit',
  component: AuditPage,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user?.role === 'operator') throw redirect({ to: '/dashboard' })
  },
})

const settingsRoute = createRoute({
  getParentRoute: () => consoleRoute,
  path: '/settings',
  component: SettingsPage,
})

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public',
  component: PublicLayout,
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (!user) throw redirect({ to: '/sign-in' })
  },
})

const displayRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: '/display',
  component: DisplayPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (user) throw redirect({ to: landingPath(user.role) })
    throw redirect({ to: '/sign-in' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  signUpRoute,
  consoleRoute.addChildren([
    dashboardRoute,
    alertsRoute,
    alertDetailRoute,
    metricsRoute,
    zoneMetricsRoute,
    subscriptionsRoute,
    rulesRoute,
    usersRoute,
    devicesRoute,
    reportsRoute,
    healthRoute,
    auditRoute,
    settingsRoute,
  ]),
  publicRoute.addChildren([displayRoute]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent' })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

function landingPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/rules'
    case 'operator':
      return '/dashboard'
    default:
      return '/display'
  }
}
