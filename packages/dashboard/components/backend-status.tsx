'use client'

import { trpc } from '@/lib/trpc'

export function useBackendPing() {
  const ping = trpc.health.ping.useQuery(undefined, {
    refetchInterval: 10_000,
    retry: false,
    placeholderData: prev => prev,
  })

  return { ok: ping.data?.ok === true, loading: ping.isLoading }
}

export function BackendStatus({ ok, loading }: { ok: boolean; loading: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={
          loading
            ? 'size-1.5 rounded-full bg-muted-foreground/40'
            : ok
              ? 'size-1.5 rounded-full bg-emerald-500'
              : 'size-1.5 rounded-full bg-red-500'
        }
      />
      {ok ? 'operational' : 'offline'}
    </span>
  )
}
