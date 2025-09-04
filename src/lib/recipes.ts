import { Recipe, Ingredient } from '@/types/ingredient';

export async function fetchRecipes(): Promise<{ recipes: Recipe[] }> {
  const response = await fetch('/api/recipes');
  
  if (!response.ok) {
    throw new Error('Failed to fetch recipes');
  }

  const data = await response.json();
  return {
    recipes: data.recipes.map((recipe: { createdAt: string; lastCalculated?: string; [key: string]: unknown }) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
      lastCalculated: recipe.lastCalculated ? new Date(recipe.lastCalculated) : null,
    })),
  };
}

export async function fetchRecipe(id: string): Promise<{ recipe: Recipe }> {
  const response = await fetch(`/api/recipes/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch recipe');
  }

  const data = await response.json();
  return {
    recipe: {
      ...data.recipe,
      createdAt: new Date(data.recipe.createdAt),
      lastCalculated: data.recipe.lastCalculated ? new Date(data.recipe.lastCalculated) : null,
    },
  };
}

export async function createRecipe(recipeData: Omit<Recipe, 'id' | 'createdAt' | 'totalCost' | 'costPerServing' | 'lastCalculated'>): Promise<Recipe> {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  });

  if (!response.ok) {
    throw new Error('Failed to create recipe');
  }

  const data = await response.json();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    lastCalculated: data.lastCalculated ? new Date(data.lastCalculated) : null,
  };
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Failed to update recipe');
  }

  const data = await response.json();
  return {
    ...data.recipe,
    createdAt: new Date(data.recipe.createdAt),
    lastCalculated: data.recipe.lastCalculated ? new Date(data.recipe.lastCalculated) : null,
  };
}

export async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete recipe');
  }
}

export async function calculateRecipeCost(recipe: Recipe, ingredients: Ingredient[]): Promise<{
  totalCost: number;
  costPerServing: number;
  ingredientCosts: Array<{ ingredientId: string; name: string; cost: number; quantity: number; unit: string }>;
}> {
  let totalCost = 0;
  const ingredientCosts = [];

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = ingredients.find(ing => ing.id === recipeIngredient.ingredientId);
    if (!ingredient) {
      console.warn(`Ingredient not found: ${recipeIngredient.ingredientId}`);
      continue;
    }

    // Convert recipe ingredient quantity to ingredient base unit if needed
    let costForQuantity = 0;
    
    if (recipeIngredient.unit === ingredient.unit) {
      // Same unit, direct calculation
      costForQuantity = (recipeIngredient.quantity * ingredient.currentPrice);
    } else {
      // Unit conversion needed (simplified for now)
      // In a real implementation, you'd use the unit converter
      const conversionFactor = getUnitConversionFactor(recipeIngredient.unit, ingredient.unit);
      const convertedQuantity = recipeIngredient.quantity * conversionFactor;
      costForQuantity = convertedQuantity * ingredient.currentPrice;
    }

    totalCost += costForQuantity;
    ingredientCosts.push({
      ingredientId: ingredient.id,
      name: ingredient.name,
      cost: costForQuantity,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
    });
  }

  const costPerServing = totalCost / recipe.servings;

  return { totalCost, costPerServing, ingredientCosts };
}

export async function updateRecipeCosts(recipeId: string): Promise<Recipe> {
  // Get recipe
  const { recipe } = await fetchRecipe(recipeId);
  
  // Get ingredients
  const ingredientsResponse = await fetch('/api/ingredients');
  const { ingredients } = await ingredientsResponse.json();
  
  // Calculate costs
  const { totalCost, costPerServing } = await calculateRecipeCost(recipe, ingredients);
  
  // Update recipe with calculated costs
  return await updateRecipe(recipeId, {
    totalCost,
    costPerServing,
    lastCalculated: new Date(),
  });
}

export function findRecipesByIngredient(recipes: Recipe[], ingredientId: string): Recipe[] {
  return recipes.filter(recipe => 
    recipe.ingredients.some(ing => ing.ingredientId === ingredientId)
  );
}

export function getIngredientUsageInRecipes(recipes: Recipe[], ingredientId: string): {
  totalRecipes: number;
  totalQuantityUsed: number;
  averageQuantityPerRecipe: number;
  recipes: Array<{ id: string; name: string; quantity: number; unit: string }>;
} {
  const recipesUsingIngredient = findRecipesByIngredient(recipes, ingredientId);
  
  let totalQuantityUsed = 0;
  const recipeDetails = [];
  
  for (const recipe of recipesUsingIngredient) {
    const ingredient = recipe.ingredients.find(ing => ing.ingredientId === ingredientId);
    if (ingredient) {
      totalQuantityUsed += ingredient.quantity;
      recipeDetails.push({
        id: recipe.id,
        name: recipe.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      });
    }
  }
  
  const averageQuantityPerRecipe = recipesUsingIngredient.length > 0 ? 
    totalQuantityUsed / recipesUsingIngredient.length : 0;
  
  return {
    totalRecipes: recipesUsingIngredient.length,
    totalQuantityUsed,
    averageQuantityPerRecipe,
    recipes: recipeDetails,
  };
}

// Simplified unit conversion - in reality, this would be more comprehensive
function getUnitConversionFactor(fromUnit: string, toUnit: string): number {
  // This is a simplified conversion table
  const conversions: { [key: string]: { [key: string]: number } } = {
    gram: { kilogram: 0.001, gram: 1 },
    kilogram: { gram: 1000, kilogram: 1 },
    milliliter: { liter: 0.001, milliliter: 1 },
    liter: { milliliter: 1000, liter: 1 },
    // Add more conversions as needed
  };
  
  return conversions[fromUnit]?.[toUnit] || 1;
}

export async function scaleRecipe(recipe: Recipe, scaleFactor: number): Promise<Recipe> {
  const scaledIngredients = recipe.ingredients.map(ingredient => ({
    ...ingredient,
    quantity: ingredient.quantity * scaleFactor,
  }));
  
  return {
    ...recipe,
    ingredients: scaledIngredients,
    servings: Math.round(recipe.servings * scaleFactor),
    totalCost: recipe.totalCost ? recipe.totalCost * scaleFactor : undefined,
    costPerServing: recipe.costPerServing, // Cost per serving remains the same
  };
}