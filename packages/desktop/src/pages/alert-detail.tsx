import { useParams, Link } from '@tanstack/react-router'
import { useTauriQuery, useAlertsAcknowledge, useAlertsResolve } from '@/lib/tauri'
import { useAuthStore } from '@/store/auth'

interface Alert {
  id: string
  ruleId: string
  sensorId: string
  severity: 1 | 2 | 3
  status: 'triggered' | 'active' | 'acknowledged' | 'resolved'
  triggeredValue: number
  zone: string
  metricType: string
  createdAt: string
  acknowledgedBy: string | null
  acknowledgedAt: string | null
}

export function AlertDetailPage() {
  const { alertId } = useParams({ strict: false })
  const user = useAuthStore(s => s.user)
  const alert = useTauriQuery<Alert>('alerts_get', { id: alertId })
  const ack = useAlertsAcknowledge()
  const resolve = useAlertsResolve()

  if (alert.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">loading...</p>
  }

  if (!alert.data) {
    return <p className="p-6 text-sm text-destructive">alert not found</p>
  }

  const a = alert.data

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to="/alerts"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          alerts
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium">{a.id.slice(0, 8)}</span>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-balance">
            {a.metricType} alert in {a.zone}
          </h1>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {a.status}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="severity" value={String(a.severity)} />
          <Field label="triggered value" value={a.triggeredValue.toFixed(2)} />
          <Field label="sensor" value={a.sensorId} />
          <Field label="rule" value={a.ruleId.slice(0, 8)} />
          <Field label="zone" value={a.zone} />
          <Field label="metric" value={a.metricType} />
          <Field label="created" value={new Date(a.createdAt).toLocaleString()} />
          <Field
            label="acknowledged at"
            value={a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : 'n/a'}
          />
          <Field label="acknowledged by" value={a.acknowledgedBy?.slice(0, 8) ?? 'n/a'} />
        </div>

        <div className="flex gap-2 pt-2">
          {a.status !== 'acknowledged' && a.status !== 'resolved' && (
            <button
              onClick={() => ack.mutate({ args: { alertId: a.id, userId: user?.id ?? '' } })}
              disabled={ack.isPending}
              className="h-8 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              acknowledge
            </button>
          )}
          {a.status !== 'resolved' && (
            <button
              onClick={() => resolve.mutate({ args: { alertId: a.id, userId: user?.id ?? '' } })}
              disabled={resolve.isPending}
              className="h-8 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              resolve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
