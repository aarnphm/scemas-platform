import { createDb } from '@scemas/db'

import { SubscriptionManager } from '@/components/operator/subscription-manager'
import { getDatabaseUrl } from '@/server/env'

// ManageAlertSubscriptions boundary (innovative feature)
export default async function SubscriptionsPage() {
  const db = createDb(getDatabaseUrl())
  const devices = await db.query.devices.findMany({
    columns: { zone: true },
  })
  const availableZones = Array.from(new Set(devices.map(device => device.zone))).sort()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">alert subscriptions</h1>
      <p className="text-sm text-muted-foreground">personalize which alerts you receive</p>
      <SubscriptionManager availableZones={availableZones} />
    </div>
  )
}
