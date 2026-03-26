import { useState } from 'react'
import { useTauriMutation } from '@/lib/tauri'

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

interface HazardReport {
  id: string
  zone: string
  category: string
  description: string
  status: ReportStatus
  contactEmail: string | null
  reportedBy: string | null
  reviewedBy: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

const statusFilters = ['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const

const categoryLabels: Record<string, string> = {
  environmental_hazard: 'hazard',
  system_misuse: 'misuse',
  inappropriate_content: 'content',
  other: 'other',
}

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700',
  reviewing: 'bg-blue-500/15 text-blue-700',
  resolved: 'bg-green-500/15 text-green-700',
  dismissed: 'bg-muted text-muted-foreground',
}

const PLACEHOLDER_REPORTS: HazardReport[] = [
  {
    id: 'placeholder-1',
    zone: 'downtown_core',
    category: 'environmental_hazard',
    description:
      'elevated particulate matter near intersection of King and James. multiple readings above 150 PM2.5 for 3 consecutive hours.',
    status: 'pending',
    contactEmail: 'citizen@example.com',
    reportedBy: null,
    reviewedBy: null,
    reviewNote: null,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3600_000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'placeholder-2',
    zone: 'waterfront',
    category: 'environmental_hazard',
    description:
      'noise levels consistently above 85dB near waterfront construction site during non-permitted hours.',
    status: 'reviewing',
    contactEmail: null,
    reportedBy: null,
    reviewedBy: null,
    reviewNote: 'contacted bylaw enforcement, awaiting site inspection',
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
    updatedAt: new Date(Date.now() - 43200_000).toISOString(),
    resolvedAt: null,
  },
  {
    id: 'placeholder-3',
    zone: 'industrial_zone',
    category: 'other',
    description: 'temperature sensor appears stuck at -40C, likely hardware failure.',
    status: 'resolved',
    contactEmail: null,
    reportedBy: null,
    reviewedBy: null,
    reviewNote: 'sensor replaced by field team, readings normal',
    createdAt: new Date(Date.now() - 172800_000).toISOString(),
    updatedAt: new Date(Date.now() - 86400_000).toISOString(),
    resolvedAt: new Date(Date.now() - 86400_000).toISOString(),
  },
]

export function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  // TODO: replace with useTauriQuery once reports_list command exists
  const reports = PLACEHOLDER_REPORTS

  const updateStatus = useTauriMutation<{
    args: { id: string; status: ReportStatus; reviewNote: string | null }
  }>('reports_update_status', ['reports_list'])

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter)

  function handleAction(id: string, status: ReportStatus) {
    updateStatus.mutate(
      { args: { id, status, reviewNote: reviewNote.trim() || null } },
      {
        onSuccess: () => {
          setExpandedId(null)
          setReviewNote('')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">hazard reports</h1>
        <p className="text-sm text-muted-foreground">
          review and triage environmental hazard reports submitted by public users and operators
        </p>
      </div>

      <div className="flex items-center gap-2">
        {statusFilters.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-8 rounded-md px-3 text-xs font-medium ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'border border-input hover:bg-accent'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="text-xs text-amber-600">
        reports_list command pending implementation. showing placeholder data.
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">no reports found</p>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              view all reports
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => (
            <div key={report.id} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => {
                  setExpandedId(expandedId === report.id ? null : report.id)
                  setReviewNote('')
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLS[report.status] ?? ''}`}
                  >
                    {report.status}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium">
                    {categoryLabels[report.category] ?? report.category}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {report.zone.replaceAll('_', ' ')}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleString()}
                </span>
              </button>

              {expandedId === report.id && (
                <div className="border-t px-4 py-3 space-y-3">
                  <p className="text-sm">{report.description}</p>

                  {report.contactEmail && (
                    <p className="text-xs text-muted-foreground">contact: {report.contactEmail}</p>
                  )}

                  {report.reviewNote && (
                    <p className="text-xs text-muted-foreground">
                      review note: {report.reviewNote}
                    </p>
                  )}

                  {(report.status === 'pending' || report.status === 'reviewing') && (
                    <div className="space-y-2">
                      <textarea
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        placeholder="review note (optional)"
                        rows={2}
                        maxLength={500}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        {report.status === 'pending' && (
                          <button
                            disabled={updateStatus.isPending}
                            onClick={() => handleAction(report.id, 'reviewing')}
                            className="h-8 rounded-md border border-input px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            start review
                          </button>
                        )}
                        <button
                          disabled={updateStatus.isPending}
                          onClick={() => handleAction(report.id, 'resolved')}
                          className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          resolve
                        </button>
                        <button
                          disabled={updateStatus.isPending}
                          onClick={() => handleAction(report.id, 'dismissed')}
                          className="h-8 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                        >
                          dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
