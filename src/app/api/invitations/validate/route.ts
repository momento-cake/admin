import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { UserInvitation } from '@/types'

// POST /api/invitations/validate - Validate invitation by email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email }: { email: string } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check for pending invitation
    const invitationQuery = query(
      collection(db, 'invitations'),
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    )
    
    const querySnapshot = await getDocs(invitationQuery)
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'No pending invitation found for this email' },
        { status: 404 }
      )
    }

    // Get the invitation data
    const invitationDoc = querySnapshot.docs[0]
    const invitationData = invitationDoc.data() as Omit<UserInvitation, 'id'>
    
    // Check if invitation is expired
    const now = new Date()
    const expiresAt = invitationData.expiresAt instanceof Date 
      ? invitationData.expiresAt 
      : (invitationData.expiresAt as unknown as { toDate(): Date }).toDate()
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Return invitation details for registration form pre-filling
    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitationDoc.id,
        email: invitationData.email,
        name: invitationData.name,
        role: invitationData.role,
        token: invitationData.token,
        department: invitationData.metadata?.department,
        invitedBy: invitationData.invitedBy,
        expiresAt: expiresAt
      }
    })
  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}