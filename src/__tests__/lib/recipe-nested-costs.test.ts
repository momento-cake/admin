import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateRecipeCosts } from '@/lib/recipes';
import * as IngredientsLib from '@/lib/ingredients';
import * as RecipeSettingsLib from '@/lib/recipeSettings';
import { getDoc, getDocs } from 'firebase/firestore';

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((db: any, collectionName: string, id: string) => ({ id, path: `${collectionName}/${id}` })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() }))
  },
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn()
}));

// Mock Firebase config
vi.mock('@/lib/firebase', () => ({
  db: {}
}));

// Mock ingredients library
vi.mock('@/lib/ingredients');

// Mock recipe settings library
vi.mock('@/lib/recipeSettings');

describe('Recipe Nested Cost Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Level Sub-Recipes', () => {
    it('should calculate cost for recipe with direct ingredient and sub-recipe', async () => {
      // Setup: Recipe with both ingredient and sub-recipe
      const mainRecipeData = {
        id: 'main-recipe-1',
        name: 'Decorated Cake',
        category: 'cakes',
        difficulty: 'medium',
        generatedAmount: 1000,
        generatedUnit: 'g',
        servings: 10,
        preparationTime: 120,
        recipeItems: [
          {
            id: 'item-1',
            type: 'ingredient' as const,
            ingredientId: 'flour-1',
            ingredientName: 'Flour',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'item-2',
            type: 'recipe' as const,
            subRecipeId: 'frosting-recipe',
            subRecipeName: 'Basic Frosting',
            quantity: 300,
            unit: 'g',
          },
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Mix ingredients', timeMinutes: 30 },
        ],
        notes: null,
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const frostingRecipeData = {
        id: 'frosting-recipe',
        name: 'Basic Frosting',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 400,
        generatedUnit: 'g',
        servings: 4,
        preparationTime: 30,
        recipeItems: [
          {
            id: 'frosting-item-1',
            type: 'ingredient' as const,
            ingredientId: 'butter-1',
            ingredientName: 'Butter',
            quantity: 100,
            unit: 'g',
          },
          {
            id: 'frosting-item-2',
            type: 'ingredient' as const,
            ingredientId: 'sugar-1',
            ingredientName: 'Sugar',
            quantity: 200,
            unit: 'g',
          },
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Mix butter and sugar', timeMinutes: 10 },
        ],
        notes: null,
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      // Mock getDoc to return recipe data
      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'main-recipe-1') {
          return {
            exists: () => true,
            data: () => mainRecipeData,
            id: 'main-recipe-1'
          } as any;
        } else if (id === 'frosting-recipe') {
          return {
            exists: () => true,
            data: () => frostingRecipeData,
            id: 'frosting-recipe'
          } as any;
        }

        return {
          exists: () => false,
          data: () => undefined
        } as any;
      });

      // Mock ingredient fetching
      vi.mocked(IngredientsLib.fetchIngredient).mockImplementation(async (id: string) => {
        const ingredients: Record<string, any> = {
          'flour-1': {
            id: 'flour-1',
            name: 'Flour',
            currentPrice: 5.0,
            measurementValue: 500,
            unit: 'g',
          },
          'butter-1': {
            id: 'butter-1',
            name: 'Butter',
            currentPrice: 12.0,
            measurementValue: 250,
            unit: 'g',
          },
          'sugar-1': {
            id: 'sugar-1',
            name: 'Sugar',
            currentPrice: 4.0,
            measurementValue: 1000,
            unit: 'g',
          },
        };
        return ingredients[id] || { currentPrice: 0, measurementValue: 1 };
      });

      // Mock recipe settings
      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 150, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockImplementation((settings, category) => {
        return settings.marginsByCategory?.[category] || settings.defaultMargin;
      });

      // Execute
      const costBreakdown = await calculateRecipeCosts('main-recipe-1');

      // Verify ingredient costs
      // Flour: 200g × (5.0/500) = 200 × 0.01 = 2.0
      expect(costBreakdown.ingredientCost).toBeCloseTo(2.0, 1);

      // Verify sub-recipe costs are included
      // Frosting is 400g, we use 300g
      // Frosting cost breakdown:
      // - Butter: 100g × (12.0/250) = 100 × 0.048 = 4.8
      // - Sugar: 200g × (4.0/1000) = 200 × 0.004 = 0.8
      // - Labor: 30min / 60 × 30 = 15.0
      // - Total frosting: 4.8 + 0.8 + 15 = 20.6
      // - Cost per unit: 20.6 / 400 = 0.0515 per gram
      // - Using 300g: 300 × 0.0515 = 15.45
      expect(costBreakdown.subRecipeCost).toBeCloseTo(15.45, 1);

      // Labor cost: 120min / 60 × 30 = 60
      expect(costBreakdown.laborCost).toBeCloseTo(60, 1);

      // Total cost: ingredient + subRecipe + labor
      expect(costBreakdown.totalCost).toBeCloseTo(
        costBreakdown.ingredientCost + costBreakdown.subRecipeCost + costBreakdown.laborCost,
        1
      );

      // Cost per serving: total / 10 servings
      expect(costBreakdown.costPerServing).toBeCloseTo(
        costBreakdown.totalCost / 10,
        1
      );

      expect(costBreakdown.suggestedPrice).toBeGreaterThan(costBreakdown.costPerServing);
    });

    it('should calculate proportional cost when using partial sub-recipe amount', async () => {
      // Recipe using 50% of sub-recipe's generated amount
      const mainRecipe = {
        id: 'main-1',
        name: 'Partial Sub Recipe User',
        category: 'cakes',
        difficulty: 'easy',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 60,
        recipeItems: [
          {
            id: 'item-1',
            type: 'recipe' as const,
            subRecipeId: 'sub-1',
            subRecipeName: 'Filling',
            quantity: 100, // 50% of sub-recipe's 200g
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Use filling', timeMinutes: 10 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const subRecipe = {
        id: 'sub-1',
        name: 'Filling',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 200,
        generatedUnit: 'g',
        servings: 2,
        preparationTime: 30,
        recipeItems: [
          {
            id: 'sub-item-1',
            type: 'ingredient' as const,
            ingredientId: 'ingredient-1',
            ingredientName: 'Cream',
            quantity: 100,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Mix', timeMinutes: 15 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'main-1') {
          return { exists: () => true, data: () => mainRecipe, id: 'main-1' } as any;
        } else if (id === 'sub-1') {
          return { exists: () => true, data: () => subRecipe, id: 'sub-1' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockResolvedValue({
        id: 'ingredient-1',
        name: 'Cream',
        currentPrice: 8.0,
        measurementValue: 200,
        unit: 'g',
      } as any);

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 100, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockReturnValue(100);

      const costBreakdown = await calculateRecipeCosts('main-1');

      // Sub-recipe cost: 100g * (8/200) + 30 * (30/60) = 4 + 15 = 19
      // We're using 100g of 200g, so 50% proportion
      // Cost per gram: 19 / 200 = 0.095
      // Total for 100g: 100 * 0.095 = 9.5
      expect(costBreakdown.subRecipeCost).toBeCloseTo(9.5, 1);

      // Main recipe labor: 60min / 60 * 30 = 30
      expect(costBreakdown.laborCost).toBeCloseTo(30, 1);

      expect(costBreakdown.totalCost).toBeCloseTo(9.5 + 30, 1);
      expect(costBreakdown.costPerServing).toBeCloseTo((9.5 + 30) / 5, 1);
    });
  });

  describe('Nested Sub-Recipes (Multiple Levels)', () => {
    it('should calculate costs for recipe with 2-level nesting (A → B → ingredients)', async () => {
      // Level 1: Main recipe uses Level 2 sub-recipe
      // Level 2: Sub-recipe uses ingredients and has its own costs
      const levelOneRecipe = {
        id: 'level-1',
        name: 'Fancy Cake',
        category: 'cakes',
        difficulty: 'hard',
        generatedAmount: 1500,
        generatedUnit: 'g',
        servings: 15,
        preparationTime: 180,
        recipeItems: [
          {
            id: 'l1-item-1',
            type: 'ingredient' as const,
            ingredientId: 'flour-1',
            ingredientName: 'Flour',
            quantity: 300,
            unit: 'g',
          },
          {
            id: 'l1-item-2',
            type: 'recipe' as const,
            subRecipeId: 'level-2',
            subRecipeName: 'Chocolate Layer',
            quantity: 400,
            unit: 'g',
          },
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Prepare base', timeMinutes: 60 },
          { stepNumber: 2, instruction: 'Add chocolate layer', timeMinutes: 90 },
        ],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const levelTwoRecipe = {
        id: 'level-2',
        name: 'Chocolate Layer',
        category: 'fillings',
        difficulty: 'medium',
        generatedAmount: 600,
        generatedUnit: 'g',
        servings: 6,
        preparationTime: 60,
        recipeItems: [
          {
            id: 'l2-item-1',
            type: 'ingredient' as const,
            ingredientId: 'chocolate-1',
            ingredientName: 'Chocolate',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'l2-item-2',
            type: 'ingredient' as const,
            ingredientId: 'butter-1',
            ingredientName: 'Butter',
            quantity: 100,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Melt and mix', timeMinutes: 30 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'level-1') {
          return { exists: () => true, data: () => levelOneRecipe, id: 'level-1' } as any;
        } else if (id === 'level-2') {
          return { exists: () => true, data: () => levelTwoRecipe, id: 'level-2' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockImplementation(async (id: string) => {
        const ingredients: Record<string, any> = {
          'flour-1': { id: 'flour-1', name: 'Flour', currentPrice: 5.0, measurementValue: 500 },
          'chocolate-1': { id: 'chocolate-1', name: 'Chocolate', currentPrice: 20.0, measurementValue: 250 },
          'butter-1': { id: 'butter-1', name: 'Butter', currentPrice: 12.0, measurementValue: 250 },
        };
        return ingredients[id];
      });

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 120,
        marginsByCategory: { cakes: 150, fillings: 120 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockImplementation((settings, category) => {
        return settings.marginsByCategory?.[category] || settings.defaultMargin;
      });

      const costBreakdown = await calculateRecipeCosts('level-1');

      // Level 1 ingredient: Flour 300g × (5.0/500) = 3.0
      expect(costBreakdown.ingredientCost).toBeCloseTo(3.0, 1);

      // Level 2 calculation:
      // - Chocolate: 200g × (20.0/250) = 16.0
      // - Butter: 100g × (12.0/250) = 4.8
      // - Total ingredients: 20.8
      // - Labor: 60min / 60 * 30 = 30
      // - Total Level 2: 50.8
      // - Cost per gram: 50.8 / 600 = 0.0847
      // - Using 400g: 400 * 0.0847 = 33.88
      expect(costBreakdown.subRecipeCost).toBeCloseTo(33.88, 1);

      // Main recipe labor: 180min / 60 * 30 = 90
      expect(costBreakdown.laborCost).toBeCloseTo(90, 1);

      const expectedTotal = costBreakdown.ingredientCost + costBreakdown.subRecipeCost + costBreakdown.laborCost;
      expect(costBreakdown.totalCost).toBeCloseTo(expectedTotal, 1);

      // 15 servings
      expect(costBreakdown.costPerServing).toBeCloseTo(expectedTotal / 15, 1);
    });

    it('should calculate costs for recipe with 3-level nesting (A → B → C → ingredients)', async () => {
      // 3 levels of nesting: Main → Layer1 → Layer2 → Ingredients
      const levelOneRecipe = {
        id: 'l1',
        name: 'Ultimate Cake',
        category: 'cakes',
        difficulty: 'hard',
        generatedAmount: 2000,
        generatedUnit: 'g',
        servings: 20,
        preparationTime: 240,
        recipeItems: [
          {
            id: 'l1-i1',
            type: 'recipe' as const,
            subRecipeId: 'l2',
            subRecipeName: 'Inner Layer',
            quantity: 1000,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Assemble', timeMinutes: 60 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const levelTwoRecipe = {
        id: 'l2',
        name: 'Inner Layer',
        category: 'fillings',
        difficulty: 'medium',
        generatedAmount: 800,
        generatedUnit: 'g',
        servings: 8,
        preparationTime: 90,
        recipeItems: [
          {
            id: 'l2-i1',
            type: 'recipe' as const,
            subRecipeId: 'l3',
            subRecipeName: 'Cream',
            quantity: 400,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Combine with cream', timeMinutes: 60 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const levelThreeRecipe = {
        id: 'l3',
        name: 'Cream',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 30,
        recipeItems: [
          {
            id: 'l3-i1',
            type: 'ingredient' as const,
            ingredientId: 'cream-1',
            ingredientName: 'Heavy Cream',
            quantity: 300,
            unit: 'g',
          },
          {
            id: 'l3-i2',
            type: 'ingredient' as const,
            ingredientId: 'sugar-1',
            ingredientName: 'Sugar',
            quantity: 50,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Whip', timeMinutes: 15 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'l1') {
          return { exists: () => true, data: () => levelOneRecipe, id: 'l1' } as any;
        } else if (id === 'l2') {
          return { exists: () => true, data: () => levelTwoRecipe, id: 'l2' } as any;
        } else if (id === 'l3') {
          return { exists: () => true, data: () => levelThreeRecipe, id: 'l3' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockImplementation(async (id: string) => {
        const ingredients: Record<string, any> = {
          'cream-1': { id: 'cream-1', name: 'Heavy Cream', currentPrice: 8.0, measurementValue: 200 },
          'sugar-1': { id: 'sugar-1', name: 'Sugar', currentPrice: 4.0, measurementValue: 1000 },
        };
        return ingredients[id];
      });

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 150, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockImplementation((settings, category) => {
        return settings.marginsByCategory?.[category] || settings.defaultMargin;
      });

      const costBreakdown = await calculateRecipeCosts('l1');

      // Level 3 (Cream):
      // - Heavy Cream: 300g × (8.0/200) = 12.0
      // - Sugar: 50g × (4.0/1000) = 0.2
      // - Labor: 30min / 60 * 30 = 15
      // - Total: 27.2
      // - Cost per gram: 27.2 / 500 = 0.0544

      // Level 2 (Inner Layer) using 400g of Level 3:
      // - Sub-recipe cost: 400 * 0.0544 = 21.76
      // - Labor: 90min / 60 * 30 = 45
      // - Total: 66.76
      // - Cost per gram: 66.76 / 800 = 0.08345

      // Level 1 (Ultimate Cake) using 1000g of Level 2:
      // - Sub-recipe cost: 1000 * 0.08345 = 83.45
      // - Labor: 240min / 60 * 30 = 120
      // - Total: 203.45
      expect(costBreakdown.totalCost).toBeCloseTo(203.45, 0);
      expect(costBreakdown.costPerServing).toBeCloseTo(203.45 / 20, 1);
      expect(costBreakdown.ingredientCost).toBeCloseTo(0, 1); // No direct ingredients
      expect(costBreakdown.subRecipeCost).toBeGreaterThan(80); // Nested costs
    });

    it('should handle multiple sub-recipes at same level with different nesting', async () => {
      // Recipe with 2 sub-recipes where one has nested sub-recipes
      const mainRecipe = {
        id: 'main',
        name: 'Complex Dessert',
        category: 'cakes',
        difficulty: 'hard',
        generatedAmount: 1000,
        generatedUnit: 'g',
        servings: 10,
        preparationTime: 150,
        recipeItems: [
          {
            id: 'item-1',
            type: 'recipe' as const,
            subRecipeId: 'simple-sub',
            subRecipeName: 'Simple Filling',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'item-2',
            type: 'recipe' as const,
            subRecipeId: 'complex-sub',
            subRecipeName: 'Complex Layer',
            quantity: 300,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Combine', timeMinutes: 60 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const simpleSubRecipe = {
        id: 'simple-sub',
        name: 'Simple Filling',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 300,
        generatedUnit: 'g',
        servings: 3,
        preparationTime: 20,
        recipeItems: [
          {
            id: 'simple-i1',
            type: 'ingredient' as const,
            ingredientId: 'butter-1',
            ingredientName: 'Butter',
            quantity: 150,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Mix', timeMinutes: 10 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const complexSubRecipe = {
        id: 'complex-sub',
        name: 'Complex Layer',
        category: 'fillings',
        difficulty: 'hard',
        generatedAmount: 400,
        generatedUnit: 'g',
        servings: 4,
        preparationTime: 80,
        recipeItems: [
          {
            id: 'complex-i1',
            type: 'recipe' as const,
            subRecipeId: 'nested-sub',
            subRecipeName: 'Nested Chocolate',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'complex-i2',
            type: 'ingredient' as const,
            ingredientId: 'cream-1',
            ingredientName: 'Cream',
            quantity: 100,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Layer', timeMinutes: 40 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const nestedSubRecipe = {
        id: 'nested-sub',
        name: 'Nested Chocolate',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 250,
        generatedUnit: 'g',
        servings: 2,
        preparationTime: 30,
        recipeItems: [
          {
            id: 'nested-i1',
            type: 'ingredient' as const,
            ingredientId: 'chocolate-1',
            ingredientName: 'Chocolate',
            quantity: 180,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Melt', timeMinutes: 15 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';
        const recipes: Record<string, any> = {
          'main': mainRecipe,
          'simple-sub': simpleSubRecipe,
          'complex-sub': complexSubRecipe,
          'nested-sub': nestedSubRecipe,
        };

        if (recipes[id]) {
          return { exists: () => true, data: () => recipes[id], id } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockImplementation(async (id: string) => {
        const ingredients: Record<string, any> = {
          'butter-1': { id: 'butter-1', name: 'Butter', currentPrice: 12.0, measurementValue: 250 },
          'cream-1': { id: 'cream-1', name: 'Cream', currentPrice: 8.0, measurementValue: 200 },
          'chocolate-1': { id: 'chocolate-1', name: 'Chocolate', currentPrice: 20.0, measurementValue: 250 },
        };
        return ingredients[id];
      });

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 150, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockImplementation((settings, category) => {
        return settings.marginsByCategory?.[category] || settings.defaultMargin;
      });

      const costBreakdown = await calculateRecipeCosts('main');

      // Should have both simple and complex sub-recipe costs
      expect(costBreakdown.subRecipeCost).toBeGreaterThan(0);
      expect(costBreakdown.totalCost).toBeGreaterThan(costBreakdown.laborCost);
      expect(costBreakdown.costPerServing).toBeCloseTo(costBreakdown.totalCost / 10, 1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle circular dependencies gracefully', async () => {
      // Recipe A uses Recipe B which uses Recipe A (circular)
      const recipeA = {
        id: 'recipe-a',
        name: 'Recipe A',
        category: 'cakes',
        difficulty: 'easy',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 60,
        recipeItems: [
          {
            id: 'a-item-1',
            type: 'recipe' as const,
            subRecipeId: 'recipe-b',
            subRecipeName: 'Recipe B',
            quantity: 250,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Use B', timeMinutes: 30 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const recipeB = {
        id: 'recipe-b',
        name: 'Recipe B',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 400,
        generatedUnit: 'g',
        servings: 4,
        preparationTime: 45,
        recipeItems: [
          {
            id: 'b-item-1',
            type: 'recipe' as const,
            subRecipeId: 'recipe-a', // Circular reference
            subRecipeName: 'Recipe A',
            quantity: 200,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Use A', timeMinutes: 20 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'recipe-a') {
          return { exists: () => true, data: () => recipeA, id: 'recipe-a' } as any;
        } else if (id === 'recipe-b') {
          return { exists: () => true, data: () => recipeB, id: 'recipe-b' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockResolvedValue({
        id: 'ing-1',
        name: 'Ingredient',
        currentPrice: 5.0,
        measurementValue: 100,
      } as any);

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 100, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockReturnValue(100);

      // Should not throw and handle gracefully
      const costBreakdown = await calculateRecipeCosts('recipe-a');

      // Circular dependency should be detected and cost set to 0
      expect(costBreakdown.subRecipeCost).toBeDefined();
      expect(costBreakdown.totalCost).toBeDefined();
      expect(costBreakdown.costPerServing).toBeDefined();
    });

    it('should handle missing sub-recipe with graceful degradation', async () => {
      const mainRecipe = {
        id: 'main-with-missing',
        name: 'Missing Sub-Recipe User',
        category: 'cakes',
        difficulty: 'easy',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 60,
        recipeItems: [
          {
            id: 'item-1',
            type: 'ingredient' as const,
            ingredientId: 'flour-1',
            ingredientName: 'Flour',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'item-2',
            type: 'recipe' as const,
            subRecipeId: 'missing-recipe',
            subRecipeName: 'Missing Recipe',
            quantity: 100,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Try to use missing', timeMinutes: 30 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'main-with-missing') {
          return { exists: () => true, data: () => mainRecipe, id: 'main-with-missing' } as any;
        }

        // Missing recipe returns not found
        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockResolvedValue({
        id: 'flour-1',
        name: 'Flour',
        currentPrice: 5.0,
        measurementValue: 500,
      } as any);

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockReturnValue(100);

      const costBreakdown = await calculateRecipeCosts('main-with-missing');

      // Should still calculate without crashing
      expect(costBreakdown.ingredientCost).toBeCloseTo(200 * (5.0 / 500), 1);
      // Missing sub-recipe should be 0
      expect(costBreakdown.subRecipeCost).toBeDefined();
      expect(costBreakdown.totalCost).toBeGreaterThan(0);
    });

    it('should handle empty sub-recipe items gracefully', async () => {
      const recipe = {
        id: 'empty-sub',
        name: 'Empty Sub-Recipe',
        category: 'cakes',
        difficulty: 'easy',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 60,
        recipeItems: [
          {
            id: 'item-1',
            type: 'recipe' as const,
            subRecipeId: 'empty-recipe',
            subRecipeName: 'Empty Recipe',
            quantity: 100,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Use empty', timeMinutes: 30 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const emptySubRecipe = {
        id: 'empty-recipe',
        name: 'Empty Recipe',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 200,
        generatedUnit: 'g',
        servings: 2,
        preparationTime: 30,
        recipeItems: [], // Empty items
        instructions: [{ stepNumber: 1, instruction: 'Just container', timeMinutes: 10 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'empty-sub') {
          return { exists: () => true, data: () => recipe, id: 'empty-sub' } as any;
        } else if (id === 'empty-recipe') {
          return { exists: () => true, data: () => emptySubRecipe, id: 'empty-recipe' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockResolvedValue({
        id: 'ing-1',
        name: 'Ingredient',
        currentPrice: 5.0,
        measurementValue: 100,
      } as any);

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 100, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockReturnValue(100);

      const costBreakdown = await calculateRecipeCosts('empty-sub');

      // Should handle empty sub-recipe (only labor cost)
      // Empty sub-recipe: labor 30min / 60 * 30 = 15
      // Using 100g of 200g = 50% of 15 = 7.5
      // Main recipe labor: 60min / 60 * 30 = 30
      // Total: 7.5 + 30 = 37.5
      expect(costBreakdown.totalCost).toBeCloseTo(37.5, 1);
    });
  });

  describe('Cost Breakdown Structure and Details', () => {
    it('should provide detailed item costs breakdown for nested recipes', async () => {
      const mainRecipe = {
        id: 'detailed-main',
        name: 'Detailed Breakdown',
        category: 'cakes',
        difficulty: 'medium',
        generatedAmount: 500,
        generatedUnit: 'g',
        servings: 5,
        preparationTime: 90,
        recipeItems: [
          {
            id: 'item-1',
            type: 'ingredient' as const,
            ingredientId: 'ing-1',
            ingredientName: 'Main Ingredient',
            quantity: 200,
            unit: 'g',
          },
          {
            id: 'item-2',
            type: 'recipe' as const,
            subRecipeId: 'detailed-sub',
            subRecipeName: 'Detailed Sub',
            quantity: 150,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Combine', timeMinutes: 45 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      const subRecipe = {
        id: 'detailed-sub',
        name: 'Detailed Sub',
        category: 'fillings',
        difficulty: 'easy',
        generatedAmount: 300,
        generatedUnit: 'g',
        servings: 3,
        preparationTime: 45,
        recipeItems: [
          {
            id: 'sub-item-1',
            type: 'ingredient' as const,
            ingredientId: 'ing-2',
            ingredientName: 'Sub Ingredient',
            quantity: 150,
            unit: 'g',
          },
        ],
        instructions: [{ stepNumber: 1, instruction: 'Mix', timeMinutes: 30 }],
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        createdBy: 'admin',
      };

      vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
        const id = docRef.id || 'unknown';

        if (id === 'detailed-main') {
          return { exists: () => true, data: () => mainRecipe, id: 'detailed-main' } as any;
        } else if (id === 'detailed-sub') {
          return { exists: () => true, data: () => subRecipe, id: 'detailed-sub' } as any;
        }

        return { exists: () => false, data: () => undefined } as any;
      });

      vi.mocked(IngredientsLib.fetchIngredient).mockImplementation(async (id: string) => {
        const ingredients: Record<string, any> = {
          'ing-1': { id: 'ing-1', name: 'Main Ingredient', currentPrice: 10.0, measurementValue: 500 },
          'ing-2': { id: 'ing-2', name: 'Sub Ingredient', currentPrice: 8.0, measurementValue: 400 },
        };
        return ingredients[id];
      });

      vi.mocked(RecipeSettingsLib.fetchRecipeSettings).mockResolvedValue({
        laborHourRate: 30,
        defaultMargin: 100,
        marginsByCategory: { cakes: 150, fillings: 100 },
      } as any);

      vi.mocked(RecipeSettingsLib.getMarginForCategory).mockImplementation((settings, category) => {
        return settings.marginsByCategory?.[category] || settings.defaultMargin;
      });

      const costBreakdown = await calculateRecipeCosts('detailed-main');

      // Verify itemCosts array has detailed breakdown
      expect(costBreakdown.itemCosts).toBeDefined();
      expect(costBreakdown.itemCosts.length).toBeGreaterThan(0);

      // Should have both ingredient and recipe items
      const hasIngredient = costBreakdown.itemCosts.some((item: any) => item.type === 'ingredient');
      const hasRecipe = costBreakdown.itemCosts.some((item: any) => item.type === 'recipe');
      expect(hasIngredient).toBe(true);
      expect(hasRecipe).toBe(true);

      // Recipe item should have nested breakdown
      const recipeItem = costBreakdown.itemCosts.find((item: any) => item.type === 'recipe');
      expect(recipeItem?.subRecipeBreakdown).toBeDefined();
      expect(recipeItem?.proportionUsed).toBeDefined();
    });
  });
});
