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

  // Behind Firebase App Hosting's proxy, `host` is the internal *.hosted.app
  // backend host — the original requested domain (e.g. pedidos.momentocake.com.br)
  // arrives in `x-forwarded-host`. Prefer it (taking the first value and
  // stripping any port) so the portal rewrite still fires in production.
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  const hostname = rawHost.split(',')[0].trim().split(':')[0]

  // Subdomain routing for pedidos.momentocake.com.br
  if (hostname === PORTAL_SUBDOMAIN) {
    // Static assets and Next internals must serve normally. Without this they
    // hit the multi-segment catch-all 404 below — e.g. /brand/logo.png (the
    // brand mark) and /_next/* chunks would 404, breaking the portal page.
    // Tokens are UUIDs (no dots), so the extension check never catches them.
    if (pathname.startsWith('/_next/') || pathname.includes('.')) {
      return NextResponse.next()
    }

    // Already on /pedido/* path — let it through
    if (pathname.startsWith('/pedido/')) {
      return NextResponse.next()
    }

    // Single path segment like /{token} — rewrite to /pedido/{token}/.
    // The trailing slash is REQUIRED: next.config has `trailingSlash: true`,
    // so the page route is canonically registered at /pedido/{token}/. A
    // middleware rewrite is server-side with no client redirect to normalize
    // the slash, so rewriting to the slash-less path 404s. See subdomain test.
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 1) {
      const token = segments[0]
      const rewriteUrl = new URL(`/pedido/${token}/`, request.url)
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
