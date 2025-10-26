import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchIngredients,
  fetchIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getStockStatus,
  getStockStatusColor,
  getStockStatusText,
  getUnitDisplayName,
  convertUnits,
  formatPrice,
  formatStock,
  formatMeasurement,
  updateIngredientStock,
  fetchStockHistory,
  createPriceHistory,
  fetchPriceHistory,
  getLatestPrice,
  getCategoryDisplayName,
} from '@/lib/ingredients';
import * as FirebaseFirestore from 'firebase/firestore';
import { mockIngredients, factories } from '../mocks/data';

// Mock Firebase
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('Ingredients Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchIngredients', () => {
    it('should fetch all active ingredients', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'ing-1',
            data: () => ({
              name: 'Flour',
              category: 'Flour',
              unit: 'kg',
              currentStock: 100,
              minStock: 10,
              pricePerUnit: 8.5,
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await fetchIngredients();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Flour');
      expect(FirebaseFirestore.getDocs).toHaveBeenCalled();
    });

    it('should filter ingredients by search query', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'ing-1',
            data: () => ({
              name: 'Flour',
              category: 'Flour',
              unit: 'kg',
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'ing-2',
            data: () => ({
              name: 'Sugar',
              category: 'Sugar',
              unit: 'kg',
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await fetchIngredients({ searchQuery: 'flour' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Flour');
    });

    it('should filter ingredients by category', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'ing-1',
            data: () => ({
              name: 'Flour',
              category: 'Flour',
              unit: 'kg',
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await fetchIngredients({ category: 'Flour' });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Flour');
    });

    it('should filter ingredients by stock status', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [
          {
            id: 'ing-1',
            data: () => ({
              name: 'Flour',
              category: 'Flour',
              unit: 'kg',
              currentStock: 7,
              minStock: 10,
              isActive: true,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await fetchIngredients({ stockStatus: 'low' });

      expect(result).toHaveLength(1);
    });

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(FirebaseFirestore.getDocs).mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(fetchIngredients()).rejects.toThrow('Erro ao buscar ingredientes');
    });
  });

  describe('fetchIngredient', () => {
    it('should fetch a single ingredient by id', async () => {
      const mockDoc = {
        id: 'ing-1',
        exists: () => true,
        data: () => ({
          name: 'Flour',
          category: 'Flour',
          unit: 'kg',
          currentStock: 100,
          minStock: 10,
          pricePerUnit: 8.5,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      const result = await fetchIngredient('ing-1');

      expect(result.id).toBe('ing-1');
      expect(result.name).toBe('Flour');
    });

    it('should throw error if ingredient not found', async () => {
      const mockDoc = {
        id: 'ing-1',
        exists: () => false,
        data: () => null,
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockDoc as any);

      await expect(fetchIngredient('nonexistent')).rejects.toThrow(
        'Ingrediente não encontrado'
      );
    });
  });

  describe('createIngredient', () => {
    it('should create a new ingredient with valid data', async () => {
      const mockDocRef = { id: 'ing-new' };
      const mockCreatedDoc = {
        id: 'ing-new',
        exists: () => true,
        data: () => ({
          name: 'New Ingredient',
          category: 'Flour',
          unit: 'kg',
          currentStock: 50,
          minStock: 10,
          pricePerUnit: 10.0,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockEmptySnapshot = { empty: true, docs: [] };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockEmptySnapshot as any
      );
      vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(mockDocRef as any);
      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(mockCreatedDoc as any);

      const result = await createIngredient({
        name: 'New Ingredient',
        category: 'Flour' as any,
        unit: 'kg' as any,
        currentPrice: 10.0,
        currentStock: 50,
      });

      expect(result.name).toBe('New Ingredient');
      expect(result.currentPrice).toBe(10.0);
      expect(FirebaseFirestore.addDoc).toHaveBeenCalled();
    });

    it('should throw error if ingredient name is missing', async () => {
      await expect(
        createIngredient({
          name: '',
          category: 'Flour' as any,
          unit: 'kg' as any,
        })
      ).rejects.toThrow('Nome do ingrediente é obrigatório');
    });

    it('should throw error if category is missing', async () => {
      await expect(
        createIngredient({
          name: 'Test',
          category: undefined as any,
          unit: 'kg' as any,
        })
      ).rejects.toThrow('Categoria é obrigatória');
    });

    it('should throw error if unit is missing', async () => {
      await expect(
        createIngredient({
          name: 'Test',
          category: 'Flour' as any,
          unit: undefined as any,
        })
      ).rejects.toThrow('Unidade é obrigatória');
    });

    it('should throw error if ingredient with same name already exists', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'existing' }],
      };

      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockSnapshot as any
      );

      await expect(
        createIngredient({
          name: 'Existing',
          category: 'Flour' as any,
          unit: 'kg' as any,
        })
      ).rejects.toThrow('Já existe um ingrediente com esse nome');
    });
  });

  describe('updateIngredient', () => {
    it('should update ingredient with valid data', async () => {
      const mockCurrentDoc = {
        id: 'ing-1',
        exists: () => true,
        data: () => ({
          name: 'Flour',
          category: 'Flour',
          unit: 'kg',
          currentStock: 100,
          minStock: 10,
          pricePerUnit: 8.5,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockUpdatedDoc = {
        id: 'ing-1',
        exists: () => true,
        data: () => ({
          name: 'Flour',
          category: 'Flour',
          unit: 'kg',
          currentStock: 150,
          minStock: 10,
          pricePerUnit: 8.5,
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      const mockEmptySnapshot = { empty: true, docs: [] };

      vi.mocked(FirebaseFirestore.getDoc)
        .mockResolvedValueOnce(mockCurrentDoc as any)
        .mockResolvedValueOnce(mockUpdatedDoc as any);
      vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
        mockEmptySnapshot as any
      );

      const result = await updateIngredient({
        id: 'ing-1',
        currentStock: 150,
      });

      expect(result.currentStock).toBe(150);
      expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
    });

    it('should throw error if ingredient name is empty', async () => {
      await expect(
        updateIngredient({
          id: 'ing-1',
          name: '',
        })
      ).rejects.toThrow('Nome do ingrediente é obrigatório');
    });
  });

  describe('deleteIngredient', () => {
    it('should soft delete ingredient', async () => {
      await deleteIngredient('ing-1');

      expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe('Stock Status Utility Functions', () => {
    describe('getStockStatus', () => {
      it('should return "out" when stock is 0', () => {
        expect(getStockStatus(0, 10)).toBe('out');
      });

      it('should return "critical" when stock is <= 50% of min', () => {
        expect(getStockStatus(5, 10)).toBe('critical');
      });

      it('should return "low" when stock is > 50% and <= 100% of min', () => {
        expect(getStockStatus(7, 10)).toBe('low');
      });

      it('should return "good" when stock is > 100% of min', () => {
        expect(getStockStatus(15, 10)).toBe('good');
      });
    });

    describe('getStockStatusColor', () => {
      it('should return green color for good status', () => {
        const color = getStockStatusColor('good');
        expect(color).toContain('green');
      });

      it('should return yellow color for low status', () => {
        const color = getStockStatusColor('low');
        expect(color).toContain('yellow');
      });

      it('should return red color for critical status', () => {
        const color = getStockStatusColor('critical');
        expect(color).toContain('red');
      });

      it('should return gray color for out status', () => {
        const color = getStockStatusColor('out');
        expect(color).toContain('gray');
      });
    });

    describe('getStockStatusText', () => {
      it('should return Portuguese text for each status', () => {
        expect(getStockStatusText('good')).toBe('Estoque bom');
        expect(getStockStatusText('low')).toBe('Estoque baixo');
        expect(getStockStatusText('critical')).toBe('Estoque crítico');
        expect(getStockStatusText('out')).toBe('Sem estoque');
      });
    });
  });

  describe('Unit Conversion Functions', () => {
    describe('getUnitDisplayName', () => {
      it('should return correct display name for each unit', () => {
        expect(getUnitDisplayName('kilogram')).toBe('kg');
        expect(getUnitDisplayName('gram')).toBe('g');
        expect(getUnitDisplayName('liter')).toBe('L');
        expect(getUnitDisplayName('milliliter')).toBe('ml');
        expect(getUnitDisplayName('unit')).toBe('unidade');
      });
    });

    describe('convertUnits', () => {
      it('should return same value when converting to same unit', () => {
        expect(convertUnits('kilogram', 'kilogram', 5)).toBe(5);
      });

      it('should convert kilograms to grams', () => {
        expect(convertUnits('kilogram', 'gram', 1)).toBe(1000);
      });

      it('should convert grams to kilograms', () => {
        expect(convertUnits('gram', 'kilogram', 1000)).toBe(1);
      });

      it('should convert liters to milliliters', () => {
        expect(convertUnits('liter', 'milliliter', 1)).toBe(1000);
      });

      it('should convert milliliters to liters', () => {
        expect(convertUnits('milliliter', 'liter', 1000)).toBe(1);
      });

      it('should return original value for incompatible units', () => {
        expect(convertUnits('unit', 'kilogram', 5)).toBe(5);
      });
    });
  });

  describe('Formatting Functions', () => {
    describe('formatPrice', () => {
      it('should format price in Brazilian Real', () => {
        const formatted = formatPrice(10.5);
        expect(formatted).toContain('10');
      });

      it('should handle zero price', () => {
        const formatted = formatPrice(0);
        expect(formatted).toBeDefined();
      });

      it('should handle large prices', () => {
        const formatted = formatPrice(1000.99);
        expect(formatted).toContain('1.000');
      });
    });

    describe('formatStock', () => {
      it('should format stock quantity as units', () => {
        expect(formatStock(1)).toBe('1 unidade');
        expect(formatStock(2)).toBe('2 unidades');
      });

      it('should round quantity', () => {
        const result = formatStock(2.7);
        expect(result).toBe('3 unidades');
      });
    });

    describe('formatMeasurement', () => {
      it('should format measurement with unit', () => {
        const result = formatMeasurement(100, 'gram');
        expect(result).toBe('100 g');
      });

      it('should handle different units', () => {
        expect(formatMeasurement(2, 'kilogram')).toBe('2 kg');
        expect(formatMeasurement(500, 'milliliter')).toBe('500 ml');
      });
    });
  });

  describe('Stock Management', () => {
    describe('updateIngredientStock', () => {
      it('should update stock for purchase type', async () => {
        const mockIngredient = {
          id: 'ing-1',
          name: 'Flour',
          currentStock: 100,
          minStock: 10,
          category: 'Flour',
          unit: 'kg',
          isActive: true,
          createdAt: new Date(),
          lastUpdated: new Date(),
        };

        vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue({
          exists: () => true,
          data: () => ({
            name: 'Flour',
            category: 'Flour',
            unit: 'kg',
            currentStock: 100,
            minStock: 10,
            pricePerUnit: 8.5,
            isActive: true,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
          id: 'ing-1',
        } as any);

        vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue({
          id: 'price-1',
        } as any);

        const result = await updateIngredientStock('ing-1', {
          quantity: 50,
          type: 'purchase',
          unitCost: 8.5,
          supplierId: 'supplier-1',
        });

        expect(result.newStock).toBe(150);
        expect(FirebaseFirestore.updateDoc).toHaveBeenCalled();
      });

      it('should reject negative quantity', async () => {
        await expect(
          updateIngredientStock('ing-1', {
            quantity: -10,
            type: 'usage',
          })
        ).rejects.toThrow('Quantidade deve ser um número inteiro positivo');
      });
    });

    describe('fetchStockHistory', () => {
      it('should fetch stock history for ingredient', async () => {
        const mockSnapshot = {
          empty: false,
          docs: [
            {
              id: 'history-1',
              data: () => ({
                ingredientId: 'ing-1',
                type: 'purchase',
                quantity: 50,
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        };

        vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
          mockSnapshot as any
        );

        const result = await fetchStockHistory('ing-1');

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('purchase');
      });
    });
  });

  describe('Price History', () => {
    describe('createPriceHistory', () => {
      it('should create price history entry', async () => {
        const mockDocRef = { id: 'price-1' };

        vi.mocked(FirebaseFirestore.addDoc).mockResolvedValue(
          mockDocRef as any
        );

        const result = await createPriceHistory({
          ingredientId: 'ing-1',
          price: 10.5,
          supplierId: 'supplier-1',
          quantity: 100,
        });

        expect(result.id).toBe('price-1');
        expect(result.price).toBe(10.5);
      });
    });

    describe('fetchPriceHistory', () => {
      it('should fetch price history for ingredient', async () => {
        const mockSnapshot = {
          empty: false,
          docs: [
            {
              id: 'price-1',
              data: () => ({
                ingredientId: 'ing-1',
                price: 10.5,
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        };

        vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
          mockSnapshot as any
        );

        const result = await fetchPriceHistory('ing-1');

        expect(result.total).toBe(1);
        expect(result.priceHistory).toHaveLength(1);
      });
    });

    describe('getLatestPrice', () => {
      it('should get the latest price for ingredient', async () => {
        const mockSnapshot = {
          empty: false,
          docs: [
            {
              id: 'price-1',
              data: () => ({
                ingredientId: 'ing-1',
                price: 10.5,
                createdAt: { toDate: () => new Date() },
              }),
            },
          ],
        };

        vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
          mockSnapshot as any
        );

        const result = await getLatestPrice('ing-1');

        expect(result?.price).toBe(10.5);
      });

      it('should return null if no price history exists', async () => {
        const mockSnapshot = {
          empty: true,
          docs: [],
        };

        vi.mocked(FirebaseFirestore.getDocs).mockResolvedValue(
          mockSnapshot as any
        );

        const result = await getLatestPrice('ing-1');

        expect(result).toBeNull();
      });
    });
  });

  describe('Category Functions', () => {
    it('should return Portuguese category names', () => {
      expect(getCategoryDisplayName('flour')).toBe('Farinha');
      expect(getCategoryDisplayName('sugar')).toBe('Açúcar');
      expect(getCategoryDisplayName('dairy')).toBe('Laticínios');
      expect(getCategoryDisplayName('chocolate')).toBe('Chocolate');
    });
  });
});
