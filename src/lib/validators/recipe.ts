import { z } from 'zod';
import { RecipeCategory, RecipeDifficulty } from '@/types/recipe';
import { IngredientUnit } from '@/types/ingredient';

/**
 * Base recipe item schema for ingredients or sub-recipes
 */
const recipeItemSchema = z.object({
  type: z.enum(['ingredient', 'recipe']),
  ingredientId: z.string().optional(),
  subRecipeId: z.string().optional(),
  quantity: z.number()
    .min(0.001, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  unit: z.nativeEnum(IngredientUnit),
  notes: z.string().max(500, 'Notas devem ter no máximo 500 caracteres').optional(),
}).refine((data) => {
  // Ensure either ingredientId or subRecipeId is provided
  return (data.type === 'ingredient' && data.ingredientId) ||
         (data.type === 'recipe' && data.subRecipeId);
}, {
  message: 'Ingrediente ou receita é obrigatório',
  path: ['ingredientId']
});

/**
 * Recipe step schema
 */
const recipeStepSchema = z.object({
  stepNumber: z.number()
    .min(1, 'Número do passo deve ser maior que zero')
    .max(999, 'Número do passo muito alto'),
  instruction: z.string()
    .min(5, 'Instrução deve ter pelo menos 5 caracteres')
    .max(1000, 'Instrução deve ter no máximo 1000 caracteres'),
  timeMinutes: z.number()
    .min(0, 'Tempo deve ser positivo')
    .max(9999, 'Tempo muito alto'),
  notes: z.string()
    .max(500, 'Notas devem ter no máximo 500 caracteres')
    .optional(),
});

/**
 * Main recipe creation validation schema
 */
export const recipeValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  category: z.nativeEnum(RecipeCategory),
  generatedAmount: z.number()
    .min(0.001, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  generatedUnit: z.nativeEnum(IngredientUnit),
  servings: z.number()
    .min(1, 'Receita deve fazer pelo menos 1 porção')
    .max(999, 'Número de porções muito alto'),
  difficulty: z.nativeEnum(RecipeDifficulty),
  recipeItems: z.array(recipeItemSchema)
    .min(1, 'Receita deve ter pelo menos um ingrediente'),
  instructions: z.array(recipeStepSchema)
    .min(1, 'Receita deve ter pelo menos uma instrução'),
  notes: z.string()
    .max(2000, 'Notas devem ter no máximo 2000 caracteres')
    .optional(),
});

/**
 * Recipe update validation schema (all fields optional)
 */
export const updateRecipeValidation = recipeValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

/**
 * Recipe filters validation schema
 */
export const recipeFiltersValidation = z.object({
  category: z.nativeEnum(RecipeCategory).optional(),
  difficulty: z.nativeEnum(RecipeDifficulty).optional(),
  maxCostPerServing: z.number().min(0).optional(),
  maxPreparationTime: z.number().min(0).optional(),
  searchQuery: z.string().optional(),
  ingredientId: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50)
});

/**
 * Recipe scaling options validation
 */
export const recipeScalingValidation = z.object({
  targetServings: z.number()
    .min(1, 'Número de porções deve ser pelo menos 1')
    .max(999, 'Número de porções muito alto'),
  adjustments: z.array(z.object({
    ingredientId: z.string(),
    customQuantity: z.number().min(0),
    reason: z.string().max(500).optional(),
  })).optional(),
});

/**
 * Recipe duplicate options validation
 */
export const duplicateRecipeValidation = z.object({
  newName: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres'),
  adjustServings: z.number()
    .min(1, 'Número de porções deve ser pelo menos 1')
    .max(999, 'Número de porções muito alto')
    .optional(),
  categoryOverride: z.nativeEnum(RecipeCategory).optional(),
});

/**
 * Cost calculation validation
 */
export const costBreakdownValidation = z.object({
  recipeId: z.string().min(1, 'ID da receita é obrigatório'),
  laborHourRate: z.number()
    .min(0, 'Taxa de mão de obra deve ser positiva')
    .optional(),
  margin: z.number()
    .min(0, 'Margem deve ser positiva')
    .optional(),
});

/**
 * Price calculation validation
 */
export const priceUpdateValidation = z.object({
  recipeId: z.string().min(1, 'ID da receita é obrigatório'),
  laborHourRate: z.number()
    .min(0, 'Taxa de mão de obra deve ser positiva')
    .optional(),
  defaultMargin: z.number()
    .min(0, 'Margem padrão deve ser positiva')
    .optional(),
  marginsByCategory: z.record(z.string(), z.number())
    .optional(),
});

/**
 * Recipe status/workflow validation
 */
export const recipeStatusValidation = z.object({
  recipeId: z.string().min(1, 'ID da receita é obrigatório'),
  status: z.enum(['draft', 'testing', 'approved', 'archived']),
  notes: z.string().max(1000).optional(),
  testResults: z.object({
    tastingNotes: z.string().max(1000),
    costAccuracy: z.boolean(),
    difficultyRating: z.nativeEnum(RecipeDifficulty),
    recommendedChanges: z.string().max(1000).optional(),
  }).optional(),
});

/**
 * Batch recipe operations validation
 */
export const batchRecipeUpdateValidation = z.object({
  recipeIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos uma receita'),
  updateType: z.enum(['category', 'difficulty', 'status', 'archive']),
  category: z.nativeEnum(RecipeCategory).optional(),
  difficulty: z.nativeEnum(RecipeDifficulty).optional(),
  status: z.enum(['draft', 'testing', 'approved', 'archived']).optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => {
  // Ensure the relevant field is provided based on updateType
  switch (data.updateType) {
    case 'category':
      return data.category !== undefined;
    case 'difficulty':
      return data.difficulty !== undefined;
    case 'status':
      return data.status !== undefined;
    case 'archive':
      return true; // archive doesn't need additional data
    default:
      return false;
  }
}, {
  message: 'Campo obrigatório para o tipo de atualização selecionado'
});

// Type exports for form use
export type RecipeFormData = z.infer<typeof recipeValidation>;
export type UpdateRecipeFormData = z.infer<typeof updateRecipeValidation>;
export type RecipeFiltersData = z.infer<typeof recipeFiltersValidation>;
export type RecipeScalingData = z.infer<typeof recipeScalingValidation>;
export type DuplicateRecipeData = z.infer<typeof duplicateRecipeValidation>;
export type CostBreakdownData = z.infer<typeof costBreakdownValidation>;
export type PriceUpdateData = z.infer<typeof priceUpdateValidation>;
export type RecipeStatusData = z.infer<typeof recipeStatusValidation>;
export type BatchRecipeUpdateData = z.infer<typeof batchRecipeUpdateValidation>;

// Validation helper functions
export function validateRecipeName(name: string): { isValid: boolean; error?: string } {
  try {
    const nameSchema = z.string()
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter menos de 100 caracteres')
      .trim();

    nameSchema.parse(name);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { isValid: false, error: firstError?.message || 'Nome inválido' };
    }
    return { isValid: false, error: 'Nome inválido' };
  }
}

export function validateRecipeItem(item: unknown): { isValid: boolean; error?: string } {
  try {
    recipeItemSchema.parse(item);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { isValid: false, error: firstError?.message || 'Item de receita inválido' };
    }
    return { isValid: false, error: 'Item de receita inválido' };
  }
}

export function validateRecipeStep(step: unknown): { isValid: boolean; error?: string } {
  try {
    recipeStepSchema.parse(step);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors?.[0];
      return { isValid: false, error: firstError?.message || 'Passo de receita inválido' };
    }
    return { isValid: false, error: 'Passo de receita inválido' };
  }
}
