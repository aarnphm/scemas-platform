// Alert detail + acknowledge flow
// click 1: arrive here. click 2: acknowledge button. click 3: confirm dialog
export default function AlertDetailPage({ params }: { params: Promise<{ alertId: string }> }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">alert detail</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">alert detail + acknowledge dialog (phase 6)</p>
      </div>
    </div>
  )
}
