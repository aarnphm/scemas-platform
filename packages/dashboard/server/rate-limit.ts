import type { Database } from '@scemas/db'
import { rateLimitHits } from '@scemas/db/schema'
import { and, gte, eq, sql, count, lt } from 'drizzle-orm'

const DEFAULT_TOKEN_LIMIT = 100
const DEFAULT_IP_LIMIT = 30
const WINDOW_SECONDS = 60
const CLEANUP_PROBABILITY = 0.01

type RateLimitResult =
  | { allowed: true; remaining: number; limit: number }
  | { allowed: false; retryAfterSeconds: number; limit: number }

export async function checkRateLimit(
  db: Database,
  identifier: string,
  identifierType: 'token' | 'ip',
  endpoint: string,
  limitPerMinute?: number,
): Promise<RateLimitResult> {
  const limit =
    limitPerMinute ?? (identifierType === 'token' ? DEFAULT_TOKEN_LIMIT : DEFAULT_IP_LIMIT)
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000)

  const [row] = await db
    .select({ count: count() })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.identifier, identifier), gte(rateLimitHits.hitAt, windowStart)))

  const currentCount = row?.count ?? 0

  if (currentCount >= limit) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS, limit }
  }

  await db.insert(rateLimitHits).values({ identifier, identifierType, endpoint })

  // probabilistic cleanup of old rows
  if (Math.random() < CLEANUP_PROBABILITY) {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000)
    db.delete(rateLimitHits)
      .where(lt(rateLimitHits.hitAt, cutoff))
      .execute()
      .catch(() => {})
  }

  return { allowed: true, remaining: limit - currentCount - 1, limit }
}

export function createRateLimitExceededResponse(
  retryAfterSeconds: number,
  limit: number,
): Response {
  return Response.json(
    { error: 'rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

export function rateLimitHeaders(remaining: number, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  }
}

export async function getClientIp(request: Request): Promise<string> {
  const cfIp = request.headers.get('cf-connecting-ip')
  const forwarded = request.headers.get('x-forwarded-for')
  const raw = cfIp ?? forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'

  const encoded = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return `ip:${hex.slice(0, 16)}`
}
