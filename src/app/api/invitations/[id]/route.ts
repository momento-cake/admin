import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/invitations/[id] - Get specific invitation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const docRef = doc(db, 'invitations', id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }
    
    const data = docSnap.data()
    const invitation = {
      id: docSnap.id,
      ...data,
      invitedAt: data.invitedAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      acceptedAt: data.acceptedAt?.toDate(),
      cancelledAt: data.cancelledAt?.toDate(),
    }
    
    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

// PATCH /api/invitations/[id] - Update invitation status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'accepted', 'expired', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const docRef = doc(db, 'invitations', id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const updateData: { status: string; acceptedAt?: unknown; cancelledAt?: unknown } = { status }

    if (status === 'accepted') {
      updateData.acceptedAt = serverTimestamp()
    } else if (status === 'cancelled') {
      updateData.cancelledAt = serverTimestamp()
    }

    await updateDoc(docRef, updateData)

    return NextResponse.json({
      success: true,
      message: `Invitation ${status} successfully`
    })
  } catch (error) {
    console.error('Error updating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to update invitation' },
      { status: 500 }
    )
  }
}