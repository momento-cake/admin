import { NextRequest, NextResponse } from 'next/server'
import { fetchIngredients, createIngredient, deleteIngredient } from '@/lib/ingredients'
import { IngredientFilters, CreateIngredientData } from '@/types/ingredient'
import { ingredientValidation } from '@/lib/validators/ingredient'

// GET /api/ingredients - Get all ingredients
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/ingredients - Fetching ingredients')
    
    const searchParams = request.nextUrl.searchParams
    const filters: IngredientFilters = {
      category: searchParams.get('category') as any,
      supplierId: searchParams.get('supplierId') || undefined,
      stockStatus: searchParams.get('stockStatus') as any,
      searchQuery: searchParams.get('searchQuery') || undefined
    }

    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof IngredientFilters] === null) {
        delete filters[key as keyof IngredientFilters]
      }
    })

    const ingredients = await fetchIngredients(filters)

    console.log(`✅ Successfully fetched ${ingredients.length} ingredients`)
    
    return NextResponse.json({ 
      ingredients,
      count: ingredients.length,
      success: true
    })
  } catch (error) {
    console.error('❌ Error fetching ingredients:', error)
    
    // Return empty array for graceful degradation
    return NextResponse.json({ 
      ingredients: [],
      count: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }) // Return 200 to avoid breaking the UI
  }
}

// POST /api/ingredients - Create new ingredient
export async function POST(request: NextRequest) {
  try {
    console.log('➕ POST /api/ingredients - Creating ingredient')
    
    const body = await request.json()
    console.log('Request body:', body)

    // Validate the ingredient data
    const validationResult = ingredientValidation.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error)
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const ingredientData: CreateIngredientData = validationResult.data

    const ingredient = await createIngredient(ingredientData)

    console.log(`✅ Successfully created ingredient: ${ingredient.name} (${ingredient.id})`)

    return NextResponse.json(
      { 
        ingredient,
        success: true,
        message: 'Ingrediente criado com sucesso'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error creating ingredient:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ingredients - Bulk delete ingredients (optional)
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE /api/ingredients - Bulk delete ingredients')
    
    const body = await request.json()
    const { ingredientIds } = body

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs dos ingredientes são obrigatórios' },
        { status: 400 }
      )
    }

    console.log(`Deleting ${ingredientIds.length} ingredients:`, ingredientIds)

    // Delete each ingredient
    const deletePromises = ingredientIds.map((id: string) => deleteIngredient(id))
    await Promise.all(deletePromises)

    console.log(`✅ Successfully deleted ${ingredientIds.length} ingredients`)

    return NextResponse.json({ 
      success: true,
      message: `${ingredientIds.length} ingrediente(s) removido(s) com sucesso`,
      deletedCount: ingredientIds.length
    })
  } catch (error) {
    console.error('❌ Error deleting ingredients:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}