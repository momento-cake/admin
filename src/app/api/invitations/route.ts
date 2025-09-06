import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { UserInvitation } from '@/types'
import { FieldValue } from 'firebase-admin/firestore'
import { generateInvitationToken, sendInvitationEmail } from '@/lib/invitations'

export async function GET(request: NextRequest) {
  try {
    // Get the invitations collection using Firebase Admin SDK
    const invitationsRef = adminDb.collection('invitations')
    const querySnapshot = await invitationsRef.orderBy('invitedAt', 'desc').get()
    
    const invitations: UserInvitation[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      
      const invitation: UserInvitation = {
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        token: data.token,
        invitedBy: data.invitedBy,
        invitedAt: data.invitedAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date(),
        acceptedAt: data.acceptedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
        metadata: data.metadata || {}
      }
      
      invitations.push(invitation)
    })

    return NextResponse.json({
      success: true,
      invitations
    })
    
  } catch (error) {
    console.error('Error fetching invitations:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invitations',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, name, role, department, notes, invitedBy } = body

    // Validate required fields
    if (!email || !name || !role || !invitedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, name, role, invitedBy' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin or viewer' },
        { status: 400 }
      )
    }

    // Check if user with this email already has an invitation
    const existingInvitation = await adminDb.collection('invitations')
      .where('email', '==', email)
      .where('status', 'in', ['pending', 'accepted'])
      .get()

    if (!existingInvitation.empty) {
      return NextResponse.json(
        { success: false, error: 'An active invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate invitation token
    const token = generateInvitationToken()
    
    // Set expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation data
    const invitationData = {
      email,
      name,
      role,
      status: 'pending',
      token,
      invitedBy,
      invitedAt: FieldValue.serverTimestamp(),
      expiresAt,
      metadata: {
        department: department || '',
        notes: notes || ''
      }
    }

    // Save invitation to Firestore
    const docRef = await adminDb.collection('invitations').add(invitationData)

    // Send invitation email
    try {
      await sendInvitationEmail({
        email,
        name,
        token,
        invitedBy,
        role
      })
      console.log(`✅ Invitation email sent to ${email}`)
    } catch (emailError) {
      console.warn(`⚠️ Failed to send email to ${email}:`, emailError)
      // Continue anyway - the invitation is saved in the database
    }

    // Get the created invitation with server timestamps resolved
    const createdDoc = await docRef.get()
    const createdData = createdDoc.data()

    const invitation: UserInvitation = {
      id: createdDoc.id,
      email: createdData?.email || '',
      name: createdData?.name || '',
      role: createdData?.role || 'viewer',
      status: createdData?.status || 'pending',
      token: createdData?.token || '',
      invitedBy: createdData?.invitedBy || '',
      invitedAt: createdData?.invitedAt?.toDate() || new Date(),
      expiresAt: createdData?.expiresAt?.toDate() || new Date(),
      metadata: createdData?.metadata || {}
    }

    return NextResponse.json(
      {
        success: true,
        invitation,
        message: 'Invitation created and sent successfully'
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Error creating invitation:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create invitation',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}