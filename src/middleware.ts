import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types'

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
  '/settings'
]

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/setup',
  '/api/auth/register',
  '/api/invitations'
]

// Feature permissions map (duplicated from permissions.ts for edge runtime compatibility)
const FEATURE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ['admin', 'atendente'],
  clients: ['admin', 'atendente'],
  users: ['admin'],
  ingredients: ['admin'],
  recipes: ['admin'],
  products: ['admin'],
  packaging: ['admin'],
  orders: ['admin'],
  reports: ['admin'],
  settings: ['admin'],
}

// Path to feature mapping
const PATH_TO_FEATURE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/clients': 'clients',
  '/ingredients': 'ingredients',
  '/recipes': 'recipes',
  '/products': 'products',
  '/packaging': 'packaging',
  '/orders': 'orders',
  '/reports': 'reports',
  '/settings': 'settings',
}

function canAccessPath(role: UserRole, path: string): boolean {
  const normalizedPath = path.replace(/\/$/, '')

  // Find feature for path
  for (const [pathPrefix, feature] of Object.entries(PATH_TO_FEATURE)) {
    if (normalizedPath === pathPrefix || normalizedPath.startsWith(pathPrefix + '/')) {
      return FEATURE_PERMISSIONS[feature]?.includes(role) ?? false
    }
  }

  // Default to allowed for routes not in the map
  return true
}

function getDefaultRedirectPath(role: UserRole): string {
  if (role === 'atendente') {
    return '/clients'
  }
  return '/dashboard'
}

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

  // Get authentication status from cookies
  const authToken = request.cookies.get('auth-token')?.value
  const userRole = request.cookies.get('user-role')?.value as UserRole | undefined

  if (isProtectedRoute) {
    // If no auth token, redirect to login
    if (!authToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check feature access based on role
    if (userRole && !canAccessPath(userRole, pathname)) {
      const redirectPath = getDefaultRedirectPath(userRole)
      const redirectUrl = new URL(redirectPath, request.url)
      redirectUrl.searchParams.set('access_denied', 'true')
      return NextResponse.redirect(redirectUrl)
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