'use client'

import {
  Download01Icon,
  MoreHorizontalCircle01Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { SeverityBadge } from '@/components/ui/severity-badge'
import { Spinner } from '@/components/ui/spinner'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { formatZoneName } from '@/lib/zones'

const ROW_HEIGHT = 56
const LIVE_POLL_MS = 5_000

const TIME_PERIODS = [
  { label: '15m', hours: 0.25 },
  { label: '1h', hours: 1 },
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
] as const

type Alert = {
  id: string
  zone: string
  metricType: string
  severity: number
  status: string
  triggeredValue: number
  createdAt: Date
}

type SortMode = 'latest' | 'severity' | 'oldest'

function sortAlerts(alerts: Alert[], mode: SortMode): Alert[] {
  switch (mode) {
    case 'severity':
      return alerts.toSorted(
        (a, b) => b.severity - a.severity || b.createdAt.getTime() - a.createdAt.getTime(),
      )
    case 'oldest':
      return alerts.toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    case 'latest':
    default:
      return alerts.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}

// ---------------------------------------------------------------------------
// optimistic cache helpers (paused mode: patch in-place, never refetch)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-query InfiniteData is generic, helpers operate on any page shape
type AnyInfiniteData = { pages: Array<{ items: Array<{ id: string; status: string; [k: string]: any }>; [k: string]: any }>; pageParams: any[] }

function patchStatus(old: AnyInfiniteData | undefined, id: string, status: string) {
  if (!old) return old
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      items: page.items.map(a => (a.id === id ? { ...a, status } : a)),
    })),
  }
}

function removeItem(old: AnyInfiniteData | undefined, id: string) {
  if (!old) return old
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      items: page.items.filter(a => a.id !== id),
    })),
  }
}

function removeItems(old: AnyInfiniteData | undefined, ids: Set<string>) {
  if (!old) return old
  return {
    ...old,
    pages: old.pages.map(page => ({
      ...page,
      items: page.items.filter(a => !ids.has(a.id)),
    })),
  }
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export function AlertsManager({ availableZones }: { availableZones: string[] }) {
  const utils = trpc.useUtils()
  const [inflightId, setInflightId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('latest')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [hours, setHours] = useState<number>(1)
  const [live, setLive] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const queryInput = useMemo(
    () => ({
      limit: 100 as const,
      zone: zoneFilter !== 'all' ? zoneFilter : undefined,
      hours: live ? undefined : hours,
    }),
    [zoneFilter, hours, live],
  )

  const alertsQuery = trpc.alerts.list.useInfiniteQuery(queryInput, {
    getNextPageParam: lastPage => lastPage.nextCursor,
    refetchInterval: live ? LIVE_POLL_MS : false,
  })

  // in paused mode, mutations patch the cache optimistically.
  // in live mode, mutations invalidate (refetch is expected).
  const afterMutation = useCallback(
    (action: 'ack' | 'resolve', id: string) => {
      if (live) {
        utils.alerts.list.invalidate()
        utils.alerts.count.invalidate()
      } else if (action === 'ack') {
        utils.alerts.list.setInfiniteData(queryInput, old => patchStatus(old as AnyInfiniteData, id, 'acknowledged') as typeof old)
      } else {
        utils.alerts.list.setInfiniteData(queryInput, old => removeItem(old as AnyInfiniteData, id) as typeof old)
        utils.alerts.count.invalidate()
      }
    },
    [live, queryInput, utils],
  )

  const acknowledgeAlert = trpc.alerts.acknowledge.useMutation({
    onMutate: ({ id }) => setInflightId(id),
    onSuccess: (_data, { id }) => afterMutation('ack', id),
    onSettled: () => setInflightId(null),
  })

  const resolveAlert = trpc.alerts.resolve.useMutation({
    onMutate: ({ id }) => setInflightId(id),
    onSuccess: (_data, { id }) => afterMutation('resolve', id),
    onSettled: () => setInflightId(null),
  })

  const batchResolve = trpc.alerts.batchResolve.useMutation({
    onSuccess: (_data, { ids }) => {
      if (live) {
        utils.alerts.list.invalidate()
      } else {
        const idSet = new Set(ids)
        utils.alerts.list.setInfiniteData(queryInput, old => removeItems(old as AnyInfiniteData, idSet) as typeof old)
      }
      utils.alerts.count.invalidate()
    },
  })

  function handleGoLive() {
    setLive(true)
    utils.alerts.list.invalidate()
    utils.alerts.count.invalidate()
  }

  function handleRefresh() {
    utils.alerts.list.invalidate()
    utils.alerts.count.invalidate()
  }

  const filtered = useMemo(() => {
    const allAlerts = (alertsQuery.data?.pages.flatMap(p => p.items) ?? []) as Alert[]
    return sortAlerts(allAlerts, sortMode)
  }, [alertsQuery.data, sortMode])

  const acknowledgedIds = useMemo(
    () => filtered.filter(a => a.status === 'acknowledged').map(a => a.id),
    [filtered],
  )

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastItemIndex = virtualItems[virtualItems.length - 1]?.index ?? 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = alertsQuery

  useEffect(() => {
    if (lastItemIndex >= filtered.length - 20 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [lastItemIndex, filtered.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  // when filters change (new queryInput), dataUpdatedAt resets to 0 for the new key.
  // show full loading state until fresh data arrives for the current filters.
  const hasFreshData = alertsQuery.dataUpdatedAt > 0 && !alertsQuery.isLoading
  const isInitialLoad = !hasFreshData && alertsQuery.isFetching
  const isRefetching = hasFreshData && alertsQuery.isFetching

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium">alert queue</span>
        <div className="flex items-center gap-2">
          <NativeSelect value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
            <NativeSelectOption value="all">all zones</NativeSelectOption>
            {availableZones.map(zone => (
              <NativeSelectOption key={zone} value={zone}>
                {formatZoneName(zone)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
            <NativeSelectOption value="latest">latest first</NativeSelectOption>
            <NativeSelectOption value="severity">severity</NativeSelectOption>
            <NativeSelectOption value="oldest">oldest first</NativeSelectOption>
          </NativeSelect>
          {!live && (
            <div className="flex items-center rounded-md border border-border">
              {TIME_PERIODS.map(p => (
                <button
                  className={cn(
                    'h-7 px-2 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md',
                    hours === p.hours
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  key={p.label}
                  onClick={() => setHours(p.hours)}
                  type="button"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <button
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors active:scale-[0.96]',
              live
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => (live ? setLive(false) : handleGoLive())}
            type="button"
          >
            <HugeiconsIcon icon={live ? PauseIcon : PlayIcon} size={12} strokeWidth={2} />
            Live
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="actions"
                className="inline-flex h-7 items-center justify-center rounded-md border border-border px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96] disabled:opacity-50"
                disabled={batchResolve.isPending}
                type="button"
              >
                {batchResolve.isPending ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={MoreHorizontalCircle01Icon} size={14} strokeWidth={1.5} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={handleRefresh}>
                <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
                refresh
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadAlerts(filtered, 'json')}>
                <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={1.5} />
                download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadAlerts(filtered, 'csv')}>
                <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={1.5} />
                download as CSV
              </DropdownMenuItem>
              {acknowledgedIds.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={batchResolve.isPending}
                    onClick={() => batchResolve.mutate({ ids: acknowledgedIds.slice(0, 50) })}
                  >
                    resolve all ({Math.min(acknowledgedIds.length, 50)})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* list */}
      <div className="relative h-100 overflow-y-auto md:h-150" ref={scrollRef}>
        {isInitialLoad || alertsQuery.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            {alertsQuery.isError ? (
              <p className="text-sm text-destructive">{alertsQuery.error.message}</p>
            ) : (
              <>
                <Spinner />
                <p className="text-xs text-muted-foreground">loading alerts</p>
              </>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            {live ? (
              <>
                <Spinner />
                <p className="text-xs text-muted-foreground">events will appear here as they arrive</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-pretty">
                {zoneFilter === 'all' ? 'no alerts' : `no alerts in ${formatZoneName(zoneFilter)}`}
              </p>
            )}
          </div>
        ) : (
          <>
            {isRefetching && (
              <div className="absolute inset-x-0 top-0 z-10 flex justify-center py-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  <Spinner />
                  updating
                </span>
              </div>
            )}
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualItems.map(virtualRow => {
                const alert = filtered[virtualRow.index]
                return (
                  <div
                    className="absolute left-0 top-0 w-full"
                    key={alert.id}
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <Link
                      className="flex size-full items-center justify-between gap-2 border-b border-border px-4 hover:bg-muted"
                      href={`/alerts/${alert.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm tabular-nums">
                            {alert.triggeredValue}
                          </span>
                          <SeverityBadge severity={alert.severity} />
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground/60">
                          <span>{alert.createdAt.toLocaleString()}</span>
                          <span className="rounded bg-muted px-1 py-px text-xs">
                            {alert.metricType.replaceAll('_', ' ')}
                          </span>
                          <span className="rounded bg-muted px-1 py-px text-xs">
                            {formatZoneName(alert.zone)}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div
                      className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <AlertActions
                        status={alert.status}
                        isAckLoading={inflightId === alert.id && acknowledgeAlert.isPending}
                        isResolveLoading={inflightId === alert.id && resolveAlert.isPending}
                        isAcked={alert.status === 'acknowledged' || alert.status === 'resolved'}
                        onAck={() => acknowledgeAlert.mutate({ id: alert.id })}
                        onResolve={() => resolveAlert.mutate({ id: alert.id })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} loaded{alertsQuery.hasNextPage ? ' of many' : ''}
        </p>
        {alertsQuery.isFetchingNextPage ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner /> loading more
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// alert row actions
// ---------------------------------------------------------------------------

function AlertActions({
  isAckLoading,
  isResolveLoading,
  isAcked,
  onAck,
  onResolve,
}: {
  status: string
  isAckLoading: boolean
  isResolveLoading: boolean
  isAcked: boolean
  onAck: () => void
  onResolve: () => void
}) {
  return (
    <>
      {isAcked ? (
        <span className="inline-flex h-6 items-center rounded-md border border-amber-600/20 bg-amber-500/10 px-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          ack'd
        </span>
      ) : (
        <Button
          disabled={isAckLoading}
          onClick={onAck}
          size="sm"
          variant="outline"
        >
          {isAckLoading ? <Spinner /> : 'ack'}
        </Button>
      )}
      <Button
        className={cn(
          'border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
          (isAckLoading || isResolveLoading) && 'pointer-events-none',
        )}
        disabled={isResolveLoading}
        onClick={onResolve}
        size="sm"
      >
        {isResolveLoading ? <Spinner /> : 'resolve'}
      </Button>
    </>
  )
}

function downloadAlerts(alerts: Alert[], format: 'json' | 'csv') {
  let content: string
  let mime: string
  let ext: string

  if (format === 'json') {
    content = JSON.stringify(
      alerts.map(a => ({
        id: a.id,
        zone: a.zone,
        metricType: a.metricType,
        severity: a.severity,
        status: a.status,
        triggeredValue: a.triggeredValue,
        createdAt: a.createdAt.toISOString(),
      })),
      null,
      2,
    )
    mime = 'application/json'
    ext = 'json'
  } else {
    const header = 'id,zone,metricType,severity,status,triggeredValue,createdAt'
    const rows = alerts.map(
      a =>
        `${a.id},${a.zone},${a.metricType},${a.severity},${a.status},${a.triggeredValue},${a.createdAt.toISOString()}`,
    )
    content = [header, ...rows].join('\n')
    mime = 'text/csv'
    ext = 'csv'
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alerts.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}
