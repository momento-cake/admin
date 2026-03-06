import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

const CLIENTS_COLLECTION = 'clients'

// POST /api/clients/[id]/restore - Restore soft-deleted client (admin only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return unauthorizedResponse()
    }

    // Intentional design: restore reuses the 'delete' permission rather than
    // introducing a separate 'restore' action. Rationale:
    // 1. Symmetry: only users who can soft-delete a client should be able to undo that action
    // 2. Simplicity: avoids adding a new action type to the permission system
    // 3. Security: effectively restricts restore to admins, matching delete behavior
    if (!canPerformActionFromRequest(auth, 'clients', 'delete')) {
      return forbiddenResponse('Sem permissao para restaurar clientes')
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente e obrigatorio' },
        { status: 400 }
      )
    }

    const docSnapshot = await adminDb.collection(CLIENTS_COLLECTION).doc(id).get()

    if (!docSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Cliente nao encontrado' },
        { status: 404 }
      )
    }

    // Restore - mark as active
    await adminDb.collection(CLIENTS_COLLECTION).doc(id).update({
      isActive: true,
      updatedAt: FieldValue.serverTimestamp()
    })

    // Return restored client data
    const restoredDoc = await adminDb.collection(CLIENTS_COLLECTION).doc(id).get()
    const restoredClient = {
      id: restoredDoc.id,
      ...restoredDoc.data()
    }

    return NextResponse.json({
      success: true,
      data: restoredClient,
      message: 'Cliente restaurado com sucesso'
    })
  } catch (error) {
    console.error(`Error restoring client ${id}:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao restaurar cliente'
      },
      { status: 500 }
    )
  }
}
