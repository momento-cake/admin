import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { UserInvitation, UserRole } from '@/types'
import { generateInvitationToken, sendInvitationEmail } from '@/lib/invitations'

// GET /api/invitations - List all invitations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    let q = query(
      collection(db, 'invitations'),
      orderBy('invitedAt', 'desc')
    )
    
    if (status) {
      q = query(
        collection(db, 'invitations'),
        where('status', '==', status),
        orderBy('invitedAt', 'desc')
      )
    }
    
    const querySnapshot = await getDocs(q)
    const invitations: UserInvitation[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      invitations.push({
        id: doc.id,
        ...data,
        invitedAt: data.invitedAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate(),
      } as UserInvitation)
    })
    
    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role, invitedBy, department, notes }: {
      email: string
      name: string
      role: UserRole
      invitedBy: string
      department?: string
      notes?: string
    } = body

    // Validate required fields
    if (!email || !name || !role || !invitedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role, invitedBy' },
        { status: 400 }
      )
    }

    // Check if user is already invited or exists
    const existingInvitation = query(
      collection(db, 'invitations'),
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    )
    
    const existingSnapshot = await getDocs(existingInvitation)
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate invitation token and expiry
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

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
      metadata: {
        department,
        notes,
      }
    }

    const docRef = await addDoc(collection(db, 'invitations'), invitationData)

    // Send invitation email
    await sendInvitationEmail({
      email,
      name,
      token,
      invitedBy,
      role,
    })

    return NextResponse.json({
      success: true,
      invitationId: docRef.id,
      message: 'Invitation sent successfully'
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}