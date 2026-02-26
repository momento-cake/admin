import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'momentocake-admin-dev'

function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // Option 1: Service account key JSON provided via env var
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson)
      console.log('[firebase-admin] Initialized with service account key')
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })
    } catch (error) {
      console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error)
    }
  }

  // Option 2: Service account key file path via GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      console.log('[firebase-admin] Initialized with GOOGLE_APPLICATION_CREDENTIALS')
      return initializeApp({
        credential: applicationDefault(),
        projectId,
      })
    } catch (error) {
      console.error('[firebase-admin] Failed with GOOGLE_APPLICATION_CREDENTIALS:', error)
    }
  }

  // Option 3: Application Default Credentials (GCP environments, gcloud CLI)
  try {
    const app = initializeApp({
      credential: applicationDefault(),
      projectId,
    })
    console.log('[firebase-admin] Initialized with Application Default Credentials')
    return app
  } catch (error) {
    console.warn('[firebase-admin] Application Default Credentials not available:', (error as Error).message)
  }

  // Option 4: Initialize without credentials (projectId only)
  // This allows Firestore access in environments with implicit credentials
  // but verifyIdToken will need to be handled differently
  console.warn('[firebase-admin] Initializing without explicit credentials - token verification may be limited')
  return initializeApp({ projectId })
}

let app: App
let _adminAuth: Auth
let _adminDb: Firestore

try {
  app = initializeFirebaseAdmin()
  _adminAuth = getAuth(app)
  _adminDb = getFirestore(app)
} catch (error) {
  console.error('[firebase-admin] Critical initialization error:', error)
  // Create a minimal app to prevent crashes
  app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId })
  _adminAuth = getAuth(app)
  _adminDb = getFirestore(app)
}

export const adminAuth = _adminAuth
export const adminDb = _adminDb
