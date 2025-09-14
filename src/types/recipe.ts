import { IngredientUnit } from './ingredient';

// Recipe core interfaces
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  // Generated amounts and servings
  generatedAmount: number; // e.g., 600 for 600g
  generatedUnit: IngredientUnit; // e.g., 'g', 'ml', 'kg', 'l'
  servings: number; // how many portions this recipe makes
  portionSize: number; // calculated: generatedAmount / servings
  // Time (calculated from steps)
  preparationTime: number; // minutes - sum of all step times
  difficulty: RecipeDifficulty;
  // Components
  recipeItems: RecipeItem[]; // both ingredients and sub-recipes
  instructions: RecipeStep[];
  notes?: string;
  // Costs (calculated fields)
  totalCost: number; // calculated field
  costPerServing: number; // calculated field
  laborCost: number; // calculated field
  suggestedPrice: number; // calculated field
  // Meta
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Unified interface for both ingredients and sub-recipes
export interface RecipeItem {
  id: string;
  type: 'ingredient' | 'recipe';
  // For ingredients
  ingredientId?: string;
  ingredientName?: string; // denormalized for display
  // For sub-recipes
  subRecipeId?: string;
  subRecipeName?: string; // denormalized for display
  // Common fields
  quantity: number;
  unit: IngredientUnit;
  cost: number; // calculated from current price
  notes?: string;
  sortOrder: number;
}

// Legacy interface for backward compatibility (deprecated)
export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string; // denormalized for display
  quantity: number;
  unit: IngredientUnit;
  cost: number; // calculated from current ingredient price
  notes?: string;
  sortOrder: number;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  timeMinutes: number;
  notes?: string;
}

// Recipe enums
export enum RecipeCategory {
  CAKES = 'cakes',
  CUPCAKES = 'cupcakes', 
  COOKIES = 'cookies',
  BREADS = 'breads',
  PASTRIES = 'pastries',
  ICINGS = 'icings',
  FILLINGS = 'fillings',
  OTHER = 'other'
}

export enum RecipeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// Recipe settings for cost calculations
export interface RecipeSettings {
  id: string;
  laborHourRate: number; // R$ per hour
  defaultMargin: number; // percentage (e.g., 150 = 150%)
  marginsByCategory: {
    [key in RecipeCategory]?: number;
  };
  updatedAt: Date;
}

// Form data interfaces
export interface CreateRecipeData {
  name: string;
  description?: string;
  category: RecipeCategory;
  // Generated amounts and servings
  generatedAmount: number;
  generatedUnit: IngredientUnit;
  servings: number;
  // Time will be calculated from steps, no need to include preparationTime here
  difficulty: RecipeDifficulty;
  recipeItems: CreateRecipeItemData[];
  instructions: CreateRecipeStepData[];
  notes?: string;
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {
  id: string;
}

export interface CreateRecipeItemData {
  type: 'ingredient' | 'recipe';
  // For ingredients
  ingredientId?: string;
  // For sub-recipes
  subRecipeId?: string;
  // Common fields
  quantity: number;
  unit: IngredientUnit;
  notes?: string;
}

// Legacy interface for backward compatibility (deprecated)
export interface CreateRecipeIngredientData {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  notes?: string;
}

export interface CreateRecipeStepData {
  stepNumber: number;
  instruction: string;
  timeMinutes: number;
  notes?: string;
}

// Cost calculation interfaces
export interface CostBreakdown {
  recipeId: string;
  itemCosts: RecipeItemCost[];
  ingredientCost: number; // sum of ingredient costs
  subRecipeCost: number; // sum of sub-recipe costs
  totalItemCost: number; // ingredientCost + subRecipeCost
  laborCost: number;
  totalCost: number; // totalItemCost + laborCost
  costPerServing: number;
  suggestedPrice: number;
  margin: number;
  profitAmount: number;
  profitPercentage: number;
  servings: number;
  calculatedAt: Date;
}

export interface RecipeItemCost {
  itemId: string;
  type: 'ingredient' | 'recipe';
  itemName: string;
  quantity: number;
  unit: IngredientUnit;
  unitCost: number;
  totalCost: number;
}

export interface RecipeScalingOptions {
  targetServings: number;
  scalingFactor: number;
  adjustments?: {
    ingredientId: string;
    customQuantity: number;
    reason: string;
  }[];
}

// Filter and search interfaces
export interface RecipeFilters {
  category?: RecipeCategory;
  difficulty?: RecipeDifficulty;
  maxCostPerServing?: number;
  maxPreparationTime?: number;
  searchQuery?: string;
  ingredientId?: string; // recipes that use specific ingredient
}

// API response interfaces
export interface RecipesResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export interface RecipeAnalytics {
  totalRecipes: number;
  averageCostPerServing: number;
  mostExpensiveRecipe: {
    id: string;
    name: string;
    costPerServing: number;
  };
  leastExpensiveRecipe: {
    id: string;
    name: string;
    costPerServing: number;
  };
  categoryDistribution: {
    category: RecipeCategory;
    count: number;
    percentage: number;
  }[];
  difficultyDistribution: {
    difficulty: RecipeDifficulty;
    count: number;
    percentage: number;
  }[];
  averagePreparationTime: number;
  mostUsedIngredients: {
    ingredientId: string;
    ingredientName: string;
    recipeCount: number;
  }[];
}

// Recipe duplication and scaling
export interface DuplicateRecipeOptions {
  newName: string;
  adjustServings?: number;
  categoryOverride?: RecipeCategory;
}

// Recipe validation types
export interface RecipeValidationError {
  field: string;
  message: string;
  code: 'REQUIRED' | 'INVALID' | 'MIN_VALUE' | 'MAX_VALUE' | 'DUPLICATE' | 'CIRCULAR_DEPENDENCY' | 'INCOMPATIBLE_UNIT';
}

export interface RecipeValidationResult {
  isValid: boolean;
  errors: RecipeValidationError[];
  warnings: RecipeValidationError[];
}

// Circular dependency checking
export interface CircularDependencyCheckResult {
  hasCircularDependency: boolean;
  dependencyPath?: string[]; // path of recipe IDs that create the circle
  message?: string;
}

// Recipe scaling with new structure
export interface RecipeScalingResult {
  scaledRecipe: Recipe;
  scalingFactor: number;
  adjustments: RecipeScalingAdjustment[];
}

export interface RecipeScalingAdjustment {
  itemId: string;
  itemType: 'ingredient' | 'recipe';
  originalQuantity: number;
  scaledQuantity: number;
  reason: string;
}

// Recipe status for workflow management
export type RecipeStatus = 'draft' | 'testing' | 'approved' | 'archived';

export interface RecipeWorkflow {
  id: string;
  recipeId: string;
  status: RecipeStatus;
  version: number;
  changedBy: string;
  changedAt: Date;
  notes?: string;
  testResults?: {
    tastingNotes: string;
    costAccuracy: boolean;
    difficultyRating: RecipeDifficulty;
    recommendedChanges?: string;
  };
}