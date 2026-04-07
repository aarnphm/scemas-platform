// PublicUserAgent digital signage display
// ProvidePublicAPI boundary: shows aggregated AQI per monitoring region
// auto-refreshes via the versioned public REST API
// ABSTRACTION: raw sensor data, device IDs, operator metadata are stripped
// public users and third-party developers see this same view

import type { Metadata } from 'next'
import { ZoneAqiGrid } from '@/components/public/zone-aqi-grid'
import { HazardReportSection } from './hazard-report-section'

export const metadata: Metadata = { title: 'air quality display' }

export default function PublicDisplayPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-normal text-balance">
            public environmental monitoring display
          </h1>
          <p className="text-sm text-muted-foreground/70 text-pretty">
            live monitoring-region conditions grouped from hamilton&apos;s official planning-unit
            layer. the public api route stays <code>/api/v1/zones/aqi</code> for compatibility.
          </p>
        </div>
      </div>
      <ZoneAqiGrid />
      <HazardReportSection />
    </div>
  )
}
