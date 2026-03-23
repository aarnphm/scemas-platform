import { getManager } from '@/server/cached'
import { createPublicApiResponse, withPublicRateLimit } from '@/server/public-api'

export async function GET(request: Request): Promise<Response> {
  return withPublicRateLimit(request, async () => {
    const manager = getManager()
    return createPublicApiResponse(await manager.getPublicZoneAqi(), 'live')
  })
}
