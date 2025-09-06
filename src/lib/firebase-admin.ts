import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Set emulator environment variables for development
if (process.env.NODE_ENV === 'development') {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
}

// Determine environment
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev'
const isProduction = environment === 'prod'

// Get Firebase Admin configuration
const getAdminConfig = () => {
  if (isProduction) {
    return {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_PROD,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL_PROD,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY_PROD?.replace(/\\n/g, '\n'),
    }
  } else {
    return {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  }
}

const config = getAdminConfig()

// Initialize Firebase Admin SDK
let adminApp
if (!getApps().length) {
  try {
    if (process.env.NODE_ENV === 'development') {
      // For development with emulator, use the actual project ID from config
      adminApp = initializeApp({
        projectId: config.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'momentocake-admin-dev',
      })
      console.log('🔧 Firebase Admin initialized for development with emulator')
    } else if (config.projectId && config.clientEmail && config.privateKey) {
      // Production configuration with service account
      adminApp = initializeApp({
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
        projectId: config.projectId,
      })
      console.log(`✅ Firebase Admin initialized for ${environment} environment`)
    } else {
      // Fallback configuration
      adminApp = initializeApp({
        projectId: config.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'momentocake-admin-dev',
      })
      console.log('⚠️ Firebase Admin initialized with fallback configuration')
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error)
    throw error
  }
} else {
  adminApp = getApps()[0]
}

// Export Firebase Admin services
export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)
export { adminApp }

// Note: Emulator connection is handled automatically via environment variables set above