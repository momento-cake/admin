import { NextRequest, NextResponse } from 'next/server'
import { fetchIngredient, updateIngredient, deleteIngredient } from '@/lib/ingredients'
import { UpdateIngredientData } from '@/types/ingredient'
import { updateIngredientValidation } from '@/lib/validators/ingredient'

// GET /api/ingredients/[id] - Get single ingredient
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`🔍 GET /api/ingredients/${id} - Fetching ingredient`)

    if (!id) {
      return NextResponse.json(
        { error: 'ID do ingrediente é obrigatório' },
        { status: 400 }
      )
    }

    const ingredient = await fetchIngredient(id)

    console.log(`✅ Successfully fetched ingredient: ${ingredient.name} (${ingredient.id})`)

    return NextResponse.json({ 
      ingredient,
      success: true
    })
  } catch (error) {
    console.error(`❌ Error fetching ingredient ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}

// PUT /api/ingredients/[id] - Update ingredient
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`🔄 PUT /api/ingredients/${id} - Updating ingredient`)

    if (!id) {
      return NextResponse.json(
        { error: 'ID do ingrediente é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('Update request body:', body)

    // Add the ID to the body for validation
    const dataWithId = { ...body, id }

    // Validate the ingredient data
    const validationResult = updateIngredientValidation.safeParse(dataWithId)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validationResult.error.issues.map((err) => ({
            field: String(err.path.join('.')),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const updateData: UpdateIngredientData = validationResult.data

    const ingredient = await updateIngredient(updateData)

    console.log(`✅ Successfully updated ingredient: ${ingredient.name} (${ingredient.id})`)

    return NextResponse.json({ 
      ingredient,
      success: true,
      message: 'Ingrediente atualizado com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error updating ingredient ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ingredients/[id] - Delete ingredient
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log(`🗑️ DELETE /api/ingredients/${id} - Deleting ingredient`)

    if (!id) {
      return NextResponse.json(
        { error: 'ID do ingrediente é obrigatório' },
        { status: 400 }
      )
    }

    await deleteIngredient(id)

    console.log(`✅ Successfully deleted ingredient: ${id}`)

    return NextResponse.json({ 
      success: true,
      message: 'Ingrediente removido com sucesso'
    })
  } catch (error) {
    console.error(`❌ Error deleting ingredient ${id}:`, error)

    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json(
        { error: 'Ingrediente não encontrado', success: false },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}