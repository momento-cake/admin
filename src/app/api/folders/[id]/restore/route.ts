import { NextRequest, NextResponse } from 'next/server'
import { restoreFolder } from '@/lib/folders'

// POST /api/folders/[id]/restore - Restore soft-deleted folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`♻️ POST /api/folders/${id}/restore - Restoring folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    const folder = await restoreFolder(id)

    console.log(`✅ Successfully restored folder: ${folder.name} (${folder.id})`)

    return NextResponse.json({
      success: true,
      data: folder,
      message: 'Pasta restaurada com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error restoring folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao restaurar pasta'
      },
      { status: 500 }
    )
  }
}
