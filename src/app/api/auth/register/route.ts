import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { validateRegistrationData } from '@/lib/invitations'

// POST /api/auth/register - Register a new user from an invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invitationToken, firstName, lastName, email, password, phone, department, acceptsTerms } = body

    // Validate required fields
    const validation = validateRegistrationData({ firstName, lastName, email, password, acceptsTerms })
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    if (!invitationToken) {
      return NextResponse.json(
        { success: false, error: 'Token de convite não fornecido' },
        { status: 400 }
      )
    }

    // Find the invitation by token via Admin SDK
    const snapshot = await adminDb
      .collection('invitations')
      .where('token', '==', invitationToken)
      .where('status', '==', 'pending')
      .get()

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Convite inválido ou já utilizado' },
        { status: 404 }
      )
    }

    const invitationDoc = snapshot.docs[0]
    const invitationData = invitationDoc.data()

    // Check if invitation has expired
    const expiresAt = invitationData.expiresAt?.toDate ? invitationData.expiresAt.toDate() : new Date(invitationData.expiresAt)
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Este convite expirou' },
        { status: 410 }
      )
    }

    // Verify email matches invitation
    if (email.toLowerCase() !== invitationData.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'O email não corresponde ao convite' },
        { status: 400 }
      )
    }

    // Create Firebase Auth user via Admin SDK
    const displayName = `${firstName} ${lastName}`
    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email: email.toLowerCase(),
        password,
        displayName,
        emailVerified: true, // Verified through invitation flow
      })
    } catch (authError: unknown) {
      const code = (authError as { code?: string })?.code
      if (code === 'auth/email-already-exists') {
        return NextResponse.json(
          { success: false, error: 'Este email já está cadastrado. Tente fazer login.' },
          { status: 409 }
        )
      }
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { success: false, error: 'Erro ao criar conta de autenticação' },
        { status: 500 }
      )
    }

    // Create user document in Firestore via Admin SDK
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: email.toLowerCase(),
      displayName,
      emailVerified: true,
      role: { type: invitationData.role || 'atendente' },
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      lastSignInAt: FieldValue.serverTimestamp(),
      metadata: {
        firstName,
        lastName,
        phone: phone || null,
        department: department || invitationData.metadata?.department || null,
        registeredFrom: 'invitation',
        invitationId: invitationDoc.id,
      }
    })

    // Update invitation status to accepted via Admin SDK
    await adminDb.collection('invitations').doc(invitationDoc.id).update({
      status: 'accepted',
      acceptedAt: FieldValue.serverTimestamp(),
      acceptedByUid: userRecord.uid,
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('=== REGISTRATION ERROR ===')
    console.error('Error during registration:', error)
    console.error('==========================')

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
