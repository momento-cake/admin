import { NextRequest, NextResponse } from 'next/server'
import { restoreClient } from '@/lib/clients'
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth'

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
      return forbiddenResponse('Sem permissão para restaurar clientes')
    }

    console.log(`♻️ POST /api/clients/${id}/restore - Restoring client`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const client = await restoreClient(id)

    console.log(`✅ Successfully restored client: ${client.id}`)

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Cliente restaurado com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error restoring client ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao restaurar cliente'
      },
      { status: 500 }
    )
  }
}
