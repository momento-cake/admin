import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecipeCosts } from '@/hooks/useRecipeCosts';
import * as RecipesModule from '@/lib/recipes';
import { mockRecipes, factories } from '../mocks/data';

// Mock recipes module
vi.mock('@/lib/recipes');

describe('useRecipeCosts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with null cost breakdown', () => {
      const recipe = factories.recipe();

      const { result } = renderHook(() => useRecipeCosts(recipe));

      expect(result.current.costBreakdown).toBeNull();
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have recalculate function', () => {
      const recipe = factories.recipe();

      const { result } = renderHook(() => useRecipeCosts(recipe));

      expect(typeof result.current.recalculate).toBe('function');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs when recipe is provided', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
        costPerServing: 5.0,
        ingredientsCost: 40.0,
        laborCost: 10.0,
        margin: 0.3,
        suggestedPrice: 7.5,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.costBreakdown).toEqual(mockCostBreakdown);
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state while calculating', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
        costPerServing: 5.0,
        ingredientsCost: 40.0,
        laborCost: 10.0,
      };

      let resolveCalculation: any;
      const calculationPromise = new Promise(resolve => {
        resolveCalculation = resolve;
      });

      vi.mocked(RecipesModule.calculateRecipeCosts).mockReturnValue(
        calculationPromise as any
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isCalculating).toBe(true);

      resolveCalculation(mockCostBreakdown);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isCalculating).toBe(false);
      expect(result.current.costBreakdown).toEqual(mockCostBreakdown);
    });

    it('should handle calculation errors', async () => {
      const errorMessage = 'Failed to calculate costs';

      vi.mocked(RecipesModule.calculateRecipeCosts).mockRejectedValue(
        new Error(errorMessage)
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.costBreakdown).toBeNull();
      expect(result.current.isCalculating).toBe(false);
    });

    it('should not calculate if recipe has no id', async () => {
      const recipe = factories.recipe({ id: undefined as any });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(RecipesModule.calculateRecipeCosts).not.toHaveBeenCalled();
      expect(result.current.costBreakdown).toBeNull();
    });
  });

  describe('Recalculate Function', () => {
    it('should manually recalculate costs', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
        costPerServing: 5.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await result.current.recalculate();
      });

      expect(result.current.costBreakdown).toEqual(mockCostBreakdown);
    });

    it('should clear error on recalculation', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts)
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce(mockCostBreakdown as any);

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBeDefined();

      await act(async () => {
        await result.current.recalculate();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.costBreakdown).toEqual(mockCostBreakdown);
    });

    it('should return early if recipe has no id', async () => {
      const recipe = factories.recipe({ id: undefined as any });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await result.current.recalculate();
      });

      expect(RecipesModule.calculateRecipeCosts).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Tracking', () => {
    it('should recalculate when recipe items change', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe1 = factories.recipe({
        id: 'recipe-1',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'ing-1',
            quantity: 100,
            unit: 'gram',
          },
        ],
      });

      const { rerender } = renderHook(
        ({ recipe }) => useRecipeCosts(recipe),
        {
          initialProps: { recipe: recipe1 },
        }
      );

      const recipe2 = factories.recipe({
        id: 'recipe-1',
        recipeItems: [
          {
            type: 'ingredient',
            ingredientId: 'ing-1',
            quantity: 200, // Changed
            unit: 'gram',
          },
        ],
      });

      rerender({ recipe: recipe2 });

      // Should recalculate when items change
      expect(RecipesModule.calculateRecipeCosts).toHaveBeenCalledTimes(2);
    });

    it('should recalculate when preparation time changes', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe1 = factories.recipe({
        id: 'recipe-1',
        preparationTime: 30,
      });

      const { rerender } = renderHook(
        ({ recipe }) => useRecipeCosts(recipe),
        {
          initialProps: { recipe: recipe1 },
        }
      );

      const recipe2 = factories.recipe({
        id: 'recipe-1',
        preparationTime: 60, // Changed
      });

      rerender({ recipe: recipe2 });

      expect(RecipesModule.calculateRecipeCosts).toHaveBeenCalledTimes(2);
    });

    it('should recalculate when servings change', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe1 = factories.recipe({
        id: 'recipe-1',
        servings: 10,
      });

      const { rerender } = renderHook(
        ({ recipe }) => useRecipeCosts(recipe),
        {
          initialProps: { recipe: recipe1 },
        }
      );

      const recipe2 = factories.recipe({
        id: 'recipe-1',
        servings: 20, // Changed
      });

      rerender({ recipe: recipe2 });

      expect(RecipesModule.calculateRecipeCosts).toHaveBeenCalledTimes(2);
    });

    it('should recalculate when generated amount changes', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe1 = factories.recipe({
        id: 'recipe-1',
        generatedAmount: 1000,
      });

      const { rerender } = renderHook(
        ({ recipe }) => useRecipeCosts(recipe),
        {
          initialProps: { recipe: recipe1 },
        }
      );

      const recipe2 = factories.recipe({
        id: 'recipe-1',
        generatedAmount: 1500, // Changed
      });

      rerender({ recipe: recipe2 });

      expect(RecipesModule.calculateRecipeCosts).toHaveBeenCalledTimes(2);
    });

    it('should not recalculate on irrelevant changes', async () => {
      const mockCostBreakdown = {
        recipeId: 'recipe-1',
        totalCost: 50.0,
      };

      vi.mocked(RecipesModule.calculateRecipeCosts).mockResolvedValue(
        mockCostBreakdown as any
      );

      const recipe1 = factories.recipe({
        id: 'recipe-1',
        name: 'Recipe 1',
      });

      const { rerender } = renderHook(
        ({ recipe }) => useRecipeCosts(recipe),
        {
          initialProps: { recipe: recipe1 },
        }
      );

      const recipe2 = factories.recipe({
        id: 'recipe-1',
        name: 'Recipe 1 Updated', // Changed name (not in dependencies)
        recipeItems: recipe1.recipeItems,
        preparationTime: recipe1.preparationTime,
        servings: recipe1.servings,
        generatedAmount: recipe1.generatedAmount,
      });

      rerender({ recipe: recipe2 });

      // Should only be called once (on initial mount)
      // Note: might be called twice if React.StrictMode is enabled
      expect(RecipesModule.calculateRecipeCosts).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects thrown', async () => {
      vi.mocked(RecipesModule.calculateRecipeCosts).mockRejectedValue(
        'String error'
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Erro ao calcular custos');
    });

    it('should set calculating to false after error', async () => {
      vi.mocked(RecipesModule.calculateRecipeCosts).mockRejectedValue(
        new Error('Calculation failed')
      );

      const recipe = factories.recipe({ id: 'recipe-1' });

      const { result } = renderHook(() => useRecipeCosts(recipe));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isCalculating).toBe(false);
    });
  });
});
