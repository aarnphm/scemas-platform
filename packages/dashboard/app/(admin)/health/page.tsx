// MonitorSCEMASPlatformStatus boundary (DataDistributionManager)
export default function HealthPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">platform health</h1>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">subsystem status, uptime, latency, error rate (phase 6)</p>
      </div>
    </div>
  )
}
