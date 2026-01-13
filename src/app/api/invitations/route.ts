import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { generateInvitationToken, sendInvitationEmail } from '@/lib/invitations'
import { UserInvitation, UserRole } from '@/types'

// GET /api/invitations - Get all invitations
export async function GET() {
  try {
    const invitationsRef = collection(db, 'invitations')
    const q = query(
      invitationsRef,
      orderBy('invitedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const invitations: UserInvitation[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      invitations.push({
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
        metadata: data.metadata
      })
    })

    return NextResponse.json({
      invitations,
      count: invitations.length
    })
  } catch (error) {
    // Always log the full error details for debugging
    console.error('=== INVITATIONS API ERROR ===')
    console.error('Error fetching invitations:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: 'GET /api/invitations'
    })
    console.error('Full error object:', error)
    console.error('============================')

    // Return empty array if it's a permissions error or collection doesn't exist yet
    // but still log the error above for monitoring
    const errorCode = (error as { code?: string })?.code
    if (errorCode === 'permission-denied' || errorCode === 'not-found') {
      console.warn(`Returning empty invitations array due to: ${errorCode}`)
      return NextResponse.json({
        invitations: [],
        count: 0
      })
    }

    // For other errors, return 500 but ensure they're properly logged
    console.error('Returning 500 error to client for unhandled error type')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  let body = null
  let email = null
  let name = null
  let role = null
  let invitedBy = null
  let metadata = null

  try {
    body = await request.json()
    const extractedData = body
    email = extractedData.email
    name = extractedData.name
    role = extractedData.role
    invitedBy = extractedData.invitedBy
    metadata = extractedData.metadata

    // Basic validation
    if (!email || !name || !role || !invitedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role, invitedBy' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'atendente']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or atendente' },
        { status: 400 }
      )
    }

    // Check if invitation already exists for this email
    const existingInvitationsRef = collection(db, 'invitations')
    const existingQuery = query(
      existingInvitationsRef,
      where('email', '==', email),
      where('status', 'in', ['pending'])
    )

    const existingSnapshot = await getDocs(existingQuery)
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate invitation token and expiration
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation document
    const invitationData = {
      email: email.toLowerCase(),
      name,
      role,
      status: 'pending' as const,
      token,
      invitedBy,
      invitedAt: serverTimestamp(),
      expiresAt,
      metadata: metadata || {}
    }

    const invitationsRef = collection(db, 'invitations')
    const docRef = await addDoc(invitationsRef, invitationData)

    // Send invitation email
    try {
      await sendInvitationEmail({
        email: email.toLowerCase(),
        name,
        token,
        invitedBy,
        role
      })
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Continue - invitation was created but email failed
    }

    // Return the created invitation
    const newInvitation: UserInvitation = {
      id: docRef.id,
      email: email.toLowerCase(),
      name,
      role,
      status: 'pending',
      token,
      invitedBy,
      invitedAt: new Date(),
      expiresAt,
      metadata: metadata || {}
    }

    return NextResponse.json(
      {
        invitation: newInvitation,
        message: 'Invitation created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    // Always log the full error details for debugging
    console.error('=== INVITATIONS CREATE ERROR ===')
    console.error('Error creating invitation:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      endpoint: 'POST /api/invitations',
      requestData: { body, email, name, role, invitedBy }
    })
    console.error('Full error object:', error)
    console.error('=================================')

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
