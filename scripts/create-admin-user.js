const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin (will use default credentials if available)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'momentocake-admin-dev',
    });
  } catch (error) {
    console.log('Using default credentials...');
    admin.initializeApp();
  }
}

const db = getFirestore();
const auth = getAuth();

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...');
    
    const adminEmail = 'admin@momentocake.com';
    const adminPassword = 'MomentoCake2024!';
    
    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        emailVerified: true,
        displayName: 'Admin User'
      });
      console.log('✅ Firebase Auth user created:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('ℹ️ User already exists in Auth, getting user record...');
        userRecord = await auth.getUserByEmail(adminEmail);
      } else {
        throw error;
      }
    }
    
    // Create user document in Firestore
    const userDoc = {
      email: adminEmail,
      displayName: 'Admin User',
      role: {
        type: 'admin',
        permissions: ['all']
      },
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null,
      preferences: {
        language: 'pt-BR',
        theme: 'light',
        timezone: 'America/Sao_Paulo'
      }
    };
    
    await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
    console.log('✅ User document created in Firestore');
    
    // Set custom claims for role-based access
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isActive: true
    });
    console.log('✅ Custom claims set');
    
    // Create system settings to indicate admin exists
    await db.collection('system').doc('settings').set({
      hasAdminUsers: true,
      setupCompleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ System settings updated');
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🆔 UID:', userRecord.uid);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 'app/invalid-credential') {
      console.log('\n💡 To fix this, you need to:');
      console.log('1. Go to Firebase Console -> Project Settings -> Service Accounts');
      console.log('2. Generate a new private key');
      console.log('3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"');
    }
  }
}

createAdminUser().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Failed:', error);
  process.exit(1);
});