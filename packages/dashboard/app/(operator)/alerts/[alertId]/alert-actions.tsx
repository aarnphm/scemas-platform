'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'

type AlertActionsProps = { alertId: string; currentStatus: string }

const statusStyles: Record<string, string> = {
  active: 'bg-destructive/10 text-destructive',
  acknowledged: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  resolved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
}

export function AlertActions({ alertId, currentStatus }: AlertActionsProps) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [status, setStatus] = useState(currentStatus)

  const acknowledgeAlert = trpc.alerts.acknowledge.useMutation({
    onSuccess: async () => {
      setStatus('acknowledged')
      await utils.alerts.list.invalidate()
      router.refresh()
    },
  })
  const resolveAlert = trpc.alerts.resolve.useMutation({
    onSuccess: async () => {
      setStatus('resolved')
      await utils.alerts.list.invalidate()
      router.refresh()
    },
  })

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded px-1.5 py-px text-[10px]/4 font-medium ${statusStyles[status] ?? statusStyles.active}`}
      >
        {status}
      </span>
      {status !== 'resolved' ? (
        <>
          <Button
            disabled={acknowledgeAlert.isPending || status !== 'active'}
            onClick={() => acknowledgeAlert.mutate({ id: alertId })}
            variant="outline"
          >
            {acknowledgeAlert.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> acknowledging
              </span>
            ) : (
              'acknowledge'
            )}
          </Button>
          <Button
            disabled={resolveAlert.isPending}
            onClick={() => resolveAlert.mutate({ id: alertId })}
          >
            {resolveAlert.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> resolving
              </span>
            ) : (
              'resolve'
            )}
          </Button>
        </>
      ) : null}
    </div>
  )
}
