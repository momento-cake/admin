import { NextRequest, NextResponse } from 'next/server';
import {
  fetchRecipe,
  updateRecipe,
  deleteRecipe
} from '@/lib/recipes';
import { UpdateRecipeData } from '@/types/recipe';

// GET /api/recipes/[id] - Get single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    console.log(`📡 API: GET /api/recipes/${id}`);

    const recipe = await fetchRecipe(id);

    console.log(`✅ API: Retrieved recipe: ${recipe.name}`);

    return NextResponse.json({
      success: true,
      recipe
    });
  } catch (error) {
    console.error(`❌ API Error fetching recipe ${id}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Receita não encontrada'
    }, { status: 404 });
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    console.log(`📡 API: PUT /api/recipes/${id}`);

    const body = await request.json();
    // Request body log removed to avoid logging potentially sensitive data

    // Create update data
    const updateData: UpdateRecipeData = {
      id,
      ...body
    };

    // Update recipe
    const updatedRecipe = await updateRecipe(updateData);

    console.log(`✅ API: Recipe updated: ${updatedRecipe.name}`);

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe
    });
  } catch (error) {
    console.error(`❌ API Error updating recipe ${id}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar receita'
    }, { status: 500 });
  }
}

// DELETE /api/recipes/[id] - Delete recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    console.log(`📡 API: DELETE /api/recipes/${id}`);

    // Soft delete the recipe
    await deleteRecipe(id);

    console.log(`✅ API: Recipe deleted: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Receita removida com sucesso'
    });
  } catch (error) {
    console.error(`❌ API Error deleting recipe ${id}:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao remover receita'
    }, { status: 500 });
  }
}
