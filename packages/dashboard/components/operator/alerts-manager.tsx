'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

export function AlertsManager() {
  const utils = trpc.useUtils()
  const alertsQuery = trpc.alerts.list.useQuery({ limit: 50 })
  const acknowledgeAlert = trpc.alerts.acknowledge.useMutation({
    onSuccess: async () => {
      await utils.alerts.list.invalidate()
    },
  })
  const resolveAlert = trpc.alerts.resolve.useMutation({
    onSuccess: async () => {
      await utils.alerts.list.invalidate()
    },
  })

  if (alertsQuery.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Spinner />
          loading alerts
        </span>
      </div>
    )
  }

  if (alertsQuery.isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-card p-4 text-sm text-destructive">
        {alertsQuery.error.message}
      </div>
    )
  }

  const alerts = alertsQuery.data ?? []

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        operator alert queue
      </div>
      {alerts.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          no alerts are active right now
        </p>
      ) : (
        <div className="divide-y divide-border">
          {alerts.map(alert => (
            <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between" key={alert.id}>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  <Link className="underline-offset-4 hover:underline" href={`/alerts/${alert.id}`}>
                    {alert.zone}
                  </Link>{' '}
                  | {alert.metricType.replaceAll('_', ' ')} at {alert.triggeredValue}
                </p>
                <p className="text-xs text-muted-foreground">
                  severity {alert.severity} | status {alert.status} | opened {alert.createdAt.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  disabled={acknowledgeAlert.isPending || alert.status !== 'active'}
                  onClick={() => acknowledgeAlert.mutate({ id: alert.id })}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  acknowledge
                </Button>
                <Button
                  disabled={resolveAlert.isPending || alert.status === 'resolved'}
                  onClick={() => resolveAlert.mutate({ id: alert.id })}
                  size="sm"
                  type="button"
                >
                  resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
