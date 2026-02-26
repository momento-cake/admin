/**
 * Seed script to create a test atendente user for permission testing.
 * Run: node scripts/seed-atendente.mjs
 */
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtj_dM0gsUaQiG9mnPKeQ5lp1Lcj7PY4s",
  authDomain: "momentocake-admin-dev.firebaseapp.com",
  projectId: "momentocake-admin-dev",
  storageBucket: "momentocake-admin-dev.firebasestorage.app",
  messagingSenderId: "847106871689",
  appId: "1:847106871689:web:e98fe63fd92acd846c9158"
};

const ADMIN_EMAIL = 'setup@momentocake.com.br';
const ADMIN_PASSWORD = 'Setup1234';
const ATENDENTE_EMAIL = 'atendente@momentocake.com.br';
const ATENDENTE_PASSWORD = 'Atend1234';

async function seedAtendente() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Step 1: Get the atendente UID (user already created in Auth)
    console.log('Signing in as atendente to get UID...');
    const atendenteCred = await signInWithEmailAndPassword(auth, ATENDENTE_EMAIL, ATENDENTE_PASSWORD);
    const atendenteUid = atendenteCred.user.uid;
    console.log(`Atendente UID: ${atendenteUid}`);

    // Step 2: Sign in as admin to write Firestore doc
    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin signed in');

    // Step 3: Create user document for atendente
    console.log('Creating Firestore user doc...');
    await setDoc(doc(db, 'users', atendenteUid), {
      email: ATENDENTE_EMAIL,
      displayName: 'Test Atendente',
      emailVerified: true,
      role: { type: 'atendente' },
      isActive: true,
      createdAt: new Date(),
      lastSignInAt: new Date(),
      metadata: {
        firstName: 'Test',
        lastName: 'Atendente',
        registeredFrom: 'seed-script'
      }
    });

    console.log(`\nAtendente user ready:`);
    console.log(`  Email: ${ATENDENTE_EMAIL}`);
    console.log(`  Password: ${ATENDENTE_PASSWORD}`);
    console.log(`  Role: atendente`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

seedAtendente();
