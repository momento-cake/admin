import { NextRequest, NextResponse } from 'next/server'
import { fetchFolder, fetchFolderWithImages, updateFolder, deleteFolder } from '@/lib/folders'
import { updateFolderSchema } from '@/lib/validators/folder'

// GET /api/folders/[id] - Get single folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`🔍 GET /api/folders/${id} - Fetching folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    // Check if user wants images included
    const searchParams = request.nextUrl.searchParams
    const includeImages = searchParams.get('includeImages') === 'true'

    const folder = includeImages
      ? await fetchFolderWithImages(id)
      : await fetchFolder(id)

    console.log(`✅ Successfully fetched folder: ${folder.name} (${folder.id})`)

    return NextResponse.json({
      success: true,
      data: folder
    })
  } catch (error) {
    console.error(`❌ Error fetching folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar pasta'
      },
      { status: 500 }
    )
  }
}

// PUT /api/folders/[id] - Update folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`🔄 PUT /api/folders/${id} - Updating folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('Update request body:', body)

    // Validate the folder data
    const validationResult = updateFolderSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    const folder = await updateFolder(id, updateData)

    console.log(`✅ Successfully updated folder: ${folder.name} (${folder.id})`)

    return NextResponse.json({
      success: true,
      data: folder,
      message: 'Pasta atualizada com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error updating folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar pasta'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[id] - Soft delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`🗑️ DELETE /api/folders/${id} - Deleting folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    await deleteFolder(id)

    console.log(`✅ Successfully deleted folder: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Pasta removida com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error deleting folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar pasta'
      },
      { status: 500 }
    )
  }
}
