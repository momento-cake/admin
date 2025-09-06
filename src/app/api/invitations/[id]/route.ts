import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { UserInvitation } from '@/types'
import { FieldValue } from 'firebase-admin/firestore'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status values
    if (!['pending', 'accepted', 'expired', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get reference to the invitation document using Firebase Admin SDK
    const invitationRef = adminDb.collection('invitations').doc(id)
    
    // Check if invitation exists
    const invitationDoc = await invitationRef.get()
    
    if (!invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp()
    }

    // Add timestamp for specific status changes
    if (status === 'accepted') {
      updateData.acceptedAt = FieldValue.serverTimestamp()
    } else if (status === 'cancelled') {
      updateData.cancelledAt = FieldValue.serverTimestamp()
    }

    // Update the invitation
    await invitationRef.update(updateData)

    // Get updated invitation data
    const updatedDoc = await invitationRef.get()
    const updatedData = updatedDoc.data()

    if (!updatedData) {
      throw new Error('Failed to retrieve updated invitation')
    }

    // Convert to UserInvitation format
    const updatedInvitation: UserInvitation = {
      id: updatedDoc.id,
      email: updatedData.email,
      name: updatedData.name,
      role: updatedData.role,
      status: updatedData.status,
      token: updatedData.token,
      invitedBy: updatedData.invitedBy,
      invitedAt: updatedData.invitedAt?.toDate() || new Date(),
      expiresAt: updatedData.expiresAt?.toDate() || new Date(),
      acceptedAt: updatedData.acceptedAt?.toDate(),
      cancelledAt: updatedData.cancelledAt?.toDate(),
      metadata: updatedData.metadata || {}
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
      message: `Invitation ${status} successfully`
    })
    
  } catch (error) {
    console.error('Error updating invitation:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update invitation',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Get reference to the invitation document using Firebase Admin SDK
    const invitationRef = adminDb.collection('invitations').doc(id)
    const invitationDoc = await invitationRef.get()
    
    if (!invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const data = invitationDoc.data()

    // Convert to UserInvitation format
    const invitation: UserInvitation = {
      id: invitationDoc.id,
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

    return NextResponse.json({
      success: true,
      invitation
    })
    
  } catch (error) {
    console.error('Error fetching invitation:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invitation',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}