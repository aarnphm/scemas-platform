// ReportEnvironmentalHazard admin triage page (SRS CP-C3)

import { ReportsManager } from '@/components/admin/reports-manager'

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-balance">hazard reports</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          review and triage environmental hazard reports submitted by public users and operators
        </p>
      </div>
      <ReportsManager />
    </div>
  )
}
