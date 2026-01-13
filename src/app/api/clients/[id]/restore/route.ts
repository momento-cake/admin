import { NextRequest, NextResponse } from 'next/server'
import { restoreClient } from '@/lib/clients'

// POST /api/clients/[id]/restore - Restore soft-deleted client
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`♻️ POST /api/clients/${id}/restore - Restoring client`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do cliente é obrigatório' },
        { status: 400 }
      )
    }

    const client = await restoreClient(id)

    console.log(`✅ Successfully restored client: ${client.name} (${client.id})`)

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
