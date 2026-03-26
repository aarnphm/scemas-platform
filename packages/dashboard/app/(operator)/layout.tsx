import { AgentShell } from '@/components/layout/agent-shell'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentShell
      navItems={[
        { href: '/dashboard', label: 'dashboard' },
        { href: '/alerts', label: 'alerts' },
        { href: '/metrics', label: 'metrics' },
        { href: '/subscriptions', label: 'subscriptions' },
      ]}
      title="SCEMAS"
    >
      {children}
    </AgentShell>
  )
}
