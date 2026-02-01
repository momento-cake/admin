import { NextRequest, NextResponse } from 'next/server'
import { addImagesToFolder, removeImagesFromFolder } from '@/lib/folders'
import { folderImagesSchema } from '@/lib/validators/folder'

// POST /api/folders/[id]/images - Add images to folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`➕ POST /api/folders/${id}/images - Adding images to folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate the request body
    const validationResult = folderImagesSchema.safeParse(body)
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

    const { imageIds } = validationResult.data

    const folder = await addImagesToFolder(id, imageIds)

    console.log(`✅ Successfully added ${imageIds.length} images to folder: ${folder.name}`)

    return NextResponse.json({
      success: true,
      data: folder,
      message: `${imageIds.length} imagem(ns) adicionada(s) com sucesso`
    })
  } catch (error) {
    console.error(`❌ Error adding images to folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao adicionar imagens'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[id]/images - Remove images from folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    console.log(`➖ DELETE /api/folders/${id}/images - Removing images from folder`)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da pasta é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate the request body
    const validationResult = folderImagesSchema.safeParse(body)
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

    const { imageIds } = validationResult.data

    const folder = await removeImagesFromFolder(id, imageIds)

    console.log(`✅ Successfully removed ${imageIds.length} images from folder: ${folder.name}`)

    return NextResponse.json({
      success: true,
      data: folder,
      message: `${imageIds.length} imagem(ns) removida(s) com sucesso`
    })
  } catch (error) {
    console.error(`❌ Error removing images from folder ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrad')) {
      return NextResponse.json(
        { success: false, error: 'Pasta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao remover imagens'
      },
      { status: 500 }
    )
  }
}
