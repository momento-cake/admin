#!/usr/bin/env node

/**
 * Initial Firebase setup script
 * Creates admin user and initial Firestore data structure
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const app = initializeApp({
  credential: applicationDefault(),
  projectId: 'momentocake-admin-dev'
});

const auth = getAuth(app);
const db = getFirestore(app);

async function createInitialAdminUser() {
  const adminEmail = 'admin@momentocake.com';
  const adminPassword = 'MomentoCake2024!';
  
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: 'Momento Cake Admin',
      emailVerified: true
    });
    
    console.log('✅ Admin user created:', userRecord.uid);
    
    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email: adminEmail,
      displayName: 'Momento Cake Admin',
      role: {
        type: 'admin',
        permissions: ['read', 'write', 'admin']
      },
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
      businessId: null, // Super admin doesn't belong to a specific business
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        phone: '',
        avatar: null
      }
    };
    
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('✅ Admin user document created in Firestore');
    
    // Create system settings document
    const systemSettings = {
      initialized: true,
      version: '1.0.0',
      createdAt: new Date(),
      setupBy: userRecord.uid,
      features: {
        multiTenant: true,
        invitations: true,
        reports: true,
        auditLog: true
      }
    };
    
    await db.collection('system').doc('settings').set(systemSettings);
    console.log('✅ System settings created');
    
    // Create sample business for testing
    const sampleBusiness = {
      name: 'Momento Cake - Empresa Principal',
      description: 'Empresa principal do sistema Momento Cake',
      address: {
        street: 'Rua das Confeitarias, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brasil'
      },
      contact: {
        phone: '(11) 1234-5678',
        email: 'contato@momentocake.com',
        website: 'https://momentocake.com'
      },
      settings: {
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
        businessHours: {
          monday: { open: '08:00', close: '18:00', closed: false },
          tuesday: { open: '08:00', close: '18:00', closed: false },
          wednesday: { open: '08:00', close: '18:00', closed: false },
          thursday: { open: '08:00', close: '18:00', closed: false },
          friday: { open: '08:00', close: '18:00', closed: false },
          saturday: { open: '08:00', close: '14:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        }
      },
      authorizedUsers: [userRecord.uid],
      createdAt: new Date(),
      createdBy: userRecord.uid,
      isActive: true
    };

    const businessRef = await db.collection('businesses').add(sampleBusiness);
    console.log('✅ Sample business created:', businessRef.id);

    // Create sample ingredient categories
    const ingredientCategories = [
      { name: 'Farinhas', description: 'Diferentes tipos de farinhas', businessId: businessRef.id },
      { name: 'Açúcares', description: 'Açúcares e adoçantes', businessId: businessRef.id },
      { name: 'Lácteos', description: 'Leites, cremes e derivados', businessId: businessRef.id },
      { name: 'Ovos', description: 'Ovos e derivados', businessId: businessRef.id },
      { name: 'Chocolates', description: 'Chocolates e cacau', businessId: businessRef.id },
      { name: 'Frutas', description: 'Frutas frescas e secas', businessId: businessRef.id },
      { name: 'Especiarias', description: 'Especiarias e aromas', businessId: businessRef.id }
    ];

    for (const category of ingredientCategories) {
      await db.collection('businesses').doc(businessRef.id)
        .collection('ingredientCategories').add({
          ...category,
          createdAt: new Date(),
          createdBy: userRecord.uid
        });
    }
    console.log('✅ Sample ingredient categories created');

    // Create sample ingredients
    const sampleIngredients = [
      {
        name: 'Farinha de Trigo',
        category: 'Farinhas',
        unit: 'kg',
        currentStock: 25.5,
        minStock: 10,
        maxStock: 50,
        avgCost: 4.50,
        supplier: 'Fornecedor A',
        businessId: businessRef.id,
        isActive: true
      },
      {
        name: 'Açúcar Cristal',
        category: 'Açúcares',
        unit: 'kg',
        currentStock: 15.0,
        minStock: 5,
        maxStock: 30,
        avgCost: 3.20,
        supplier: 'Fornecedor B',
        businessId: businessRef.id,
        isActive: true
      },
      {
        name: 'Chocolate em Pó',
        category: 'Chocolates',
        unit: 'kg',
        currentStock: 8.5,
        minStock: 3,
        maxStock: 20,
        avgCost: 12.50,
        supplier: 'Fornecedor C',
        businessId: businessRef.id,
        isActive: true
      }
    ];

    for (const ingredient of sampleIngredients) {
      await db.collection('businesses').doc(businessRef.id)
        .collection('ingredients').add({
          ...ingredient,
          createdAt: new Date(),
          createdBy: userRecord.uid,
          updatedAt: new Date(),
          updatedBy: userRecord.uid
        });
    }
    console.log('✅ Sample ingredients created');

    // Create audit log entry
    const auditEntry = {
      action: 'system_initialized',
      userId: userRecord.uid,
      userEmail: adminEmail,
      timestamp: new Date(),
      details: {
        version: '1.0.0',
        environment: 'development',
        businessId: businessRef.id,
        samplesCreated: true
      },
      ip: 'system',
      userAgent: 'setup-script'
    };
    
    await db.collection('audit').add(auditEntry);
    console.log('✅ Audit log entry created');
    
    console.log('\n🎉 Initial setup completed successfully!');
    console.log('📝 Admin credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log('\n🌐 Application URL: https://momentocake-admin-dev.web.app');
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

// Run the setup
createInitialAdminUser()
  .then(() => {
    console.log('✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });