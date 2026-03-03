/**
 * Seed script to create a test producao user for permission testing.
 * Run: node scripts/seed-producao.mjs
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

const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const PRODUCAO_EMAIL = 'producao@momentocake.com.br';
const PRODUCAO_PASSWORD = 'Prod1234';

async function seedProducao() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    // Step 1: Try to create the producao user in Firebase Auth
    console.log('Creating producao user in Firebase Auth...');
    let producaoUid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, PRODUCAO_EMAIL, PRODUCAO_PASSWORD);
      producaoUid = cred.user.uid;
      console.log(`Created new user with UID: ${producaoUid}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log('User already exists, signing in...');
        const cred = await signInWithEmailAndPassword(auth, PRODUCAO_EMAIL, PRODUCAO_PASSWORD);
        producaoUid = cred.user.uid;
        console.log(`Existing user UID: ${producaoUid}`);
      } else {
        throw e;
      }
    }

    // Step 2: Sign in as admin to write Firestore doc
    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('Admin signed in');

    // Step 3: Create user document for producao
    console.log('Creating Firestore user doc...');
    await setDoc(doc(db, 'users', producaoUid), {
      email: PRODUCAO_EMAIL,
      displayName: 'Test Producao',
      emailVerified: true,
      role: { type: 'producao' },
      isActive: true,
      createdAt: new Date(),
      lastSignInAt: new Date(),
      metadata: {
        firstName: 'Test',
        lastName: 'Producao',
        registeredFrom: 'seed-script'
      }
    });

    console.log(`\nProducao user ready:`);
    console.log(`  Email: ${PRODUCAO_EMAIL}`);
    console.log(`  Password: ${PRODUCAO_PASSWORD}`);
    console.log(`  Role: producao`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

seedProducao();
