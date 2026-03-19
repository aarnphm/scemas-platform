// CityOperatorAgent main dashboard view
// shows: map with sensors, metric cards, active alert list
// this is the primary Presentation component for the operator agent

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">operator dashboard</h1>

      {/* map + metrics grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* map placeholder */}
        <div className="col-span-2 h-96 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">hamilton sensor map (phase 6)</p>
        </div>

        {/* metric cards */}
        <div className="space-y-4">
          {['temperature', 'humidity', 'air quality', 'noise level'].map(metric => (
            <div key={metric} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{metric}</p>
              <p className="font-mono text-2xl">--</p>
            </div>
          ))}
        </div>
      </div>

      {/* active alerts */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium">active alerts</h2>
        <p className="text-sm text-muted-foreground">alert table (phase 6)</p>
      </div>
    </div>
  )
}
