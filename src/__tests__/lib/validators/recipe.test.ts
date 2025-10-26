import { describe, it, expect } from 'vitest';
import {
  recipeValidation,
  updateRecipeValidation,
  recipeFiltersValidation,
  recipeScalingValidation,
  duplicateRecipeValidation,
  costBreakdownValidation,
  priceUpdateValidation,
  recipeStatusValidation,
  batchRecipeUpdateValidation,
  validateRecipeName,
  validateRecipeItem,
  validateRecipeStep,
} from '@/lib/validators/recipe';

describe('Recipe Validators', () => {
  describe('recipeValidation', () => {
    it('should validate correct recipe data', () => {
      const data = {
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'medium',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'flour-1',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix all dry ingredients',
            timeMinutes: 5,
          },
        ],
        notes: 'Optional notes',
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject recipe with short name', () => {
      const data = {
        name: 'C',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'easy',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'flour-1',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix ingredients',
            timeMinutes: 5,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject recipe with zero generated amount', () => {
      const data = {
        name: 'Test Recipe',
        category: 'cakes',
        generatedAmount: 0,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'easy',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'flour-1',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix ingredients',
            timeMinutes: 5,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject recipe with zero servings', () => {
      const data = {
        name: 'Test Recipe',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 0,
        difficulty: 'easy',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'flour-1',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix ingredients',
            timeMinutes: 5,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject recipe without ingredients', () => {
      const data = {
        name: 'Test Recipe',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'easy',
        recipeItems: [],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix ingredients',
            timeMinutes: 5,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject recipe without instructions', () => {
      const data = {
        name: 'Test Recipe',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'easy',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'flour-1',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate sub-recipe items', () => {
      const data = {
        name: 'Complex Recipe',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'hard',
        recipeItems: [
          {
            type: 'recipe',
            subRecipeId: 'cake-base',
            quantity: 500,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Assemble layers',
            timeMinutes: 10,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject recipe item without ingredientId or subRecipeId', () => {
      const data = {
        name: 'Test Recipe',
        category: 'cakes',
        generatedAmount: 1000,
        generatedUnit: 'gram',
        servings: 10,
        difficulty: 'easy',
        recipeItems: [
          {
            type: 'ingredient',
            quantity: 200,
            unit: 'gram',
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Mix ingredients',
            timeMinutes: 5,
          },
        ],
      };

      const result = recipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateRecipeValidation', () => {
    it('should allow partial updates with id', () => {
      const data = {
        id: 'recipe-1',
        name: 'Updated Recipe',
        difficulty: 'hard',
      };

      const result = updateRecipeValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require id field', () => {
      const data = {
        name: 'Updated Recipe',
      };

      const result = updateRecipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('recipeFiltersValidation', () => {
    it('should validate correct filters', () => {
      const data = {
        category: 'cakes',
        difficulty: 'easy',
        maxCostPerServing: 10.0,
        maxPreparationTime: 60,
        searchQuery: 'chocolate',
        ingredientId: 'flour-1',
        page: 1,
        limit: 50,
      };

      const result = recipeFiltersValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should apply default pagination', () => {
      const data = {};

      const result = recipeFiltersValidation.safeParse(data);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject invalid page', () => {
      const data = { page: 0 };

      const result = recipeFiltersValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('recipeScalingValidation', () => {
    it('should validate scaling data', () => {
      const data = {
        targetServings: 20,
        adjustments: [
          {
            ingredientId: 'flour-1',
            customQuantity: 400,
            reason: 'Increased for larger batch',
          },
        ],
      };

      const result = recipeScalingValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject zero servings', () => {
      const data = {
        targetServings: 0,
      };

      const result = recipeScalingValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow adjustments to be optional', () => {
      const data = {
        targetServings: 20,
      };

      const result = recipeScalingValidation.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('duplicateRecipeValidation', () => {
    it('should validate duplicate recipe data', () => {
      const data = {
        newName: 'Chocolate Cake v2',
        adjustServings: 12,
        categoryOverride: 'cakes',
      };

      const result = duplicateRecipeValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require new name', () => {
      const data = {
        newName: 'C',
      };

      const result = duplicateRecipeValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow adjustServings to be optional', () => {
      const data = {
        newName: 'Chocolate Cake v2',
      };

      const result = duplicateRecipeValidation.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('costBreakdownValidation', () => {
    it('should validate cost breakdown data', () => {
      const data = {
        recipeId: 'recipe-1',
        laborHourRate: 50,
        margin: 0.30,
      };

      const result = costBreakdownValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require recipe id', () => {
      const data = {
        recipeId: '',
      };

      const result = costBreakdownValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow labor rate to be optional', () => {
      const data = {
        recipeId: 'recipe-1',
      };

      const result = costBreakdownValidation.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('priceUpdateValidation', () => {
    it('should validate price update data', () => {
      const data = {
        recipeId: 'recipe-1',
        laborHourRate: 50,
        defaultMargin: 0.30,
        marginsByCategory: {
          cakes: 0.35,
          breads: 0.25,
        },
      };

      const result = priceUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require recipe id', () => {
      const data = {
        recipeId: '',
      };

      const result = priceUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('recipeStatusValidation', () => {
    it('should validate status change with test results', () => {
      const data = {
        recipeId: 'recipe-1',
        status: 'testing',
        notes: 'Testing batch 1',
        testResults: {
          tastingNotes: 'Good flavor, needs more salt',
          costAccuracy: true,
          difficultyRating: 'medium',
          recommendedChanges: 'Add 5g salt',
        },
      };

      const result = recipeStatusValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow optional test results', () => {
      const data = {
        recipeId: 'recipe-1',
        status: 'approved',
      };

      const result = recipeStatusValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const data = {
        recipeId: 'recipe-1',
        status: 'invalid',
      };

      const result = recipeStatusValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('batchRecipeUpdateValidation', () => {
    it('should validate batch category update', () => {
      const data = {
        recipeIds: ['recipe-1', 'recipe-2'],
        updateType: 'category',
        category: 'cakes',
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate batch difficulty update', () => {
      const data = {
        recipeIds: ['recipe-1', 'recipe-2'],
        updateType: 'difficulty',
        difficulty: 'hard',
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate batch status update', () => {
      const data = {
        recipeIds: ['recipe-1', 'recipe-2'],
        updateType: 'status',
        status: 'archived',
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate batch archive', () => {
      const data = {
        recipeIds: ['recipe-1', 'recipe-2'],
        updateType: 'archive',
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require relevant field based on updateType', () => {
      const data = {
        recipeIds: ['recipe-1'],
        updateType: 'category',
        // Missing category
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require at least one recipe id', () => {
      const data = {
        recipeIds: [],
        updateType: 'archive',
      };

      const result = batchRecipeUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('validateRecipeName', () => {
    it('should validate correct recipe name', () => {
      const result = validateRecipeName('Chocolate Cake');
      expect(result.isValid).toBe(true);
    });

    it('should reject short name', () => {
      const result = validateRecipeName('C');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject long name', () => {
      const result = validateRecipeName('A'.repeat(101));
      expect(result.isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateRecipeName('  Chocolate Cake  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateRecipeItem', () => {
    it('should validate correct ingredient item', () => {
      const item = {
        type: 'ingredient',
        ingredientId: 'flour-1',
        quantity: 200,
        unit: 'gram',
      };

      const result = validateRecipeItem(item);
      expect(result.isValid).toBe(true);
    });

    it('should validate correct sub-recipe item', () => {
      const item = {
        type: 'recipe',
        subRecipeId: 'cake-base',
        quantity: 500,
        unit: 'gram',
      };

      const result = validateRecipeItem(item);
      expect(result.isValid).toBe(true);
    });

    it('should reject item without required id', () => {
      const item = {
        type: 'ingredient',
        quantity: 200,
        unit: 'gram',
      };

      const result = validateRecipeItem(item);
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid quantity', () => {
      const item = {
        type: 'ingredient',
        ingredientId: 'flour-1',
        quantity: 0,
        unit: 'gram',
      };

      const result = validateRecipeItem(item);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateRecipeStep', () => {
    it('should validate correct recipe step', () => {
      const step = {
        stepNumber: 1,
        instruction: 'Mix all ingredients thoroughly',
        timeMinutes: 10,
      };

      const result = validateRecipeStep(step);
      expect(result.isValid).toBe(true);
    });

    it('should reject step with short instruction', () => {
      const step = {
        stepNumber: 1,
        instruction: 'Mix',
        timeMinutes: 10,
      };

      const result = validateRecipeStep(step);
      expect(result.isValid).toBe(false);
    });

    it('should reject step with zero step number', () => {
      const step = {
        stepNumber: 0,
        instruction: 'Mix all ingredients',
        timeMinutes: 10,
      };

      const result = validateRecipeStep(step);
      expect(result.isValid).toBe(false);
    });

    it('should allow optional notes', () => {
      const step = {
        stepNumber: 1,
        instruction: 'Mix all ingredients thoroughly',
        timeMinutes: 10,
        notes: 'Do not overmix',
      };

      const result = validateRecipeStep(step);
      expect(result.isValid).toBe(true);
    });
  });
});
