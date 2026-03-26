import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useTauriQuery } from '@/lib/tauri'

interface AuditLog {
  id: number
  userId: string | null
  action: string
  details: Record<string, unknown> | null
  createdAt: string
}

interface CursorPage {
  items: AuditLog[]
  nextCursor: string | null
}

interface AuditFrequencyPoint {
  hour: string
  success: number
  errors: number
  total: number
}

function actionColor(action: string) {
  if (action.includes('login') || action.includes('signup')) return 'bg-emerald-500'
  if (action.includes('resolved') || action.includes('acknowledged')) return 'bg-blue-500'
  if (action.includes('denied') || action.includes('failed')) return 'bg-red-500'
  if (action.includes('created') || action.includes('updated')) return 'bg-amber-500'
  return 'bg-muted-foreground'
}

function actionBadgeColor(action: string) {
  if (action.includes('login') || action.includes('signup'))
    return 'bg-emerald-500/15 text-emerald-700'
  if (action.includes('resolved') || action.includes('acknowledged'))
    return 'bg-blue-500/15 text-blue-700'
  if (action.includes('denied') || action.includes('failed')) return 'bg-red-500/15 text-red-700'
  if (action.includes('created') || action.includes('updated'))
    return 'bg-amber-500/15 text-amber-700'
  return 'bg-secondary text-muted-foreground'
}

function formatTimestamp(isoString: string) {
  const date = new Date(isoString)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatHour(isoString: string) {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details) return '(no details)'
  return JSON.stringify(details, null, 2)
}

export function AuditPage() {
  const audit = useTauriQuery<CursorPage>('audit_list', { limit: 50 })
  const frequency = useTauriQuery<AuditFrequencyPoint[]>(
    'audit_frequency',
    { hours: 24 },
    { refetchInterval: 30_000 },
  )

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const items = audit.data?.items ?? []
  const freqData = frequency.data ?? []
  const totalSuccess = freqData.reduce((sum, d) => sum + d.success, 0)
  const totalErrors = freqData.reduce((sum, d) => sum + d.errors, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">audit logs</h1>
        <p className="text-sm text-muted-foreground">
          authentication events, device denials, alert actions, and permission changes land here
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">events (last 24h)</h2>
          <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
            <span>{totalSuccess} success</span>
            <span>{totalErrors} errors</span>
          </div>
        </div>
        <div className="mt-2">
          {freqData.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">no audit events in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <BarChart data={freqData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                <Tooltip labelFormatter={formatHour} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="success" fill="#60a5fa" stackId="events" radius={[2, 2, 0, 0]} />
                <Bar dataKey="errors" fill="#ef4444" stackId="events" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="grid grid-cols-[7rem_1fr_6rem] w-full text-[11px] font-medium text-muted-foreground">
            <span>timestamp</span>
            <span>event</span>
            <span className="text-right">actor</span>
          </div>
        </div>

        {audit.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">loading...</p>
        ) : audit.isError ? (
          <p className="p-4 text-sm text-destructive">{String(audit.error)}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            no audit events have been recorded yet
          </p>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {items.map(entry => (
              <div key={entry.id}>
                <button
                  type="button"
                  className={`grid w-full grid-cols-[7rem_1fr_6rem] items-center border-b px-4 py-2.5 text-left text-xs ${
                    expandedId === entry.id ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${actionColor(entry.action)}`}
                    />
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${actionBadgeColor(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                  </span>
                  <span className="truncate text-right font-mono text-muted-foreground">
                    {entry.userId ? entry.userId.slice(0, 8) : 'system'}
                  </span>
                </button>

                {expandedId === entry.id && (
                  <div className="border-b bg-muted/20 px-4 py-3">
                    <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                      {formatDetails(entry.details)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t px-4 py-2">
          <p className="text-xs tabular-nums text-muted-foreground">{items.length} entries</p>
        </div>
      </div>
    </div>
  )
}
