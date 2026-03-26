import { callRustEndpoint } from './rust-client'

export type IngestionHealth = {
  totalReceived: number
  totalAccepted: number
  totalRejected: number
}

export type LifecycleHealth = { phase: string; drainStage: string | null; inflight: number }

export async function fetchRustHealthPayload(): Promise<unknown | null> {
  try {
    const { data, status } = await callRustEndpoint('/internal/health', { method: 'GET' })
    return status >= 400 ? null : data
  } catch {
    return null
  }
}

export function decodeIngestionHealth(payload: unknown): IngestionHealth {
  const counters = getNestedRecord(payload, 'counters') ?? getRecord(payload)

  if (!counters) {
    return emptyIngestionHealth()
  }

  return {
    totalReceived: getNumericField(counters, ['totalReceived', 'total_received']),
    totalAccepted: getNumericField(counters, ['totalAccepted', 'total_accepted']),
    totalRejected: getNumericField(counters, ['totalRejected', 'total_rejected']),
  }
}

export function decodeLifecycleHealth(payload: unknown): LifecycleHealth {
  const lifecycle = getNestedRecord(payload, 'lifecycle')

  if (!lifecycle) {
    return { phase: 'unknown', drainStage: null, inflight: 0 }
  }

  return {
    phase: getStringField(lifecycle, ['phase']) ?? 'unknown',
    drainStage: getStringField(lifecycle, ['drainStage', 'drain_stage']),
    inflight: getNumericField(lifecycle, ['inflight']),
  }
}

function emptyIngestionHealth(): IngestionHealth {
  return { totalReceived: 0, totalAccepted: 0, totalRejected: 0 }
}

function getNestedRecord(payload: unknown, key: string): Record<string, unknown> | null {
  const record = getRecord(payload)
  if (!record || !(key in record)) {
    return null
  }

  return getRecord(record[key])
}

function getRecord(payload: unknown): Record<string, unknown> | null {
  return isRecord(payload) ? payload : null
}

function getNumericField(payload: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (!(key in payload)) {
      continue
    }

    const value = payload[key]
    if (typeof value === 'number') {
      return value
    }
  }

  return 0
}

function getStringField(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (!(key in payload)) {
      continue
    }

    const value = payload[key]
    if (typeof value === 'string') {
      return value
    }
  }

  return null
}

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null
}
