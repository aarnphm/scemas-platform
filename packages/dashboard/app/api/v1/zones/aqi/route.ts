import { createDb } from '@scemas/db'

import { createDataDistributionManager } from '@/server/data-distribution-manager'
import { getDatabaseUrl } from '@/server/env'

export async function GET(): Promise<Response> {
  const db = createDb(getDatabaseUrl())
  const manager = createDataDistributionManager(db)
  const zones = await manager.getPublicZoneAqi()

  return Response.json(zones, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=30',
    },
  })
}
