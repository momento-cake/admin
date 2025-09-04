import { NextRequest, NextResponse } from 'next/server'
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { UserRegistrationData, UserModel } from '@/types'

// POST /api/auth/register - Register new user from invitation
export async function POST(request: NextRequest) {
  try {
    const body: UserRegistrationData = await request.json()
    const {
      invitationToken,
      firstName,
      lastName,
      email,
      password,
      phone,
      department,
      acceptsTerms
    } = body

    // Validate required fields
    if (!invitationToken || !firstName || !lastName || !email || !password || !acceptsTerms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify invitation token
    const invitationQuery = query(
      collection(db, 'invitations'),
      where('token', '==', invitationToken),
      where('status', '==', 'pending')
    )
    
    const invitationSnapshot = await getDocs(invitationQuery)
    
    if (invitationSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    const invitationDoc = invitationSnapshot.docs[0]
    const invitationData = invitationDoc.data()
    
    // Verify email matches invitation
    if (email.toLowerCase() !== invitationData.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      )
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = invitationData.expiresAt.toDate()
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update user profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      })

      // Send email verification
      await sendEmailVerification(user)

      // Create user document in Firestore
      const userData: UserModel = {
        uid: user.uid,
        email: user.email!,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
        role: {
          type: invitationData.role
        },
        createdAt: new Date(),
        isActive: true,
        metadata: {
          firstName,
          lastName,
          phone: phone || '',
          department: department || invitationData.metadata?.department || '',
          registeredFrom: 'invitation',
          invitationId: invitationDoc.id
        }
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      // Update invitation status to accepted
      await updateDoc(doc(db, 'invitations', invitationDoc.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      })

      return NextResponse.json({
        success: true,
        message: 'User registered successfully',
        userId: user.uid,
        requiresEmailVerification: true
      })

    } catch (authError: unknown) {
      console.error('Authentication error:', authError)
      
      // Handle specific Firebase Auth errors
      const firebaseError = authError as { code?: string }
      if (firebaseError.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      } else if (firebaseError.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak. Please choose a stronger password' },
          { status: 400 }
        )
      } else if (firebaseError.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        )
      }
      
      throw authError
    }

  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}