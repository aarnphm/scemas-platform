// Next.js middleware: JWT validation + role-based routing
// mirrors the Authenticating state in the data distribution state chart:
// ValidateToken → AuthorizeRole → grant/deny

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// routes that require authentication (any role)
const protectedPaths = ['/dashboard', '/alerts', '/subscriptions', '/metrics']

// routes that require admin role
const adminPaths = ['/rules', '/users', '/health', '/audit']

// public paths (no auth needed)
const publicPaths = ['/login', '/signup', '/display', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('scemas-token')?.value

  // public paths always allowed
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // no token: redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // TODO phase 3: decode JWT, check role, enforce admin paths
  // for now: allow all authenticated requests

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
