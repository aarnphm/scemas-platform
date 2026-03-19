import { AlertsManager } from '@/components/operator/alerts-manager'

// HandleActiveAlerts boundary (AlertingManager)
export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">alerts</h1>
      <p className="text-sm text-muted-foreground">
        triage the live queue, acknowledge what has an owner, and resolve what has actually been handled
      </p>
      <AlertsManager />
    </div>
  )
}
