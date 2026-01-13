import { IngredientUnit } from './ingredient';

/**
 * Complete recipe definition with all components and cost calculations.
 *
 * @remarks
 * Recipes are composite documents that include ingredients, steps, and calculated
 * fields like cost and servings. They can be used as sub-recipes within other recipes.
 *
 * @example
 * ```typescript
 * const paodeQueijo: Recipe = {
 *   id: 'rec_001',
 *   name: 'Pão de Queijo',
 *   category: 'breads',
 *   generatedAmount: 600,
 *   generatedUnit: 'gram',
 *   servings: 12,
 *   recipeItems: [...],
 *   instructions: [...]
 * };
 * ```
 */
export interface Recipe {
  /** Unique Firestore document ID */
  id: string;

  /** Recipe name (required) */
  name: string;

  /** Optional description of the recipe */
  description?: string;

  /** Category for organizing recipes */
  category: RecipeCategory;

  // Generated amounts and servings
  /** Total amount produced by this recipe (e.g., 600 for 600g) */
  generatedAmount: number;

  /** Unit of the generated amount (g, ml, kg, l, unit) */
  generatedUnit: IngredientUnit;

  /** Number of servings/portions this recipe produces */
  servings: number;

  /** Size of a single portion (calculated: generatedAmount / servings) */
  portionSize: number;

  // Time (calculated from steps)
  /** Total preparation time in minutes (sum of all step times) */
  preparationTime: number;

  /** Difficulty level of the recipe */
  difficulty: RecipeDifficulty;

  // Components
  /** Ingredients and sub-recipes that make up this recipe */
  recipeItems: RecipeItem[];

  /** Step-by-step instructions for preparing the recipe */
  instructions: RecipeStep[];

  /** Optional notes or tips for this recipe */
  notes?: string;

  // Costs (calculated fields)
  /** Total cost of all ingredients (calculated) */
  totalCost: number;

  /** Cost per serving (calculated) */
  costPerServing: number;

  /** Labor cost based on preparation time (calculated) */
  laborCost: number;

  /** Suggested selling price (calculated) */
  suggestedPrice: number;

  // Meta
  /** Whether recipe is active and available for use */
  isActive: boolean;

  /** When the recipe was created */
  createdAt: Date;

  /** When the recipe was last updated */
  updatedAt: Date;

  /** UID of user who created this recipe */
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

/**
 * Categories for organizing recipes.
 */
export enum RecipeCategory {
  /** Cakes and large pastries */
  CAKES = 'cakes',
  /** Individual cupcakes */
  CUPCAKES = 'cupcakes',
  /** Cookies and small bites */
  COOKIES = 'cookies',
  /** Breads and rolls (including Pão de Queijo) */
  BREADS = 'breads',
  /** Pastries and croissants */
  PASTRIES = 'pastries',
  /** Icings and frostings */
  ICINGS = 'icings',
  /** Fillings and creams */
  FILLINGS = 'fillings',
  /** Other recipes */
  OTHER = 'other'
}

/**
 * Difficulty levels for recipes.
 * Helps users understand complexity and time requirements.
 */
export enum RecipeDifficulty {
  /** Easy, straightforward recipe, minimal technique required */
  EASY = 'easy',
  /** Medium difficulty, some technique and timing required */
  MEDIUM = 'medium',
  /** Hard, advanced techniques or timing required */
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
  // Time fields
  preparationTime?: number;
  cookingTime?: number;
  difficulty: RecipeDifficulty;
  recipeItems: CreateRecipeItemData[];
  // Alias for recipeItems (backwards compatibility)
  ingredients?: CreateRecipeItemData[];
  instructions: CreateRecipeStepData[];
  notes?: string;
}

export interface UpdateRecipeData extends Partial<CreateRecipeData> {
  id: string;
  // Calculated cost fields that can be updated directly
  totalCost?: number;
  costPerServing?: number;
  laborCost?: number;
  suggestedPrice?: number;
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
  proportionUsed?: number;
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