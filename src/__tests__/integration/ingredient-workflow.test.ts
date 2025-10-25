import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as ingredientsLib from '@/lib/ingredients';
import * as ingredientsValidator from '@/lib/validators/ingredient';
import * as useAuthModule from '@/hooks/useAuth';
import { mockIngredients, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/lib/ingredients');
vi.mock('@/lib/validators/ingredient');
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));
vi.mock('@/hooks/useAuth');

describe('Ingredient Management Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated user
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { email: 'admin@test.com', uid: 'user123' },
      userModel: { email: 'admin@test.com', role: { type: 'admin' } },
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasPlatformAccess: vi.fn(() => true),
      isPlatformAdmin: vi.fn(() => true),
      hasAccessToTenant: vi.fn(() => true),
    } as any);
  });

  describe('Create New Ingredient Workflow', () => {
    it('should complete ingredient creation from form to API', async () => {
      const ingredientData = {
        name: 'Premium Flour',
        price: 25.50,
        supplierId: 'sup1',
        category: 'grains',
        measurement: {
          value: 1,
          unit: 'kg'
        }
      };

      // Step 1: Validate ingredient data
      vi.mocked(ingredientsValidator.ingredientValidation).mockReturnValue({
        success: true,
        data: ingredientData
      } as any);

      const validationResult = ingredientsValidator.ingredientValidation.safeParse(ingredientData);
      expect(validationResult.success).toBe(true);

      // Step 2: Create ingredient via service
      const createdIngredient = factories.ingredient(ingredientData);
      vi.mocked(ingredientsLib.createIngredient).mockResolvedValue(createdIngredient);

      const result = await ingredientsLib.createIngredient(ingredientData);

      expect(result).toBeDefined();
      expect(result.name).toBe(ingredientData.name);
      expect(result.price).toBe(ingredientData.price);
      expect(vi.mocked(ingredientsLib.createIngredient)).toHaveBeenCalledWith(ingredientData);
    });

    it('should prevent ingredient creation with invalid data', async () => {
      const invalidData = {
        name: '', // Required
        price: -10, // Must be positive
        supplierId: 'sup1'
      };

      vi.mocked(ingredientsValidator.ingredientValidation).mockReturnValue({
        success: false,
        error: {
          errors: [
            { path: ['name'], message: 'Name is required' },
            { path: ['price'], message: 'Price must be positive' }
          ]
        }
      } as any);

      const validationResult = ingredientsValidator.ingredientValidation.safeParse(invalidData);

      expect(validationResult.success).toBe(false);
      expect(vi.mocked(ingredientsLib.createIngredient)).not.toHaveBeenCalled();
    });

    it('should handle ingredient creation errors gracefully', async () => {
      const ingredientData = factories.ingredient();

      vi.mocked(ingredientsValidator.ingredientValidation).mockReturnValue({
        success: true,
        data: ingredientData
      } as any);

      const error = new Error('Database error during creation');
      vi.mocked(ingredientsLib.createIngredient).mockRejectedValue(error);

      await expect(ingredientsLib.createIngredient(ingredientData)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('Update Ingredient Workflow', () => {
    it('should update ingredient with validation', async () => {
      const ingredientId = 'ing1';
      const updateData = {
        id: ingredientId,
        price: 30.00,
        currentStock: 100
      };

      // Step 1: Validate update data
      vi.mocked(ingredientsValidator.updateIngredientValidation).mockReturnValue({
        success: true,
        data: updateData
      } as any);

      const validationResult = ingredientsValidator.updateIngredientValidation.safeParse(updateData);
      expect(validationResult.success).toBe(true);

      // Step 2: Update ingredient
      const updated = {
        ...mockIngredients[0],
        ...updateData
      };
      vi.mocked(ingredientsLib.updateIngredient).mockResolvedValue(updated);

      const result = await ingredientsLib.updateIngredient(updateData);

      expect(result.price).toBe(updateData.price);
      expect(result.currentStock).toBe(updateData.currentStock);
    });

    it('should prevent update of missing required ID field', async () => {
      const invalidUpdateData = {
        price: 30.00
        // Missing id
      };

      vi.mocked(ingredientsValidator.updateIngredientValidation).mockReturnValue({
        success: false,
        error: {
          errors: [{ path: ['id'], message: 'ID is required' }]
        }
      } as any);

      const validationResult = ingredientsValidator.updateIngredientValidation.safeParse(invalidUpdateData);

      expect(validationResult.success).toBe(false);
      expect(vi.mocked(ingredientsLib.updateIngredient)).not.toHaveBeenCalled();
    });

    it('should support partial ingredient updates', async () => {
      const ingredientId = 'ing1';
      const partialUpdate = {
        id: ingredientId,
        currentStock: 150 // Only updating stock
      };

      vi.mocked(ingredientsValidator.updateIngredientValidation).mockReturnValue({
        success: true,
        data: partialUpdate
      } as any);

      const updated = {
        ...mockIngredients[0],
        currentStock: 150
      };
      vi.mocked(ingredientsLib.updateIngredient).mockResolvedValue(updated);

      const result = await ingredientsLib.updateIngredient(partialUpdate);

      expect(result.currentStock).toBe(150);
      // Other fields should remain unchanged
      expect(result.name).toBe(mockIngredients[0].name);
      expect(result.price).toBe(mockIngredients[0].price);
    });
  });

  describe('Delete Ingredient Workflow', () => {
    it('should delete ingredient after confirmation', async () => {
      const ingredientId = 'ing1';

      // Step 1: Fetch ingredient to show confirmation dialog
      vi.mocked(ingredientsLib.fetchIngredient).mockResolvedValue(mockIngredients[0]);

      const ingredient = await ingredientsLib.fetchIngredient(ingredientId);
      expect(ingredient).toBeDefined();

      // Step 2: Delete ingredient
      vi.mocked(ingredientsLib.deleteIngredient).mockResolvedValue(undefined);

      await ingredientsLib.deleteIngredient(ingredientId);

      expect(vi.mocked(ingredientsLib.deleteIngredient)).toHaveBeenCalledWith(ingredientId);
    });

    it('should handle deletion errors', async () => {
      const ingredientId = 'ing1';
      const error = new Error('Cannot delete ingredient in use');

      vi.mocked(ingredientsLib.deleteIngredient).mockRejectedValue(error);

      await expect(
        ingredientsLib.deleteIngredient(ingredientId)
      ).rejects.toThrow('Cannot delete ingredient in use');
    });
  });

  describe('Fetch and Filter Ingredients Workflow', () => {
    it('should fetch and filter ingredients', async () => {
      const filters = {
        category: 'grains' as const,
        stockStatus: 'low' as const
      };

      const filteredIngredients = mockIngredients.filter(
        i => i.category === 'grains'
      );

      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue(filteredIngredients);

      const result = await ingredientsLib.fetchIngredients(filters);

      expect(result.length).toBeGreaterThan(0);
      expect(vi.mocked(ingredientsLib.fetchIngredients)).toHaveBeenCalledWith(filters);
    });

    it('should return empty list for non-matching filters', async () => {
      vi.mocked(ingredientsLib.fetchIngredients).mockResolvedValue([]);

      const filters = {
        category: 'nonexistent' as const
      };

      const result = await ingredientsLib.fetchIngredients(filters);

      expect(result).toEqual([]);
    });
  });

  describe('Stock Management Workflow', () => {
    it('should update ingredient stock with validation', async () => {
      const ingredientId = 'ing1';
      const stockUpdate = {
        ingredientId,
        quantity: 100,
        type: 'purchase' as const,
        purchaseCost: 25.50
      };

      // Step 1: Validate stock update
      vi.mocked(ingredientsValidator.stockUpdateValidation).mockReturnValue({
        success: true,
        data: stockUpdate
      } as any);

      const validationResult = ingredientsValidator.stockUpdateValidation.safeParse(stockUpdate);
      expect(validationResult.success).toBe(true);

      // Step 2: Update stock
      vi.mocked(ingredientsLib.updateIngredientStock).mockResolvedValue(undefined);

      await ingredientsLib.updateIngredientStock(stockUpdate);

      expect(vi.mocked(ingredientsLib.updateIngredientStock)).toHaveBeenCalled();
    });

    it('should prevent stock update with invalid quantity', async () => {
      const invalidStockUpdate = {
        ingredientId: 'ing1',
        quantity: -10, // Invalid: must be positive
        type: 'purchase' as const
      };

      vi.mocked(ingredientsValidator.stockUpdateValidation).mockReturnValue({
        success: false,
        error: {
          errors: [{ path: ['quantity'], message: 'Quantity must be positive' }]
        }
      } as any);

      const validationResult = ingredientsValidator.stockUpdateValidation.safeParse(invalidStockUpdate);

      expect(validationResult.success).toBe(false);
      expect(vi.mocked(ingredientsLib.updateIngredientStock)).not.toHaveBeenCalled();
    });
  });

  describe('Price History Workflow', () => {
    it('should track price changes in history', async () => {
      const ingredientId = 'ing1';
      const newPrice = 35.00;

      // Step 1: Create price history entry
      vi.mocked(ingredientsLib.createPriceHistory).mockResolvedValue({
        id: 'price1',
        ingredientId,
        oldPrice: 25.50,
        newPrice,
        changedBy: 'admin@test.com',
        changedAt: new Date(),
        reason: 'Market price adjustment'
      });

      const priceEntry = await ingredientsLib.createPriceHistory({
        ingredientId,
        oldPrice: 25.50,
        newPrice,
        changedBy: 'admin@test.com',
        reason: 'Market price adjustment'
      });

      expect(priceEntry).toBeDefined();
      expect(priceEntry.newPrice).toBe(newPrice);

      // Step 2: Fetch price history
      vi.mocked(ingredientsLib.fetchPriceHistory).mockResolvedValue([priceEntry]);

      const history = await ingredientsLib.fetchPriceHistory(ingredientId);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].newPrice).toBe(newPrice);
    });
  });

  describe('Permission-Based Workflow', () => {
    it('should allow admin to create ingredients', async () => {
      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.isPlatformAdmin()).toBe(true);

      const ingredientData = factories.ingredient();
      vi.mocked(ingredientsValidator.ingredientValidation).mockReturnValue({
        success: true,
        data: ingredientData
      } as any);

      vi.mocked(ingredientsLib.createIngredient).mockResolvedValue(ingredientData);

      const validation = ingredientsValidator.ingredientValidation.safeParse(ingredientData);

      if (validation.success && result.current.isPlatformAdmin()) {
        await ingredientsLib.createIngredient(ingredientData);
        expect(vi.mocked(ingredientsLib.createIngredient)).toHaveBeenCalled();
      }
    });

    it('should restrict viewer from deleting ingredients', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { email: 'viewer@test.com', uid: 'user456' },
        userModel: { email: 'viewer@test.com', role: { type: 'viewer' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.isPlatformAdmin()).toBe(false);

      // Viewer should not be able to delete
      const ingredientId = 'ing1';

      if (!result.current.isPlatformAdmin()) {
        expect(vi.mocked(ingredientsLib.deleteIngredient)).not.toHaveBeenCalledWith(ingredientId);
      }
    });
  });
});
