import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

const isTauri = '__TAURI_INTERNALS__' in window

async function safeInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw new Error(`not running in tauri (command: ${command})`)
  }
  return invoke<T>(command, args)
}

export function useTauriQuery<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey: [command, args],
    queryFn: () => safeInvoke<T>(command, args ?? {}),
    ...options,
  })
}

export function useTauriMutation<TArgs, TResult = unknown>(
  command: string,
  invalidateKeys?: string[],
) {
  const queryClient = useQueryClient()

  return useMutation<TResult, string, TArgs>({
    mutationFn: args => safeInvoke<TResult>(command, args as Record<string, unknown>),
    onSuccess: () => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
      }
    },
  })
}

export function useHealth() {
  return useTauriQuery<{
    counters: { totalReceived: number; totalAccepted: number; totalRejected: number }
    lifecycle: { phase: string; drainStage: string; inflight: number }
  }>('health_get', undefined, { refetchInterval: 5000 })
}

export function useAuthLogin() {
  return useTauriMutation<{ email: string; password: string }>('auth_login')
}

export function useAuthSignup() {
  return useTauriMutation<{ email: string; username: string; password: string }>('auth_signup')
}

export function useTelemetryIngest() {
  return useTauriMutation<{
    reading: {
      sensorId: string
      metricType: string
      value: number
      zone: string
      timestamp: string
    }
  }>('telemetry_ingest', ['health_get'])
}

export function useRulesCreate() {
  return useTauriMutation<{
    args: {
      metricType: string
      thresholdValue: number
      comparison: string
      zone?: string
      createdBy: string
    }
  }>('rules_create', ['rules_list'])
}

export function useAlertsAcknowledge() {
  return useTauriMutation<{ args: { alertId: string; userId: string } }>('alerts_acknowledge', [
    'alerts_list',
  ])
}

export function useAlertsResolve() {
  return useTauriMutation<{ args: { alertId: string; userId: string } }>('alerts_resolve', [
    'alerts_list',
  ])
}
