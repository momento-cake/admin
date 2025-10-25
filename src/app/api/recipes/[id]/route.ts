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
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📡 API: GET /api/recipes/${params.id}`);
    
    const recipe = await fetchRecipe(params.id);
    
    console.log(`✅ API: Retrieved recipe: ${recipe.name}`);
    
    return NextResponse.json({
      success: true,
      recipe
    });
  } catch (error) {
    console.error(`❌ API Error fetching recipe ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Receita não encontrada'
    }, { status: 404 });
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📡 API: PUT /api/recipes/${params.id}`);
    
    const body = await request.json();
    console.log('📦 Recipe update data received:', body);
    
    // Create update data
    const updateData: UpdateRecipeData = {
      id: params.id,
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
    console.error(`❌ API Error updating recipe ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar receita'
    }, { status: 500 });
  }
}

// DELETE /api/recipes/[id] - Delete recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📡 API: DELETE /api/recipes/${params.id}`);
    
    // Soft delete the recipe
    await deleteRecipe(params.id);
    
    console.log(`✅ API: Recipe deleted: ${params.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Receita removida com sucesso'
    });
  } catch (error) {
    console.error(`❌ API Error deleting recipe ${params.id}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao remover receita'
    }, { status: 500 });
  }
}