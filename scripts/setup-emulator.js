#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Setup script for Firebase emulator with admin user and sample data
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Set emulator environment variables
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'momentocake-admin-dev'
});

const db = getFirestore(app);
const auth = getAuth(app);

async function setupEmulator() {
  try {
    console.log('🚀 Setting up Firebase emulator...');
    
    // Create admin user in auth emulator
    const adminEmail = 'admin@momentocake.com.br';
    const adminPassword = 'G8j5k188';
    
    console.log('👤 Creating admin user...');
    let adminUser;
    try {
      adminUser = await auth.createUser({
        uid: 'admin-user-123',
        email: adminEmail,
        password: adminPassword,
        displayName: 'Administrador Master',
        emailVerified: true
      });
      console.log(`✅ Admin user created: ${adminUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        console.log('⚠️ Admin user already exists');
        adminUser = { uid: 'admin-user-123' };
      } else {
        throw error;
      }
    }
    
    // Create admin user document in Firestore
    console.log('📄 Creating admin user document...');
    await db.collection('users').doc(adminUser.uid).set({
      email: adminEmail,
      displayName: 'Administrador Master',
      role: {
        type: 'admin',
        level: 'master'
      },
      isActive: true,
      businessId: null,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    console.log('✅ Admin user document created');
    
    // Create system settings document
    console.log('⚙️ Creating system settings...');
    await db.collection('system').doc('settings').set({
      hasAdminUsers: true,
      setupCompleted: true,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    console.log('✅ System settings created');
    
    // Create sample ingredients
    console.log('🥕 Creating sample ingredients...');
    const ingredients = [
      {
        name: 'Farinha de Trigo',
        description: 'Farinha de trigo especial para bolos',
        unit: 'kg',
        currentPrice: 5.50,
        currentStock: 50,
        minStock: 10,
        category: 'farinha',
        allergens: ['glúten'],
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        createdBy: 'system'
      },
      {
        name: 'Açúcar Refinado',
        description: 'Açúcar refinado para confeitaria',
        unit: 'kg',
        currentPrice: 4.20,
        currentStock: 30,
        minStock: 5,
        category: 'açúcar',
        allergens: [],
        isActive: true,
        createdAt: new Date(),
        lastUpdated: new Date(),
        createdBy: 'system'
      }
    ];
    
    for (const ingredient of ingredients) {
      await db.collection('ingredients').add(ingredient);
    }
    console.log('✅ Sample ingredients created');
    
    // Create sample suppliers
    console.log('🏪 Creating sample suppliers...');
    const suppliers = [
      {
        name: 'Distribuidora Momentocake',
        contactPerson: 'João Silva',
        phone: '(11) 99999-9999',
        email: 'joao@distribuidora.com.br',
        cep: '01234-567',
        estado: 'SP',
        cidade: 'São Paulo',
        bairro: 'Centro',
        endereco: 'Rua das Flores',
        numero: '123',
        complemento: 'Sala 456',
        cpfCnpj: '12.345.678/0001-90',
        rating: 4.5,
        categories: ['ingredientes', 'farinha', 'açúcar'],
        isActive: true,
        createdAt: new Date()
      }
    ];
    
    for (const supplier of suppliers) {
      await db.collection('suppliers').add(supplier);
    }
    console.log('✅ Sample suppliers created');
    
    console.log('🎉 Firebase emulator setup completed successfully!');
    console.log('📝 Admin login: admin@momentocake.com.br / G8j5k188');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupEmulator();