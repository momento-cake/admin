import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { connectAuthEmulator } from 'firebase/auth'

// Determine environment
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev'
const isProduction = environment === 'prod'

// Environment-specific configuration
const getFirebaseConfig = () => {
  if (isProduction) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_PROD,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_PROD,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PROD,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_PROD,
    }
  } else {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
  }
}

const firebaseConfig = getFirebaseConfig()

// Validate Firebase configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig])

if (missingKeys.length > 0) {
  console.error(`❌ Missing Firebase configuration for ${environment} environment:`, missingKeys)
  console.error('Please check your .env.local file and ensure all Firebase variables are set.')
} else {
  console.log(`✅ Firebase initialized successfully for ${environment} environment (${firebaseConfig.projectId})`)
}

// Check if we're using placeholder values
const configValues = Object.values(firebaseConfig)
const hasPlaceholderValues = configValues.some(value => 
  typeof value === 'string' && (value.includes('your-') || value.includes('YOUR_'))
)

if (hasPlaceholderValues) {
  console.warn('⚠️ Firebase configuration contains placeholder values')
  console.warn('Please update .env.local with your actual Firebase configuration')
}

// Initialize Firebase
let app
try {
  app = initializeApp(firebaseConfig)
  console.log('✅ Firebase initialized successfully')
} catch (error) {
  console.error('❌ Firebase initialization failed:', error)
  throw new Error('Firebase initialization failed. Check your configuration.')
}

export const auth = getAuth(app)
export const db = getFirestore(app)

// Connect to Firebase emulators in development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    // Connect to Auth emulator
    if (!(auth as any)._config?.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    }
    
    // Connect to Firestore emulator
    if (!(db as any)._delegate?._databaseId?.projectId?.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080)
    }
    
    console.log('🔧 Connected to Firebase emulators')
  } catch (error) {
    console.log('ℹ️ Firebase emulators not available or already connected')
  }
}

export { app }