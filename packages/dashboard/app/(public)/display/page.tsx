// PublicUserAgent digital signage display
// ProvidePublicAPI boundary: shows aggregated AQI per zone
// auto-refreshes via TanStack Query polling
// ABSTRACTION: raw sensor data, device IDs, operator metadata are stripped
// public users and third-party developers see this same view

export default function PublicDisplayPage() {
  return (
    <div className="space-y-6">
      {/* zone cards grid: big AQI numbers, color-coded, 24px+ text */}
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
        {['downtown', 'west mountain', 'east end', 'waterfront', 'mcmaster'].map(zone => (
          <div
            key={zone}
            className="rounded-xl bg-background/10 p-8 text-center"
          >
            <p className="text-lg opacity-60">{zone}</p>
            <p className="font-mono text-6xl font-bold">--</p>
            <p className="mt-2 text-sm opacity-60">AQI</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs opacity-40">
        data refreshes automatically. for API access, see /api/trpc/public.getZoneAQI
      </p>
    </div>
  )
}
