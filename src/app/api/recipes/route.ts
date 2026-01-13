import { NextRequest, NextResponse } from 'next/server';
import {
  fetchRecipes,
  createRecipe
} from '@/lib/recipes';
import { CreateRecipeData, RecipeFilters } from '@/types/recipe';

// GET /api/recipes - List recipes with optional filters
export async function GET(request: NextRequest) {
  try {
    console.log('📡 API: GET /api/recipes');
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for filtering
    const filters: RecipeFilters = {};
    
    const category = searchParams.get('category');
    if (category) {
      filters.category = category as any;
    }
    
    const difficulty = searchParams.get('difficulty');
    if (difficulty) {
      filters.difficulty = difficulty as any;
    }
    
    const maxCostPerServing = searchParams.get('maxCostPerServing');
    if (maxCostPerServing) {
      filters.maxCostPerServing = parseFloat(maxCostPerServing);
    }
    
    const maxPreparationTime = searchParams.get('maxPreparationTime');
    if (maxPreparationTime) {
      filters.maxPreparationTime = parseInt(maxPreparationTime);
    }
    
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }
    
    const ingredientId = searchParams.get('ingredientId');
    if (ingredientId) {
      filters.ingredientId = ingredientId;
    }
    
    // Fetch recipes
    const result = await fetchRecipes(filters);
    
    console.log(`✅ API: Retrieved ${result.recipes.length} recipes`);
    
    return NextResponse.json({
      success: true,
      recipes: result.recipes,
      count: result.recipes.length,
      total: result.total || result.recipes.length
    });
  } catch (error) {
    console.error('❌ API Error fetching recipes:', error);
    
    // Return empty result instead of error to avoid blocking frontend
    return NextResponse.json({
      success: true,
      recipes: [],
      count: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}

// POST /api/recipes - Create new recipe
export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: POST /api/recipes');
    
    const body = await request.json();
    console.log('📦 Recipe data received:', body);
    
    // Validate required fields
    if (!body.name || !body.category || !body.difficulty) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: name, category, difficulty'
      }, { status: 400 });
    }
    
    // Create recipe data
    const recipeData: CreateRecipeData = {
      name: body.name,
      description: body.description || '',
      category: body.category,
      difficulty: body.difficulty,
      generatedAmount: body.generatedAmount || 1,
      generatedUnit: body.generatedUnit || 'g',
      servings: body.servings || 1,
      recipeItems: body.recipeItems || [],
      instructions: body.instructions || [],
      notes: body.notes || ''
    };
    
    // Create recipe
    const newRecipe = await createRecipe(recipeData);
    
    console.log(`✅ API: Recipe created: ${newRecipe.name} (${newRecipe.id})`);
    
    return NextResponse.json({
      success: true,
      recipe: newRecipe
    }, { status: 201 });
  } catch (error) {
    console.error('❌ API Error creating recipe:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar receita'
    }, { status: 500 });
  }
}