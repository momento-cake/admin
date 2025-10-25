const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Use the service account key or default credentials
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'momentocake-admin-dev'
  });
}

const db = admin.firestore();

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user document...');
    
    // The UID should match the authenticated user
    // We'll use a predictable UID based on the email
    const adminEmail = 'admin@momentocake.com.br';
    
    // First, let's try to find any existing user documents
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Found ${usersSnapshot.size} existing user documents`);
    
    if (usersSnapshot.size > 0) {
      usersSnapshot.forEach(doc => {
        console.log(`👤 Existing user: ${doc.id} ->`, doc.data());
      });
    }
    
    // Check if we can find a user with our admin email
    const adminQuery = await db.collection('users').where('email', '==', adminEmail).get();
    
    if (!adminQuery.empty) {
      console.log('✅ Admin user already exists');
      adminQuery.forEach(doc => {
        console.log(`👤 Admin user: ${doc.id} ->`, doc.data());
      });
      return;
    }
    
    // Create admin user with a known UID pattern
    // Firebase Auth typically creates UIDs like this format
    const adminUID = 'admin-user-momentocake-dev';
    
    const userData = {
      uid: adminUID,
      email: adminEmail,
      role: {
        type: 'admin'
      },
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(adminUID).set(userData);
    console.log(`✅ Admin user document created with UID: ${adminUID}`);
    
    // Also create a system settings document to track admin existence
    await db.collection('system').doc('settings').set({
      hasAdminUsers: true,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ System settings updated');
    
    // Now let's test the security rules by trying to read ingredients
    try {
      const ingredientsSnapshot = await db.collection('ingredients').limit(5).get();
      console.log(`🧪 Security test: Found ${ingredientsSnapshot.size} ingredients`);
      
      if (ingredientsSnapshot.size > 0) {
        ingredientsSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`🌿 Ingredient: ${data.name || 'Unknown'}`);
        });
      }
    } catch (secError) {
      console.log('⚠️ Security test failed (expected with current rules):', secError.message);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

// Run the function
createAdminUser().then(() => {
  console.log('🎯 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});