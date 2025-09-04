import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// POST /api/invitations/verify - Verify invitation token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find invitation by token
    const q = query(
      collection(db, 'invitations'),
      where('token', '==', token),
      where('status', '==', 'pending')
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 404 }
      )
    }

    const invitationDoc = querySnapshot.docs[0]
    const invitationData = invitationDoc.data()
    
    // Check if invitation is expired
    const now = new Date()
    const expiresAt = invitationData.expiresAt.toDate()
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Return invitation details (excluding sensitive data)
    const invitation = {
      id: invitationDoc.id,
      email: invitationData.email,
      name: invitationData.name,
      role: invitationData.role,
      invitedAt: invitationData.invitedAt?.toDate(),
      expiresAt: invitationData.expiresAt?.toDate(),
      metadata: invitationData.metadata,
    }

    return NextResponse.json({
      valid: true,
      invitation
    })
  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}