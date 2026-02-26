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
  '/images'
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
  '/api/public'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
