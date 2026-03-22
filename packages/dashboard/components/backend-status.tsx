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

export function useServerLifecycle() {
  const lifecycle = trpc.health.lifecycle.useQuery(undefined, {
    refetchInterval: 5_000,
    retry: false,
    placeholderData: prev => prev,
  })

  const phase = lifecycle.data?.phase ?? 'unknown'
  const drainStage = lifecycle.data?.drainStage ?? null
  const isDraining = phase === 'draining'
  const isShuttingDown = phase === 'shutting_down'
  const isUnreachable = phase === 'unreachable'

  return {
    phase,
    drainStage,
    isDraining,
    isShuttingDown,
    isUnreachable,
    loading: lifecycle.isLoading,
  }
}

export function BackendStatus({ ok, loading }: { ok: boolean; loading: boolean }) {
  const { isDraining, isShuttingDown } = useServerLifecycle()

  const draining = isDraining || isShuttingDown
  const dotClass = loading
    ? 'size-1.5 rounded-full bg-muted-foreground/40'
    : draining
      ? 'size-1.5 rounded-full bg-amber-500'
      : ok
        ? 'size-1.5 rounded-full bg-emerald-500'
        : 'size-1.5 rounded-full bg-red-500'

  const label = draining ? 'draining' : ok ? 'operational' : 'offline'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={dotClass} />
      {label}
    </span>
  )
}
