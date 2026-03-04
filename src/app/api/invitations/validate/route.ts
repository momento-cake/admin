import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

// POST /api/invitations/validate - Validate invitation by email (first access flow)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { valid: false, error: 'Email não fornecido' },
        { status: 400 }
      )
    }

    // Query Firestore via Admin SDK (bypasses security rules)
    const snapshot = await adminDb
      .collection('invitations')
      .where('email', '==', email.toLowerCase())
      .where('status', '==', 'pending')
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { valid: false, error: 'Nenhum convite pendente encontrado para este email' },
        { status: 404 }
      )
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    // Check if invitation has expired
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Este convite expirou. Solicite um novo convite ao administrador.' },
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
        department: data.metadata?.department,
        invitedBy: data.invitedBy,
        expiresAt: expiresAt.toISOString(),
      }
    })
  } catch (error) {
    console.error('Error validating invitation by email:', error)
    return NextResponse.json(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
