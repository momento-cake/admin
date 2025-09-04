import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { connectAuthEmulator } from 'firebase/auth'

// Validate Firebase configuration
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingEnvVars)
  console.error('Please check your .env.local file and ensure all Firebase variables are set.')
  
  // In development, show a helpful message
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📝 To fix this:')
    console.log('1. Copy .env.example to .env.local')
    console.log('2. Get your Firebase config from: https://console.firebase.google.com/')
    console.log('3. Replace the placeholder values with your actual Firebase config\n')
  }
}

// Check if we're using placeholder values
const hasPlaceholderValues = requiredEnvVars.some(envVar => {
  const value = process.env[envVar]
  return value?.includes('your-') || value?.includes('YOUR_')
})

if (hasPlaceholderValues) {
  console.warn('⚠️ Firebase configuration contains placeholder values')
  console.warn('Please update .env.local with your actual Firebase configuration')
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
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