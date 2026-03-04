import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// POST /api/invitations/verify - Verify an invitation token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token não fornecido' },
        { status: 400 }
      )
    }

    // Query Firestore via Admin SDK (bypasses security rules)
    const snapshot = await adminDb
      .collection('invitations')
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { valid: false, error: 'Convite não encontrado ou já utilizado' },
        { status: 404 }
      )
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Check if invitation has expired
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Este convite expirou' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        token: data.token,
        invitedBy: data.invitedBy,
        expiresAt: expiresAt.toISOString(),
        metadata: data.metadata || {}
      }
    })
  } catch (error) {
    console.error('Error verifying invitation token:', error)
    return NextResponse.json(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
