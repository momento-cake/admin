import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { uid, email } = await request.json();
    
    console.log('🔧 DEBUG: Creating admin user document for:', { uid, email });
    
    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing uid or email' },
        { status: 400 }
      );
    }
    
    // Check if user document already exists
    const userRef = doc(db, 'users', uid);
    const existingDoc = await getDoc(userRef);
    
    if (existingDoc.exists()) {
      const userData = existingDoc.data();
      console.log('👤 User document already exists:', userData);
      return NextResponse.json({
        message: 'User document already exists',
        userData: userData
      });
    }
    
    // Create admin user document
    const userData = {
      uid,
      email,
      role: {
        type: 'admin'
      },
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(userRef, userData);
    
    console.log('✅ Admin user document created successfully');
    
    return NextResponse.json({
      message: 'Admin user document created successfully',
      userData: userData
    });
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user document' },
      { status: 500 }
    );
  }
}