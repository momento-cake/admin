import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/users',
  '/clients',
  '/ingredients',
  '/recipes',
  '/products',
  '/packaging',
  '/orders',
  '/reports',
  '/settings',
  '/images',
  '/ponto'
]

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/setup',
  '/api/auth/register',
  '/api/invitations',
  '/gallery',
  '/pedido',
  '/api/public'
]

const PORTAL_SUBDOMAIN = 'pedidos.momentocake.com.br'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Subdomain routing for pedidos.momentocake.com.br
  if (hostname === PORTAL_SUBDOMAIN) {
    // Already on /pedido/* path — let it through
    if (pathname.startsWith('/pedido/')) {
      return NextResponse.next()
    }

    // Single path segment like /{token} — rewrite to /pedido/{token}
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 1) {
      const token = segments[0]
      const rewriteUrl = new URL(`/pedido/${token}`, request.url)
      return NextResponse.rewrite(rewriteUrl)
    }

    // Everything else on subdomain (root, multi-segment paths) → 404
    return new NextResponse('Not Found', { status: 404 })
  }

  // Skip middleware for static files, API routes, and Next.js internal routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if the route requires protection
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // The auth-token cookie contains a real Firebase ID token that is verified
  // server-side in api-auth.ts using Firebase Admin SDK. Middleware only checks
  // for its presence to gate navigation; role-based permission enforcement
  // happens server-side in API routes and client-side in page components.
  const authToken = request.cookies.get('auth-token')?.value

  if (isProtectedRoute) {
    // If no auth token, redirect to login
    if (!authToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public files (images, etc.)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
