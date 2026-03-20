import { AgentShell } from '@/components/layout/agent-shell'

export const dynamic = 'force-dynamic'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentShell subtitle="public monitoring regions" title="SCEMAS">
      {children}
    </AgentShell>
  )
}
