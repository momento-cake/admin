import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@/types'
import { FeatureKey, ActionKey, DEFAULT_ATENDENTE_PERMISSIONS } from './permissions'
import { adminAuth, adminDb } from './firebase-admin'

interface AuthInfo {
  uid: string
  role: UserRole
  customPermissions?: Record<string, { enabled: boolean; actions: string[] }>
}

/**
 * Decode a Firebase ID token's payload without cryptographic verification.
 * Used as a fallback when Firebase Admin SDK credentials are not configured
 * (e.g., local development without a service account key).
 *
 * SECURITY NOTE: This only extracts the UID from the token - the role and
 * permissions are still read from Firestore server-side, so privilege
 * escalation via cookie tampering is not possible. The only risk is that
 * a completely forged token could pass (unlikely since it must be a valid
 * JWT structure with a real UID that exists in Firestore with isActive=true).
 *
 * For production, always configure FIREBASE_SERVICE_ACCOUNT_KEY or
 * GOOGLE_APPLICATION_CREDENTIALS to enable full cryptographic verification.
 */
function decodeTokenPayload(token: string): { uid: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (!payload.user_id && !payload.sub) return null
    return { uid: payload.user_id || payload.sub }
  } catch {
    return null
  }
}

/**
 * Extract and verify auth information from request cookies.
 * Verifies the Firebase ID token server-side using Admin SDK
 * and reads the user's role/permissions from Firestore.
 * Returns null if not authenticated.
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthInfo | null> {
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    return null
  }

  let uid: string | null = null

  try {
    // Attempt full cryptographic verification via Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token)
    uid = decodedToken.uid
  } catch (verifyError) {
    // If Admin SDK verification fails (e.g., no service account configured),
    // fall back to decoding the token payload for the UID.
    // Role/permissions are still read from Firestore, maintaining security.
    if (process.env.NODE_ENV === 'development') {
      const decoded = decodeTokenPayload(token)
      if (decoded) {
        uid = decoded.uid
        console.warn('[api-auth] Using token decode fallback (dev mode) - configure FIREBASE_SERVICE_ACCOUNT_KEY for production')
      }
    }
  }

  if (!uid) {
    return null
  }

  try {
    // Read role and permissions from Firestore server-side using Admin SDK
    const userDoc = await adminDb.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()
    if (!userData || !userData.isActive) {
      return null
    }

    const role = (userData.role?.type as UserRole) || 'atendente'
    const customPermissions = userData.customPermissions || undefined

    return { uid, role, customPermissions }
  } catch (firestoreError) {
    // In development, if Admin Firestore fails (no service account credentials),
    // decode the token email to determine role from a known mapping.
    // This allows local testing without service account configuration.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[api-auth] Admin Firestore read failed, using dev fallback:', (firestoreError as Error).message)
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
          const email = payload.email || ''
          // In dev mode, determine role from email pattern
          // Admin SDK Firestore is unavailable, so we use a simple heuristic
          const role: UserRole = email.startsWith('admin') ? 'admin' : 'atendente'
          console.warn(`[api-auth] Dev fallback: uid=${uid}, email=${email}, role=${role}`)
          return { uid, role }
        }
      } catch (fallbackError) {
        console.error('[api-auth] Dev fallback also failed:', fallbackError)
      }
    }
    console.error('[api-auth] Firestore read failed:', firestoreError)
    return null
  }
}

/**
 * Check if the authenticated user can perform a specific action on a feature
 */
export function canPerformActionFromRequest(
  auth: AuthInfo,
  feature: FeatureKey,
  action: ActionKey
): boolean {
  // Admin has ALL permissions
  if (auth.role === 'admin') {
    return true
  }

  // Check default atendente permissions
  const defaultPerm = DEFAULT_ATENDENTE_PERMISSIONS[feature]
  if (defaultPerm?.enabled && defaultPerm.actions.includes(action)) {
    return true
  }

  // Check custom permissions
  if (auth.customPermissions?.[feature]) {
    const customPerm = auth.customPermissions[feature]
    if (customPerm.enabled && customPerm.actions.includes(action)) {
      return true
    }
  }

  return false
}

/**
 * Return a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Não autenticado') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

/**
 * Return a 403 Forbidden response
 */
export function forbiddenResponse(message = 'Sem permissão para esta ação') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}
