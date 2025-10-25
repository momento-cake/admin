import { 
  Recipe, 
  RecipeItem,
  CreateRecipeData, 
  UpdateRecipeData,
  RecipeFilters,
  RecipesResponse,
  CostBreakdown,
  RecipeCategory,
  RecipeDifficulty,
  RecipeSettings,
  CircularDependencyCheckResult
} from '@/types/recipe';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchIngredient } from '@/lib/ingredients';
import { fetchRecipeSettings, getMarginForCategory } from '@/lib/recipeSettings';

const COLLECTION_NAME = 'recipes';

// Helper function to convert Firestore document to Recipe
function docToRecipe(doc: DocumentSnapshot): Recipe {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');
  
  const preparationTime = data.preparationTime || 0;
  const generatedAmount = data.generatedAmount || 1;
  const servings = data.servings || 1;
  const portionSize = generatedAmount / servings;
  
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    category: data.category,
    difficulty: data.difficulty,
    // Generated amounts and servings
    generatedAmount,
    generatedUnit: data.generatedUnit || 'g',
    servings,
    portionSize,
    // Time (from steps or fallback)
    preparationTime,
    // Components (with backward compatibility)
    recipeItems: data.recipeItems || convertLegacyIngredients(data.ingredients || []),
    instructions: data.instructions || [],
    notes: data.notes,
    // Costs
    costPerServing: data.costPerServing || 0,
    totalCost: data.totalCost || 0,
    laborCost: data.laborCost || 0,
    suggestedPrice: data.suggestedPrice || 0,
    // Meta
    isActive: data.isActive !== false,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy || 'unknown'
  };
}

// Helper function to convert legacy ingredients to recipe items (backward compatibility)
function convertLegacyIngredients(ingredients: any[]): RecipeItem[] {
  return ingredients.map((ingredient, index) => ({
    id: ingredient.id || `legacy_${index}`,
    type: 'ingredient' as const,
    ingredientId: ingredient.ingredientId,
    ingredientName: ingredient.ingredientName,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    cost: ingredient.cost || 0,
    notes: ingredient.notes,
    sortOrder: ingredient.sortOrder || index
  }));
}

// Helper function to validate sub-recipe exists and is active
async function validateSubRecipe(subRecipeId: string): Promise<void> {
  try {
    const subRecipeDoc = await getDoc(doc(db, COLLECTION_NAME, subRecipeId));
    
    if (!subRecipeDoc.exists()) {
      throw new Error(`Sub-receita não encontrada: ${subRecipeId}`);
    }
    
    const subRecipeData = subRecipeDoc.data();
    if (!subRecipeData.isActive) {
      throw new Error(`Sub-receita não está ativa: ${subRecipeData.name}`);
    }
  } catch (error) {
    console.error('❌ Error validating sub-recipe:', error);
    throw error instanceof Error ? error : new Error('Erro ao validar sub-receita');
  }
}

// Circular dependency checking function
export async function checkCircularDependency(recipeId: string, subRecipeId: string): Promise<CircularDependencyCheckResult> {
  try {
    console.log(`🔍 Checking circular dependency: ${recipeId} -> ${subRecipeId}`);
    
    const visited = new Set<string>();
    const dependencyPath: string[] = [];
    
    const hasCircularDep = async (currentId: string, targetId: string, path: string[]): Promise<boolean> => {
      // If we reached the target, we found a circle
      if (currentId === targetId) {
        return true;
      }
      
      // If we already visited this node, skip (avoid infinite loops)
      if (visited.has(currentId)) {
        return false;
      }
      
      visited.add(currentId);
      path.push(currentId);
      
      try {
        const recipe = await fetchRecipe(currentId);
        
        // Check all sub-recipes in this recipe
        for (const item of recipe.recipeItems) {
          if (item.type === 'recipe' && item.subRecipeId) {
            if (await hasCircularDep(item.subRecipeId, targetId, [...path])) {
              return true;
            }
          }
        }
      } catch (error) {
        // If we can't fetch the recipe, assume no circular dependency
        console.warn(`Warning: Could not fetch recipe ${currentId} for circular dependency check`);
      }
      
      return false;
    };
    
    const hasCircular = await hasCircularDep(subRecipeId, recipeId, []);
    
    if (hasCircular) {
      const message = `Dependência circular detectada: receita ${recipeId} não pode usar receita ${subRecipeId}`;
      console.warn(`⚠️ ${message}`);
      
      return {
        hasCircularDependency: true,
        dependencyPath,
        message
      };
    }
    
    console.log(`✅ No circular dependency found: ${recipeId} -> ${subRecipeId}`);
    
    return {
      hasCircularDependency: false
    };
  } catch (error) {
    console.error('❌ Error checking circular dependency:', error);
    // In case of error, assume no circular dependency to avoid blocking operations
    return {
      hasCircularDependency: false,
      message: 'Erro ao verificar dependência circular, assumindo que não há'
    };
  }
}

// Firestore functions for recipes
export async function fetchRecipes(filters?: RecipeFilters): Promise<RecipesResponse> {
  try {
    console.log('🔍 Fetching recipes with filters:', filters);

    // Base query - active recipes only
    const recipesQuery = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('name')
    );

    const snapshot = await getDocs(recipesQuery);
    let recipes = snapshot.docs.map(docToRecipe);

    // Apply client-side filtering
    if (filters) {
      recipes = filterRecipes(recipes, filters);
    }

    console.log(`✅ Retrieved ${recipes.length} recipes`);

    return {
      recipes,
      total: recipes.length
    };
  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    throw new Error('Erro ao buscar receitas');
  }
}

export async function fetchRecipe(id: string): Promise<Recipe> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Receita não encontrada');
    }
    
    return docToRecipe(docSnap);
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    throw new Error('Erro ao buscar receita');
  }
}

export async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
  try {
    console.log('➕ Creating new recipe:', data.name);

    // Validate required fields
    if (!data.name) {
      throw new Error('Nome da receita é obrigatório');
    }

    if (!data.category) {
      throw new Error('Categoria é obrigatória');
    }

    if (!data.difficulty) {
      throw new Error('Dificuldade é obrigatória');
    }

    if (!data.generatedAmount || data.generatedAmount <= 0) {
      throw new Error('Quantidade gerada deve ser maior que zero');
    }

    if (!data.servings || data.servings <= 0) {
      throw new Error('Número de porções deve ser maior que zero');
    }

    // Check for circular dependencies in sub-recipes
    if (data.recipeItems) {
      for (const item of data.recipeItems) {
        if (item.type === 'recipe' && item.subRecipeId) {
          // For new recipes, we can't have circular deps since the recipe doesn't exist yet
          // But we should check if the sub-recipe exists and is valid
          await validateSubRecipe(item.subRecipeId);
        }
      }
    }

    // Check if recipe with same name already exists
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('name', '==', data.name),
      where('isActive', '==', true)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Já existe uma receita com esse nome');
    }

    // Calculate preparation time from steps
    const preparationTime = data.instructions.reduce((total, step) => 
      total + (step.timeMinutes || 0), 0
    );

    // Calculate portion size
    const portionSize = data.generatedAmount / data.servings;

    // Create recipe document with initial data
    const initialRecipeData = {
      name: data.name,
      description: data.description || null,
      category: data.category,
      difficulty: data.difficulty,
      // Generated amounts and servings
      generatedAmount: data.generatedAmount,
      generatedUnit: data.generatedUnit,
      servings: data.servings,
      portionSize,
      // Time calculated from steps
      preparationTime,
      // Components
      recipeItems: data.recipeItems || [],
      instructions: data.instructions || [],
      notes: data.notes || null,
      // Costs (will be calculated after creation)
      costPerServing: 0,
      totalCost: 0,
      laborCost: 0,
      suggestedPrice: 0,
      // Meta
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'admin' // TODO: Get from auth context
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), initialRecipeData);

    // Calculate costs for the newly created recipe
    try {
      if (data.recipeItems && data.recipeItems.length > 0) {
        const costBreakdown = await calculateRecipeCosts(docRef.id);
        
        // Update the recipe with calculated costs
        await updateDoc(docRef, {
          totalCost: costBreakdown.totalCost,
          costPerServing: costBreakdown.costPerServing,
          laborCost: costBreakdown.laborCost,
          suggestedPrice: costBreakdown.suggestedPrice,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.warn('Warning: Could not calculate costs for new recipe:', error);
      // Don't fail recipe creation if cost calculation fails
    }

    // Fetch the created document
    const createdDoc = await getDoc(docRef);

    if (!createdDoc.exists()) {
      throw new Error('Failed to fetch created recipe');
    }

    const recipe = docToRecipe(createdDoc);

    console.log(`✅ Recipe created: ${recipe.name} (${recipe.id})`);

    return recipe;
  } catch (error) {
    console.error('❌ Error creating recipe:', error);
    throw error instanceof Error ? error : new Error('Erro ao criar receita');
  }
}

export async function updateRecipe(data: UpdateRecipeData): Promise<Recipe> {
  try {
    const { id, ...updateData } = data;
    
    console.log('🔄 Updating recipe:', id);

    // Validate required fields
    if (updateData.name && !updateData.name.trim()) {
      throw new Error('Nome da receita é obrigatório');
    }

    if (updateData.generatedAmount && updateData.generatedAmount <= 0) {
      throw new Error('Quantidade gerada deve ser maior que zero');
    }

    if (updateData.servings && updateData.servings <= 0) {
      throw new Error('Número de porções deve ser maior que zero');
    }

    // Check for circular dependencies if recipeItems are being updated
    if (updateData.recipeItems) {
      for (const item of updateData.recipeItems) {
        if (item.type === 'recipe' && item.subRecipeId) {
          // Check circular dependency
          const circularCheck = await checkCircularDependency(id, item.subRecipeId);
          if (circularCheck.hasCircularDependency) {
            throw new Error(circularCheck.message || 'Dependência circular detectada');
          }
          
          // Validate sub-recipe exists
          await validateSubRecipe(item.subRecipeId);
        }
      }
    }

    // Check if recipe with same name already exists (excluding current recipe)
    if (updateData.name) {
      const existingQuery = query(
        collection(db, COLLECTION_NAME),
        where('name', '==', updateData.name),
        where('isActive', '==', true)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      const existingDocs = existingSnapshot.docs.filter(doc => doc.id !== id);
      
      if (existingDocs.length > 0) {
        throw new Error('Já existe uma receita com esse nome');
      }
    }

    // Prepare update data with calculated fields
    const preparedUpdateData: any = { ...updateData };

    // Recalculate preparation time from steps if instructions are updated
    if (updateData.instructions) {
      preparedUpdateData.preparationTime = updateData.instructions.reduce((total, step) => 
        total + (step.timeMinutes || 0), 0
      );
    }

    // Recalculate portion size if generatedAmount or servings are updated
    if (updateData.generatedAmount || updateData.servings) {
      // We need current values to calculate properly
      const currentDoc = await getDoc(doc(db, COLLECTION_NAME, id));
      if (currentDoc.exists()) {
        const currentData = currentDoc.data();
        const newGeneratedAmount = updateData.generatedAmount || currentData.generatedAmount || 1;
        const newServings = updateData.servings || currentData.servings || 1;
        preparedUpdateData.portionSize = newGeneratedAmount / newServings;
      }
    }

    // Update recipe document
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...preparedUpdateData,
      updatedAt: Timestamp.now()
    });

    // Recalculate costs if recipeItems were updated
    if (updateData.recipeItems) {
      try {
        const costBreakdown = await calculateRecipeCosts(id);
        
        // Update the recipe with calculated costs
        await updateDoc(docRef, {
          totalCost: costBreakdown.totalCost,
          costPerServing: costBreakdown.costPerServing,
          laborCost: costBreakdown.laborCost,
          suggestedPrice: costBreakdown.suggestedPrice,
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        console.warn('Warning: Could not recalculate costs for updated recipe:', error);
        // Don't fail recipe update if cost calculation fails
      }
    }

    // Fetch the updated document
    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error('Receita não encontrada');
    }

    const recipe = docToRecipe(updatedDoc);

    console.log(`✅ Recipe updated: ${recipe.name} (${recipe.id})`);

    return recipe;
  } catch (error) {
    console.error('❌ Error updating recipe:', error);
    throw error instanceof Error ? error : new Error('Erro ao atualizar receita');
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  try {
    console.log('🗑️ Deleting recipe:', id);

    // Soft delete by setting isActive to false
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { 
      isActive: false,
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Recipe marked as inactive: ${id}`);
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    throw new Error('Erro ao remover receita');
  }
}

export async function duplicateRecipe(id: string, newName: string): Promise<Recipe> {
  try {
    console.log('📝 Duplicating recipe:', id, 'with new name:', newName);

    // Fetch original recipe
    const originalRecipe = await fetchRecipe(id);

    // Create duplicate recipe data
    const duplicateData: CreateRecipeData = {
      name: newName,
      description: originalRecipe.description,
      category: originalRecipe.category,
      difficulty: originalRecipe.difficulty,
      servings: originalRecipe.servings,
      preparationTime: originalRecipe.preparationTime,
      cookingTime: originalRecipe.cookingTime,
      ingredients: originalRecipe.ingredients,
      instructions: originalRecipe.instructions,
      notes: originalRecipe.notes
    };

    // Create the duplicate recipe
    const duplicatedRecipe = await createRecipe(duplicateData);

    console.log(`✅ Recipe duplicated: ${duplicatedRecipe.name} (${duplicatedRecipe.id})`);

    return duplicatedRecipe;
  } catch (error) {
    console.error('❌ Error duplicating recipe:', error);
    throw error instanceof Error ? error : new Error('Erro ao duplicar receita');
  }
}

// Cost calculation functions
export async function calculateRecipeCosts(id: string): Promise<CostBreakdown> {
  try {
    console.log('📊 Calculating recipe costs:', id);

    const [recipe, settings] = await Promise.all([
      fetchRecipe(id),
      fetchRecipeSettings()
    ]);
    
    console.log(`📊 Recipe: ${recipe.name} | Settings: Labor R$${settings.laborHourRate}/hr, Default Margin ${settings.defaultMargin}%`);
    
    // Calculate costs for each recipe item (ingredients + sub-recipes)
    const itemCosts: any[] = [];
    let ingredientCost = 0;
    let subRecipeCost = 0;

    console.log(`📊 Calculating costs for ${recipe.recipeItems.length} recipe items`);

    const visitedRecipes = new Set<string>();
    visitedRecipes.add(id); // Add current recipe to prevent circular references

    for (const item of recipe.recipeItems) {
      const itemCost = await calculateRecipeItemCost(item, visitedRecipes);
      itemCosts.push(itemCost);
      
      if (item.type === 'ingredient') {
        ingredientCost += itemCost.totalCost;
        console.log(`🥄 Ingredient: ${itemCost.itemName} - ${itemCost.quantity}${itemCost.unit} = ${formatPrice(itemCost.totalCost)}`);
      } else {
        subRecipeCost += itemCost.totalCost;
        console.log(`🍰 Sub-recipe: ${itemCost.itemName} - ${itemCost.quantity}${itemCost.unit} = ${formatPrice(itemCost.totalCost)}`);
      }
    }

    const totalItemCost = ingredientCost + subRecipeCost;

    // Calculate labor cost using settings
    const laborCost = (recipe.preparationTime / 60) * settings.laborHourRate;
    console.log(`⏱️ Labor: ${recipe.preparationTime}min × R$${settings.laborHourRate}/hr = ${formatPrice(laborCost)}`);

    // Total recipe cost
    const totalCost = totalItemCost + laborCost;
    const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;

    // Calculate suggested price using category-specific margin
    const margin = getMarginForCategory(settings, recipe.category);
    const suggestedPrice = costPerServing * (margin / 100);

    const profitAmount = suggestedPrice - costPerServing;
    const profitPercentage = costPerServing > 0 ? (profitAmount / costPerServing) * 100 : 0;

    const costBreakdown: CostBreakdown = {
      recipeId: id,
      itemCosts,
      ingredientCost,
      subRecipeCost,
      totalItemCost,
      laborCost,
      totalCost,
      costPerServing,
      suggestedPrice,
      margin,
      profitAmount,
      profitPercentage,
      servings: recipe.servings,
      calculatedAt: new Date()
    };

    console.log(`✅ Recipe costs calculated: ${formatPrice(totalCost)} total (ingredients: ${formatPrice(ingredientCost)}, sub-recipes: ${formatPrice(subRecipeCost)}, labor: ${formatPrice(laborCost)}) = ${formatPrice(costPerServing)}/serving → ${formatPrice(suggestedPrice)} suggested (${margin}% margin)`);

    return costBreakdown;
  } catch (error) {
    console.error('❌ Error calculating recipe costs:', error);
    throw new Error('Erro ao calcular custos da receita');
  }
}

// Helper function to calculate cost for a single recipe item
async function calculateRecipeItemCost(item: RecipeItem, visitedRecipes = new Set<string>()): Promise<any> {
  try {
    if (item.type === 'ingredient') {
      // Fetch current ingredient price from ingredients collection
      try {
        if (!item.ingredientId) {
          console.warn(`Warning: No ingredientId for ingredient ${item.ingredientName}`);
          return {
            itemId: item.id,
            type: 'ingredient' as const,
            itemName: item.ingredientName || 'Unknown Ingredient',
            quantity: item.quantity,
            unit: item.unit,
            unitCost: 0,
            totalCost: 0
          };
        }

        const ingredient = await fetchIngredient(item.ingredientId);
        
        // Calculate unit cost based on ingredient's measurement value and current price
        // ingredient.currentPrice is the price per ingredient.measurementValue of ingredient.unit
        // We need to calculate the price per unit used in the recipe
        const pricePerBaseUnit = ingredient.currentPrice / ingredient.measurementValue;
        const totalCost = item.quantity * pricePerBaseUnit;
        
        return {
          itemId: item.id,
          type: 'ingredient' as const,
          itemName: item.ingredientName || ingredient.name,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: pricePerBaseUnit,
          totalCost
        };
      } catch (error) {
        console.warn(`Warning: Could not fetch ingredient ${item.ingredientId}:`, error);
        
        // Return zero cost if ingredient can't be fetched
        return {
          itemId: item.id,
          type: 'ingredient' as const,
          itemName: item.ingredientName || 'Unknown Ingredient',
          quantity: item.quantity,
          unit: item.unit,
          unitCost: 0,
          totalCost: 0
        };
      }
    } else {
      // For sub-recipes, calculate costs recursively with proportional scaling
      try {
        if (!item.subRecipeId) {
          throw new Error(`Sub-recipe ID is missing for ${item.subRecipeName}`);
        }

        // Prevent infinite loops by tracking visited recipes
        if (visitedRecipes.has(item.subRecipeId)) {
          console.warn(`Warning: Circular dependency detected for sub-recipe ${item.subRecipeId}, using zero cost`);
          return {
            itemId: item.id,
            type: 'recipe' as const,
            itemName: item.subRecipeName || 'Circular Dependency',
            quantity: item.quantity,
            unit: item.unit,
            unitCost: 0,
            totalCost: 0
          };
        }

        visitedRecipes.add(item.subRecipeId);
        
        const subRecipe = await fetchRecipe(item.subRecipeId);
        
        // Calculate sub-recipe costs recursively
        const subRecipeCostBreakdown = await calculateRecipeSubCosts(subRecipe, visitedRecipes);
        
        // Calculate proportional cost based on quantity used vs. generated amount
        // Example: If sub-recipe generates 600g and we use 300g, we use 50% of the sub-recipe cost
        const proportionUsed = subRecipe.generatedAmount > 0 ? item.quantity / subRecipe.generatedAmount : 0;
        const costPerUnit = subRecipe.generatedAmount > 0 ? subRecipeCostBreakdown.totalCost / subRecipe.generatedAmount : 0;
        const totalCost = item.quantity * costPerUnit;
        
        visitedRecipes.delete(item.subRecipeId); // Clean up visited set
        
        console.log(`🍰 Sub-recipe calculation: ${subRecipe.name} generates ${subRecipe.generatedAmount}${subRecipe.generatedUnit}, using ${item.quantity}${item.unit} (${(proportionUsed * 100).toFixed(1)}% of recipe), cost ${formatPrice(subRecipeCostBreakdown.totalCost)} → ${formatPrice(totalCost)}`);
        
        return {
          itemId: item.id,
          type: 'recipe' as const,
          itemName: item.subRecipeName || subRecipe.name,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: costPerUnit,
          totalCost,
          proportionUsed: proportionUsed,
          subRecipeBreakdown: subRecipeCostBreakdown
        };
      } catch (error) {
        console.warn(`Warning: Could not calculate cost for sub-recipe ${item.subRecipeId}:`, error);
        
        // Return zero cost if sub-recipe can't be fetched
        return {
          itemId: item.id,
          type: 'recipe' as const,
          itemName: item.subRecipeName || 'Unknown Recipe',
          quantity: item.quantity,
          unit: item.unit,
          unitCost: 0,
          totalCost: 0
        };
      }
    }
  } catch (error) {
    console.error('❌ Error calculating item cost:', error);
    throw error;
  }
}

// Helper function to calculate sub-recipe costs without infinite loops
async function calculateRecipeSubCosts(recipe: Recipe, visitedRecipes = new Set<string>()): Promise<{ totalCost: number; ingredientCost: number; subRecipeCost: number; laborCost: number }> {
  try {
    const settings = await fetchRecipeSettings();
    
    let ingredientCost = 0;
    let subRecipeCost = 0;

    // Calculate costs for each recipe item
    for (const item of recipe.recipeItems) {
      const itemCost = await calculateRecipeItemCost(item, visitedRecipes);
      
      if (item.type === 'ingredient') {
        ingredientCost += itemCost.totalCost;
      } else {
        subRecipeCost += itemCost.totalCost;
      }
    }

    // Calculate labor cost
    const laborCost = (recipe.preparationTime / 60) * settings.laborHourRate;

    const totalCost = ingredientCost + subRecipeCost + laborCost;

    return {
      totalCost,
      ingredientCost,
      subRecipeCost,
      laborCost
    };
  } catch (error) {
    console.error('❌ Error calculating sub-recipe costs:', error);
    return {
      totalCost: 0,
      ingredientCost: 0,
      subRecipeCost: 0,
      laborCost: 0
    };
  }
}

export async function updateRecipeCosts(id: string): Promise<{ recipe: Recipe; costBreakdown: CostBreakdown }> {
  try {
    console.log('🔄 Updating recipe costs:', id);

    // Calculate costs
    const costBreakdown = await calculateRecipeCosts(id);

    // Update recipe with new costs
    const updatedRecipe = await updateRecipe({
      id,
      totalCost: costBreakdown.totalCost,
      costPerServing: costBreakdown.costPerServing
    });

    console.log(`✅ Recipe costs updated: ${formatPrice(costBreakdown.totalCost)}`);

    return {
      recipe: updatedRecipe,
      costBreakdown
    };
  } catch (error) {
    console.error('❌ Error updating recipe costs:', error);
    throw new Error('Erro ao atualizar custos da receita');
  }
}

// Utility functions
export function getCategoryDisplayName(category: RecipeCategory): string {
  const categoryNames = {
    [RecipeCategory.CAKES]: 'Bolos',
    [RecipeCategory.CUPCAKES]: 'Cupcakes',
    [RecipeCategory.COOKIES]: 'Biscoitos',
    [RecipeCategory.BREADS]: 'Pães',
    [RecipeCategory.PASTRIES]: 'Doces',
    [RecipeCategory.ICINGS]: 'Coberturas',
    [RecipeCategory.FILLINGS]: 'Recheios',
    [RecipeCategory.OTHER]: 'Outros'
  };
  
  return categoryNames[category] || category;
}

export function getDifficultyDisplayName(difficulty: RecipeDifficulty): string {
  const difficultyNames = {
    [RecipeDifficulty.EASY]: 'Fácil',
    [RecipeDifficulty.MEDIUM]: 'Médio',
    [RecipeDifficulty.HARD]: 'Difícil'
  };
  
  return difficultyNames[difficulty] || difficulty;
}

export function getDifficultyColor(difficulty: RecipeDifficulty): string {
  switch (difficulty) {
    case RecipeDifficulty.EASY:
      return 'text-green-600 bg-green-50 border-green-200';
    case RecipeDifficulty.MEDIUM:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case RecipeDifficulty.HARD:
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Format time utilities
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

export function formatTimeRange(prepTime: number, cookTime: number): string {
  const totalTime = prepTime + cookTime;
  const prepFormatted = formatTime(prepTime);
  const cookFormatted = formatTime(cookTime);
  const totalFormatted = formatTime(totalTime);
  
  if (cookTime === 0) {
    return `Preparo: ${prepFormatted}`;
  }
  
  if (prepTime === 0) {
    return `Cozimento: ${cookFormatted}`;
  }
  
  return `Preparo: ${prepFormatted} | Cozimento: ${cookFormatted} | Total: ${totalFormatted}`;
}

// Price and cost formatting
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

export function formatCostPerServing(cost: number, servings: number): string {
  const costPerServing = servings > 0 ? cost / servings : 0;
  return formatPrice(costPerServing);
}

// Recipe statistics
export function calculateRecipeStats(recipes: Recipe[]) {
  const activeRecipes = recipes.filter(recipe => recipe.isActive);
  
  if (activeRecipes.length === 0) {
    return {
      totalRecipes: 0,
      averageCostPerServing: 0,
      averagePreparationTime: 0,
      categoryDistribution: [],
      difficultyDistribution: []
    };
  }

  const totalCost = activeRecipes.reduce((sum, recipe) => sum + recipe.costPerServing, 0);
  const totalPrepTime = activeRecipes.reduce((sum, recipe) => sum + recipe.preparationTime, 0);

  // Category distribution
  const categoryCount: Record<RecipeCategory, number> = {} as Record<RecipeCategory, number>;
  Object.values(RecipeCategory).forEach(category => {
    categoryCount[category] = 0;
  });
  
  activeRecipes.forEach(recipe => {
    categoryCount[recipe.category]++;
  });

  const categoryDistribution = Object.entries(categoryCount).map(([category, count]) => ({
    category: category as RecipeCategory,
    count,
    percentage: (count / activeRecipes.length) * 100
  }));

  // Difficulty distribution
  const difficultyCount: Record<RecipeDifficulty, number> = {} as Record<RecipeDifficulty, number>;
  Object.values(RecipeDifficulty).forEach(difficulty => {
    difficultyCount[difficulty] = 0;
  });
  
  activeRecipes.forEach(recipe => {
    difficultyCount[recipe.difficulty]++;
  });

  const difficultyDistribution = Object.entries(difficultyCount).map(([difficulty, count]) => ({
    difficulty: difficulty as RecipeDifficulty,
    count,
    percentage: (count / activeRecipes.length) * 100
  }));

  return {
    totalRecipes: activeRecipes.length,
    averageCostPerServing: totalCost / activeRecipes.length,
    averagePreparationTime: totalPrepTime / activeRecipes.length,
    categoryDistribution,
    difficultyDistribution
  };
}

// Recipe search and filtering utilities
export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  return recipes.filter(recipe => {
    if (!recipe.isActive) return false;
    
    if (filters.category && recipe.category !== filters.category) return false;
    if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
    if (filters.maxCostPerServing && recipe.costPerServing > filters.maxCostPerServing) return false;
    if (filters.maxPreparationTime && recipe.preparationTime > filters.maxPreparationTime) return false;
    
    // Updated to search in recipeItems for both ingredients and sub-recipes
    if (filters.ingredientId && !recipe.recipeItems.some(item => 
      item.type === 'ingredient' && item.ingredientId === filters.ingredientId
    )) {
      return false;
    }
    
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      const matchesName = recipe.name.toLowerCase().includes(searchLower);
      const matchesDescription = recipe.description?.toLowerCase().includes(searchLower);
      const matchesNotes = recipe.notes?.toLowerCase().includes(searchLower);
      
      // Updated to search in recipeItems for both ingredients and sub-recipes
      const matchesItems = recipe.recipeItems.some(item => {
        if (item.type === 'ingredient') {
          return item.ingredientName?.toLowerCase().includes(searchLower);
        } else {
          return item.subRecipeName?.toLowerCase().includes(searchLower);
        }
      });
      
      if (!matchesName && !matchesDescription && !matchesNotes && !matchesItems) {
        return false;
      }
    }
    
    return true;
  });
}

// Recipe sorting utilities
export function sortRecipes(recipes: Recipe[], sortBy: 'name' | 'cost' | 'time' | 'updated', order: 'asc' | 'desc' = 'asc'): Recipe[] {
  const sorted = [...recipes].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'pt-BR');
        break;
      case 'cost':
        comparison = a.costPerServing - b.costPerServing;
        break;
      case 'time':
        comparison = a.preparationTime - b.preparationTime;
        break;
      case 'updated':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}