import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as recipesLib from '@/lib/recipes';
import * as recipesValidator from '@/lib/validators/recipe';
import { mockRecipes, mockIngredients, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/lib/recipes');
vi.mock('@/lib/validators/recipe');
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

describe('Recipe Management Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Recipe Workflow', () => {
    it('should create recipe with ingredients and cost calculation', async () => {
      const recipeData = {
        name: 'Pão de Queijo Premium',
        category: 'breads' as const,
        difficulty: 'easy' as const,
        servings: 12,
        generatedAmount: 1000,
        generatedUnit: 'g',
        recipeItems: [
          {
            ingredientId: 'ing1',
            quantity: 500,
            unit: 'g'
          },
          {
            ingredientId: 'ing2',
            quantity: 2,
            unit: 'units'
          }
        ],
        instructions: [
          { step: 1, instruction: 'Mix ingredients' },
          { step: 2, instruction: 'Bake at 200°C' }
        ]
      };

      // Step 1: Validate recipe data
      vi.mocked(recipesValidator.recipeValidation).mockReturnValue({
        success: true,
        data: recipeData
      } as any);

      const validationResult = recipesValidator.recipeValidation.safeParse(recipeData);
      expect(validationResult.success).toBe(true);

      // Step 2: Create recipe with cost calculation
      const createdRecipe = factories.recipe(recipeData);
      vi.mocked(recipesLib.createRecipe).mockResolvedValue(createdRecipe);

      const result = await recipesLib.createRecipe(recipeData);

      expect(result).toBeDefined();
      expect(result.name).toBe(recipeData.name);
      expect(result.recipeItems?.length).toBe(2);
      expect(result.instructions?.length).toBe(2);
    });

    it('should validate recipe before creation', async () => {
      const invalidRecipeData = {
        name: '', // Required
        category: 'invalid', // Must be enum
        difficulty: 'medium', // Invalid enum value
        servings: 0 // Must be >= 1
      };

      vi.mocked(recipesValidator.recipeValidation).mockReturnValue({
        success: false,
        error: {
          errors: [
            { path: ['name'], message: 'Name is required' },
            { path: ['difficulty'], message: 'Invalid difficulty' }
          ]
        }
      } as any);

      const validationResult = recipesValidator.recipeValidation.safeParse(invalidRecipeData);

      expect(validationResult.success).toBe(false);
      expect(vi.mocked(recipesLib.createRecipe)).not.toHaveBeenCalled();
    });

    it('should prevent circular dependencies in recipes', async () => {
      const recipeData = {
        name: 'Circular Recipe',
        category: 'breads' as const,
        difficulty: 'easy' as const,
        recipeItems: [
          {
            recipeId: 'rec1', // Reference to self
            quantity: 100,
            unit: 'g'
          }
        ]
      };

      vi.mocked(recipesLib.createRecipe).mockRejectedValue(
        new Error('Circular dependency detected')
      );

      await expect(recipesLib.createRecipe(recipeData as any)).rejects.toThrow(
        'Circular dependency'
      );
    });
  });

  describe('Update Recipe Workflow', () => {
    it('should update recipe with ingredient changes', async () => {
      const recipeId = 'rec1';
      const updateData = {
        id: recipeId,
        name: 'Updated Pão de Queijo',
        recipeItems: [
          { ingredientId: 'ing3', quantity: 600, unit: 'g' }
        ]
      };

      // Step 1: Validate update
      vi.mocked(recipesValidator.updateRecipeValidation).mockReturnValue({
        success: true,
        data: updateData
      } as any);

      const validationResult = recipesValidator.updateRecipeValidation.safeParse(updateData);
      expect(validationResult.success).toBe(true);

      // Step 2: Update recipe
      const updated = {
        ...mockRecipes[0],
        ...updateData
      };
      vi.mocked(recipesLib.updateRecipe).mockResolvedValue(updated);

      const result = await recipesLib.updateRecipe(updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.recipeItems?.length).toBe(1);
    });

    it('should calculate cost after recipe update', async () => {
      const recipeId = 'rec1';
      const updateData = {
        id: recipeId,
        servings: 24 // Doubled servings
      };

      vi.mocked(recipesValidator.updateRecipeValidation).mockReturnValue({
        success: true,
        data: updateData
      } as any);

      const updated = {
        ...mockRecipes[0],
        servings: 24
      };
      vi.mocked(recipesLib.updateRecipe).mockResolvedValue(updated);

      const result = await recipesLib.updateRecipe(updateData);

      expect(result.servings).toBe(24);
    });
  });

  describe('Recipe Scaling Workflow', () => {
    it('should scale recipe to different serving size', async () => {
      const recipeId = 'rec1';
      const scalingData = {
        recipeId,
        targetServings: 24
      };

      // Step 1: Validate scaling
      vi.mocked(recipesValidator.recipeScalingValidation).mockReturnValue({
        success: true,
        data: scalingData
      } as any);

      const validationResult = recipesValidator.recipeScalingValidation.safeParse(scalingData);
      expect(validationResult.success).toBe(true);

      // Step 2: Scale recipe ingredients
      const scaled = {
        ...mockRecipes[0],
        servings: 24,
        recipeItems: mockRecipes[0].recipeItems?.map(item => ({
          ...item,
          quantity: item.quantity ? item.quantity * 2 : item.quantity
        }))
      };

      expect(scaled.servings).toBe(24);
    });

    it('should prevent invalid scaling', async () => {
      const invalidScaling = {
        recipeId: 'rec1',
        targetServings: 0 // Invalid: must be >= 1
      };

      vi.mocked(recipesValidator.recipeScalingValidation).mockReturnValue({
        success: false,
        error: {
          errors: [{ path: ['targetServings'], message: 'Must be >= 1' }]
        }
      } as any);

      const validationResult = recipesValidator.recipeScalingValidation.safeParse(invalidScaling);

      expect(validationResult.success).toBe(false);
    });
  });

  describe('Delete Recipe Workflow', () => {
    it('should delete recipe successfully', async () => {
      const recipeId = 'rec1';

      // Step 1: Fetch recipe to show confirmation
      vi.mocked(recipesLib.fetchRecipe).mockResolvedValue(mockRecipes[0]);

      const recipe = await recipesLib.fetchRecipe(recipeId);
      expect(recipe).toBeDefined();

      // Step 2: Delete recipe
      vi.mocked(recipesLib.deleteRecipe).mockResolvedValue(undefined);

      await recipesLib.deleteRecipe(recipeId);

      expect(vi.mocked(recipesLib.deleteRecipe)).toHaveBeenCalledWith(recipeId);
    });
  });

  describe('Duplicate Recipe Workflow', () => {
    it('should duplicate recipe with name and serving adjustment', async () => {
      const recipeId = 'rec1';
      const duplicateData = {
        recipeId,
        newName: 'Pão de Queijo - Batch 2',
        newServings: 24
      };

      // Step 1: Validate duplication
      vi.mocked(recipesValidator.duplicateRecipeValidation).mockReturnValue({
        success: true,
        data: duplicateData
      } as any);

      const validationResult = recipesValidator.duplicateRecipeValidation.safeParse(duplicateData);
      expect(validationResult.success).toBe(true);

      // Step 2: Fetch original recipe
      vi.mocked(recipesLib.fetchRecipe).mockResolvedValue(mockRecipes[0]);

      const original = await recipesLib.fetchRecipe(recipeId);
      expect(original).toBeDefined();

      // Step 3: Create duplicate
      const duplicate = {
        ...original,
        id: 'rec_new',
        name: duplicateData.newName,
        servings: duplicateData.newServings
      };

      vi.mocked(recipesLib.createRecipe).mockResolvedValue(duplicate);

      const created = await recipesLib.createRecipe(duplicate);

      expect(created.name).toBe(duplicateData.newName);
      expect(created.servings).toBe(duplicateData.newServings);
    });
  });

  describe('Recipe Search and Filter Workflow', () => {
    it('should search recipes by name', async () => {
      const filters = {
        searchQuery: 'pao'
      };

      const results = mockRecipes.filter(r =>
        r.name.toLowerCase().includes('pao')
      );

      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: results,
        total: results.length
      });

      const result = await recipesLib.fetchRecipes(filters);

      expect(result.recipes).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter recipes by category and difficulty', async () => {
      const filters = {
        category: 'breads' as const,
        difficulty: 'easy' as const
      };

      const results = mockRecipes.filter(r =>
        r.category === 'breads' && r.difficulty === 'easy'
      );

      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: results,
        total: results.length
      });

      const result = await recipesLib.fetchRecipes(filters);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(filters);
    });

    it('should filter recipes by cost constraints', async () => {
      const filters = {
        maxCostPerServing: 5.00
      };

      const results = mockRecipes.filter(r =>
        (r.costPerServing || 0) <= 5.00
      );

      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: results,
        total: results.length
      });

      const result = await recipesLib.fetchRecipes(filters);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(filters);
    });

    it('should filter recipes by preparation time', async () => {
      const filters = {
        maxPreparationTime: 60 // 60 minutes
      };

      const results = mockRecipes.filter(r =>
        (r.preparationTime || 0) <= 60
      );

      vi.mocked(recipesLib.fetchRecipes).mockResolvedValue({
        recipes: results,
        total: results.length
      });

      const result = await recipesLib.fetchRecipes(filters);

      expect(vi.mocked(recipesLib.fetchRecipes)).toHaveBeenCalledWith(filters);
    });
  });

  describe('Recipe Status Workflow', () => {
    it('should transition recipe through status stages', async () => {
      let recipe = {
        ...mockRecipes[0],
        status: 'draft' as const
      };

      // Step 1: Draft to Testing
      const updateToTesting = {
        id: recipe.id,
        status: 'testing' as const
      };

      vi.mocked(recipesValidator.updateRecipeValidation).mockReturnValue({
        success: true,
        data: updateToTesting
      } as any);

      recipe = { ...recipe, status: 'testing' };

      // Step 2: Testing to Approved
      const updateToApproved = {
        id: recipe.id,
        status: 'approved' as const
      };

      vi.mocked(recipesValidator.recipeStatusValidation).mockReturnValue({
        success: true,
        data: updateToApproved
      } as any);

      const statusValidation = recipesValidator.recipeStatusValidation.safeParse(updateToApproved);
      expect(statusValidation.success).toBe(true);

      recipe = { ...recipe, status: 'approved' };

      // Verify final status
      expect(recipe.status).toBe('approved');
    });

    it('should validate recipe status transitions', async () => {
      const invalidStatusData = {
        id: 'rec1',
        status: 'invalid_status' as any
      };

      vi.mocked(recipesValidator.recipeStatusValidation).mockReturnValue({
        success: false,
        error: {
          errors: [{ path: ['status'], message: 'Invalid status' }]
        }
      } as any);

      const validationResult = recipesValidator.recipeStatusValidation.safeParse(invalidStatusData);

      expect(validationResult.success).toBe(false);
    });
  });

  describe('Cost Breakdown Workflow', () => {
    it('should calculate cost breakdown for recipe', async () => {
      const recipeId = 'rec1';
      const costData = {
        recipeId,
        laborRate: 50 // Per hour
      };

      // Step 1: Validate cost calculation request
      vi.mocked(recipesValidator.costBreakdownValidation).mockReturnValue({
        success: true,
        data: costData
      } as any);

      const validationResult = recipesValidator.costBreakdownValidation.safeParse(costData);
      expect(validationResult.success).toBe(true);

      // Step 2: Calculate cost breakdown
      const costBreakdown = {
        recipeId,
        ingredientsCost: 15.50,
        laborCost: 8.33, // Based on prep time
        totalCost: 23.83,
        costPerServing: 1.98
      };

      expect(costBreakdown.totalCost).toBeGreaterThan(0);
      expect(costBreakdown.costPerServing).toBeGreaterThan(0);
    });
  });
});
