import { RulesManager } from '@/components/admin/rules-manager'

// DefineThresholdRules boundary (AlertingManager, admin-only)
export default function RulesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">threshold rules</h1>
      <p className="text-sm text-muted-foreground">
        define, pause, and retire the rulebook that feeds the blackboard alerting flow
      </p>
      <RulesManager />
    </div>
  )
}
