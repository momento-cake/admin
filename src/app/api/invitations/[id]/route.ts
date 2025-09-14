import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'

// PATCH /api/invitations/[id] - Update invitation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['cancelled', 'accepted', 'expired']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: cancelled, accepted, expired' },
        { status: 400 }
      )
    }

    // Get the invitation document
    const invitationRef = doc(db, 'invitations', id)
    const invitationSnap = await getDoc(invitationRef)

    if (!invitationSnap.exists()) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invitationData = invitationSnap.data()

    // Check if invitation is already processed
    if (invitationData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been processed' },
        { status: 409 }
      )
    }

    // Update the invitation with new status and timestamp
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    }

    // Add status-specific timestamp
    switch (status) {
      case 'cancelled':
        updateData.cancelledAt = serverTimestamp()
        break
      case 'accepted':
        updateData.acceptedAt = serverTimestamp()
        break
      case 'expired':
        updateData.expiredAt = serverTimestamp()
        break
    }

    await updateDoc(invitationRef, updateData)

    return NextResponse.json({ 
      message: `Invitation ${status} successfully`,
      id,
      status
    })
  } catch (error) {
    // Always log the full error details for debugging
    console.error('=== INVITATION UPDATE ERROR ===')
    console.error('Error updating invitation:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      endpoint: `PATCH /api/invitations/${id}`,
      invitationId: id,
      requestedStatus: status
    })
    console.error('Full error object:', error)
    console.error('===============================')
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/invitations/[id] - Get specific invitation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const invitationRef = doc(db, 'invitations', id)
    const invitationSnap = await getDoc(invitationRef)

    if (!invitationSnap.exists()) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const data = invitationSnap.data()
    const invitation = {
      id: invitationSnap.id,
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
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    // Always log the full error details for debugging
    console.error('=== INVITATION FETCH ERROR ===')
    console.error('Error fetching invitation:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      endpoint: `GET /api/invitations/${id}`,
      invitationId: id
    })
    console.error('Full error object:', error)
    console.error('===============================')
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/invitations/[id] - Delete invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const invitationRef = doc(db, 'invitations', id)
    const invitationSnap = await getDoc(invitationRef)

    if (!invitationSnap.exists()) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Instead of deleting, mark as cancelled
    await updateDoc(invitationRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return NextResponse.json({ 
      message: 'Invitation cancelled successfully',
      id
    })
  } catch (error) {
    // Always log the full error details for debugging
    console.error('=== INVITATION DELETE ERROR ===')
    console.error('Error cancelling invitation:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      endpoint: `DELETE /api/invitations/${id}`,
      invitationId: id
    })
    console.error('Full error object:', error)
    console.error('===============================')
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}