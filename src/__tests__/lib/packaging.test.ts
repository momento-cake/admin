/**
 * Unit Tests for Packaging Firebase Functions
 * Testing CRUD operations, stock management, price history, and utility functions
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import {
  getStockStatus,
  formatPrice,
  getUnitDisplayName,
  getCategoryDisplayName,
  fetchPackaging,
  fetchPackagingItem,
  createPackaging,
  updatePackaging,
  deletePackaging,
  updatePackagingStock,
  fetchStockHistory,
  fetchPriceHistory,
  createPriceHistory
} from '@/lib/packaging';
import { PackagingUnit, PackagingCategory, StockStatus, Packaging, CreatePackagingData, UpdatePackagingData, StockUpdateData, CreatePriceHistoryData } from '@/types/packaging';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('firebase/auth');
vi.mock('@/lib/firebase', () => ({
  db: {}
}));

describe('Packaging Utility Functions', () => {
  describe('getStockStatus', () => {
    it('should return "out" when current stock is 0', () => {
      expect(getStockStatus(0, 100)).toBe('out');
      expect(getStockStatus(0, 0)).toBe('out');
    });

    it('should return "good" when stock >= minStock', () => {
      expect(getStockStatus(100, 100)).toBe('good');
      expect(getStockStatus(150, 100)).toBe('good');
      expect(getStockStatus(200, 100)).toBe('good');
    });

    it('should return "low" when stock is 50-99% of minStock', () => {
      expect(getStockStatus(75, 100)).toBe('low'); // 75%
      expect(getStockStatus(50, 100)).toBe('low'); // 50%
      expect(getStockStatus(99, 100)).toBe('low'); // 99%
    });

    it('should return "critical" when stock is 1-49% of minStock', () => {
      expect(getStockStatus(49, 100)).toBe('critical'); // 49%
      expect(getStockStatus(25, 100)).toBe('critical'); // 25%
      expect(getStockStatus(1, 100)).toBe('critical'); // 1%
    });

    it('should handle edge cases correctly', () => {
      expect(getStockStatus(0, 0)).toBe('out');
      expect(getStockStatus(1, 1)).toBe('good');
      expect(getStockStatus(0.5, 1)).toBe('low'); // 50%
    });
  });

  describe('formatPrice', () => {
    it('should format prices in Brazilian Real format', () => {
      // Note: formatPrice uses Intl.NumberFormat which may use non-breaking space
      expect(formatPrice(10.50)).toMatch(/R\$\s10,50/);
      expect(formatPrice(1000)).toMatch(/R\$\s1\.000,00/);
      expect(formatPrice(0)).toMatch(/R\$\s0,00/);
    });

    it('should handle decimal precision correctly', () => {
      expect(formatPrice(10.999)).toMatch(/R\$\s11,00/); // Rounds up
      expect(formatPrice(10.001)).toMatch(/R\$\s10,00/); // Rounds down
      expect(formatPrice(10.50)).toMatch(/R\$\s10,50/);
    });

    it('should format large numbers with thousand separators', () => {
      expect(formatPrice(1234567.89)).toContain('1.234.567,89');
    });
  });

  describe('getUnitDisplayName', () => {
    it('should return correct display names for all units', () => {
      expect(getUnitDisplayName('unit')).toBe('Unidade');
      expect(getUnitDisplayName('box')).toBe('Caixa');
      expect(getUnitDisplayName('set')).toBe('Conjunto');
      expect(getUnitDisplayName('dozen')).toBe('Dúzia');
      expect(getUnitDisplayName('ream')).toBe('Resma');
    });

    it('should return the original unit for unknown units', () => {
      expect(getUnitDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return correct display names for all categories', () => {
      expect(getCategoryDisplayName('box')).toBe('Caixas');
      expect(getCategoryDisplayName('base')).toBe('Bases/Boards');
      expect(getCategoryDisplayName('topper')).toBe('Toppers');
      expect(getCategoryDisplayName('carrier')).toBe('Caixas de Transporte');
      expect(getCategoryDisplayName('bag')).toBe('Sacos/Bolsas');
      expect(getCategoryDisplayName('paper')).toBe('Papel e Papelão');
      expect(getCategoryDisplayName('ribbon')).toBe('Fitas/Decoração');
      expect(getCategoryDisplayName('other')).toBe('Outros');
    });

    it('should return the original category for unknown categories', () => {
      expect(getCategoryDisplayName('unknown')).toBe('unknown');
    });
  });
});

describe('Packaging CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock authenticated user
    (getAuth as Mock).mockReturnValue({
      currentUser: { uid: 'test-user-123' }
    });
  });

  describe('fetchPackaging', () => {
    it('should fetch all active packaging items', async () => {
      const mockPackagingData = [
        {
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        },
        {
          id: 'pkg-2',
          data: () => ({
            name: 'Caixa nº 10',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 3.50,
            currentStock: 50,
            minStock: 15,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockPackagingData
      });

      const result = await fetchPackaging();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Caixa nº 5');
      expect(result[1].name).toBe('Caixa nº 10');
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('isActive', '==', true);
    });

    it('should filter packaging by search query', async () => {
      const mockPackagingData = [
        {
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            brand: 'Silver Plast',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockPackagingData
      });

      const result = await fetchPackaging({ searchQuery: 'Caixa' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Caixa');
    });

    it('should filter packaging by category', async () => {
      const mockPackagingData = [
        {
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            category: 'box',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockPackagingData
      });

      const result = await fetchPackaging({ category: PackagingCategory.BOX });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('box');
    });

    it('should filter packaging by stock status', async () => {
      const mockPackagingData = [
        {
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 5, // Critical stock
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockPackagingData
      });

      const result = await fetchPackaging({ stockStatus: 'critical' });

      expect(result).toHaveLength(1);
      expect(getStockStatus(result[0].currentStock, result[0].minStock)).toBe('critical');
    });

    it('should handle empty results', async () => {
      (getDocs as Mock).mockResolvedValue({
        docs: []
      });

      const result = await fetchPackaging();

      expect(result).toHaveLength(0);
    });

    it('should throw error on Firebase failure', async () => {
      (getDocs as Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(fetchPackaging()).rejects.toThrow('Erro ao buscar embalagens');
    });
  });

  describe('fetchPackagingItem', () => {
    it('should fetch a single packaging item by ID', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'pkg-1',
        data: () => ({
          name: 'Caixa nº 5',
          unit: 'box',
          measurementValue: 1,
          currentPrice: 2.50,
          currentStock: 100,
          minStock: 20,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user'
        })
      };

      (getDoc as Mock).mockResolvedValue(mockDoc);

      const result = await fetchPackagingItem('pkg-1');

      expect(result.id).toBe('pkg-1');
      expect(result.name).toBe('Caixa nº 5');
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
    });

    it('should throw error when packaging not found', async () => {
      (getDoc as Mock).mockResolvedValue({
        exists: () => false
      });

      await expect(fetchPackagingItem('non-existent')).rejects.toThrow('Embalagem não encontrada');
    });

    it('should handle Firebase errors', async () => {
      (getDoc as Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(fetchPackagingItem('pkg-1')).rejects.toThrow('Erro ao buscar embalagem');
    });
  });

  describe('createPackaging', () => {
    it('should create a new packaging item with valid data', async () => {
      const newPackaging: CreatePackagingData = {
        name: 'Caixa nº 5',
        unit: PackagingUnit.BOX,
        measurementValue: 1,
        currentPrice: 2.50,
        currentStock: 100,
        minStock: 20,
        category: PackagingCategory.BOX
      };

      // Mock empty query result (no duplicates)
      (getDocs as Mock).mockResolvedValue({
        empty: true,
        docs: []
      });

      // Mock add document
      const mockDocRef = { id: 'new-pkg-id' };
      (addDoc as Mock).mockResolvedValue(mockDocRef);

      // Mock get document after creation
      (getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: 'new-pkg-id',
        data: () => ({
          ...newPackaging,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user-123'
        })
      });

      const result = await createPackaging(newPackaging);

      expect(result.id).toBe('new-pkg-id');
      expect(result.name).toBe('Caixa nº 5');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should reject duplicate packaging names', async () => {
      const newPackaging: CreatePackagingData = {
        name: 'Existing Packaging',
        unit: PackagingUnit.BOX,
        measurementValue: 1,
        currentPrice: 2.50,
        currentStock: 100,
        minStock: 20
      };

      // Mock existing packaging with same name
      (getDocs as Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: 'existing-id' }]
      });

      await expect(createPackaging(newPackaging)).rejects.toThrow('Já existe uma embalagem com esse nome');
    });

    it('should validate required fields', async () => {
      const invalidPackaging = {
        name: '',
        unit: PackagingUnit.BOX,
        measurementValue: 1,
        currentPrice: 0,
        currentStock: 0,
        minStock: 0
      } as CreatePackagingData;

      await expect(createPackaging(invalidPackaging)).rejects.toThrow('Nome da embalagem é obrigatório');
    });

    it('should create initial stock history when stock is provided', async () => {
      const newPackaging: CreatePackagingData = {
        name: 'Caixa nº 5',
        unit: PackagingUnit.BOX,
        measurementValue: 1,
        currentPrice: 2.50,
        currentStock: 100,
        minStock: 20,
        supplierId: 'supplier-1'
      };

      (getDocs as Mock).mockResolvedValue({ empty: true, docs: [] });

      const mockDocRef = { id: 'new-pkg-id' };
      (addDoc as Mock).mockResolvedValue(mockDocRef);

      (getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: 'new-pkg-id',
        data: () => ({
          ...newPackaging,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user-123'
        })
      });

      await createPackaging(newPackaging);

      // Verify stock history and price history were created
      // (addDoc called 3 times: packaging + stock history + price history)
      expect(addDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('updatePackaging', () => {
    it('should update packaging with valid data', async () => {
      const updateData: UpdatePackagingData = {
        id: 'pkg-1',
        name: 'Updated Caixa',
        currentPrice: 3.00
      };

      // Mock existing packaging
      (getDoc as Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Old Caixa',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Updated Caixa',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 3.00,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        });

      // Mock no duplicates
      (getDocs as Mock).mockResolvedValue({
        empty: true,
        docs: []
      });

      (updateDoc as Mock).mockResolvedValue(undefined);

      const result = await updatePackaging(updateData);

      expect(result.name).toBe('Updated Caixa');
      expect(result.currentPrice).toBe(3.00);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should reject empty name', async () => {
      const updateData: UpdatePackagingData = {
        id: 'pkg-1',
        name: '   '
      };

      await expect(updatePackaging(updateData)).rejects.toThrow('Nome da embalagem é obrigatório');
    });

    it('should reject duplicate names (excluding current)', async () => {
      const updateData: UpdatePackagingData = {
        id: 'pkg-1',
        name: 'Existing Name'
      };

      // Mock existing packaging
      (getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: 'pkg-1',
        data: () => ({
          name: 'Old Name',
          unit: 'box',
          measurementValue: 1,
          currentPrice: 2.50,
          currentStock: 100,
          minStock: 20,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user'
        })
      });

      // Mock duplicate with different ID
      (getDocs as Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: 'pkg-2' }]
      });

      await expect(updatePackaging(updateData)).rejects.toThrow('Já existe uma embalagem com esse nome');
    });

    it('should log stock history when stock changes', async () => {
      const updateData: UpdatePackagingData = {
        id: 'pkg-1',
        currentStock: 150
      };

      // Mock existing packaging with different stock
      (getDoc as Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 150,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        });

      (updateDoc as Mock).mockResolvedValue(undefined);
      (addDoc as Mock).mockResolvedValue({ id: 'history-id' });

      await updatePackaging(updateData);

      // Verify stock history was created
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('deletePackaging', () => {
    it('should soft delete packaging (mark as inactive)', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'pkg-1',
        data: () => ({
          name: 'Caixa nº 5',
          unit: 'box',
          measurementValue: 1,
          currentPrice: 2.50,
          currentStock: 100,
          minStock: 20,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user'
        })
      };

      (getDoc as Mock).mockResolvedValue(mockDoc);
      (updateDoc as Mock).mockResolvedValue(undefined);

      await deletePackaging('pkg-1');

      expect(updateDoc).toHaveBeenCalled();
      const updateCall = (updateDoc as Mock).mock.calls[0];
      expect(updateCall[1]).toHaveProperty('isActive', false);
    });

    it('should throw error when packaging not found', async () => {
      (getDoc as Mock).mockResolvedValue({
        exists: () => false
      });

      await expect(deletePackaging('non-existent')).rejects.toThrow('Embalagem não encontrada');
    });
  });
});

describe('Stock Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuth as Mock).mockReturnValue({
      currentUser: { uid: 'test-user-123' }
    });
  });

  describe('updatePackagingStock', () => {
    it('should update stock and create history entry', async () => {
      const stockUpdate: StockUpdateData = {
        packagingId: 'pkg-1',
        type: 'purchase',
        quantity: 50,
        supplierId: 'supplier-1',
        unitCost: 2.50,
        notes: 'Stock replenishment'
      };

      // Mock existing packaging
      (getDoc as Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            currentStock: 100,
            minStock: 20,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'history-1',
          data: () => ({
            packagingId: 'pkg-1',
            type: 'purchase',
            quantity: 50,
            previousStock: 100,
            newStock: 150,
            supplierId: 'supplier-1',
            unitCost: 2.50,
            notes: 'Stock replenishment',
            createdAt: Timestamp.now(),
            createdBy: 'test-user-123'
          })
        });

      (updateDoc as Mock).mockResolvedValue(undefined);
      (addDoc as Mock).mockResolvedValue({ id: 'history-1' });

      const result = await updatePackagingStock(stockUpdate);

      expect(result.packagingId).toBe('pkg-1');
      expect(result.type).toBe('purchase');
      expect(result.previousStock).toBe(100);
      expect(result.newStock).toBe(150);
      expect(updateDoc).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();
    });

    it('should prevent negative stock', async () => {
      const stockUpdate: StockUpdateData = {
        packagingId: 'pkg-1',
        type: 'usage',
        quantity: -150 // Negative quantity for removal (more than available)
      };

      // Mock existing packaging with 100 stock
      (getDoc as Mock).mockResolvedValue({
        exists: () => true,
        id: 'pkg-1',
        data: () => ({
          name: 'Caixa nº 5',
          unit: 'box',
          measurementValue: 1,
          currentPrice: 2.50,
          currentStock: 100,
          minStock: 20,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'test-user'
        })
      });

      await expect(updatePackagingStock(stockUpdate)).rejects.toThrow('Estoque resultante não pode ser negativo');
    });

    it('should handle stock removal correctly', async () => {
      const stockUpdate: StockUpdateData = {
        packagingId: 'pkg-1',
        type: 'usage',
        quantity: -30 // Negative quantity for removal
      };

      (getDoc as Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            currentStock: 100,
            minStock: 20,
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'history-1',
          data: () => ({
            packagingId: 'pkg-1',
            type: 'usage',
            quantity: 30,
            previousStock: 100,
            newStock: 70,
            createdAt: Timestamp.now(),
            createdBy: 'test-user-123'
          })
        });

      (updateDoc as Mock).mockResolvedValue(undefined);
      (addDoc as Mock).mockResolvedValue({ id: 'history-1' });

      const result = await updatePackagingStock(stockUpdate);

      expect(result.newStock).toBe(70);
    });
  });

  describe('fetchStockHistory', () => {
    it('should fetch stock history for a packaging item', async () => {
      const mockHistoryData = [
        {
          id: 'history-1',
          data: () => ({
            packagingId: 'pkg-1',
            type: 'purchase',
            quantity: 50,
            previousStock: 100,
            newStock: 150,
            createdAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        },
        {
          id: 'history-2',
          data: () => ({
            packagingId: 'pkg-1',
            type: 'usage',
            quantity: 20,
            previousStock: 150,
            newStock: 130,
            createdAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockHistoryData
      });

      const result = await fetchStockHistory('pkg-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('purchase');
      expect(result[1].type).toBe('usage');
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('packagingId', '==', 'pkg-1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should default to 50 entries when no limit provided', async () => {
      (getDocs as Mock).mockResolvedValue({ docs: [] });

      await fetchStockHistory('pkg-1');

      expect(limit).toHaveBeenCalledWith(50);
    });

    it('should handle empty history', async () => {
      (getDocs as Mock).mockResolvedValue({ docs: [] });

      const result = await fetchStockHistory('pkg-1');

      expect(result).toHaveLength(0);
    });

    it('should handle Firebase errors', async () => {
      (getDocs as Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(fetchStockHistory('pkg-1')).rejects.toThrow('Erro ao buscar histórico de estoque');
    });
  });
});

describe('Price History Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuth as Mock).mockReturnValue({
      currentUser: { uid: 'test-user-123' }
    });
  });

  describe('fetchPriceHistory', () => {
    it('should fetch price history for a packaging item', async () => {
      const mockPriceData = [
        {
          id: 'price-1',
          data: () => ({
            packagingId: 'pkg-1',
            price: 2.50,
            supplierId: 'supplier-1',
            quantity: 100,
            createdAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        }
      ];

      (getDocs as Mock).mockResolvedValue({
        docs: mockPriceData
      });

      const result = await fetchPriceHistory('pkg-1');

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(2.50);
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('packagingId', '==', 'pkg-1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should handle empty price history', async () => {
      (getDocs as Mock).mockResolvedValue({ docs: [] });

      const result = await fetchPriceHistory('pkg-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('createPriceHistory', () => {
    it('should create price history entry with valid data', async () => {
      const priceData: CreatePriceHistoryData = {
        packagingId: 'pkg-1',
        price: 3.00,
        supplierId: 'supplier-1',
        quantity: 100,
        notes: 'Price increase'
      };

      // Mock packaging exists
      (getDoc as Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'pkg-1',
          data: () => ({
            name: 'Caixa nº 5',
            currentStock: 100,
            minStock: 20,
            unit: 'box',
            measurementValue: 1,
            currentPrice: 2.50,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'test-user'
          })
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'price-1',
          data: () => ({
            ...priceData,
            createdAt: Timestamp.now(),
            createdBy: 'test-user-123'
          })
        });

      (addDoc as Mock).mockResolvedValue({ id: 'price-1' });

      const result = await createPriceHistory(priceData);

      expect(result.price).toBe(3.00);
      expect(result.packagingId).toBe('pkg-1');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        packagingId: '',
        price: 0,
        supplierId: '',
        quantity: 0
      } as CreatePriceHistoryData;

      await expect(createPriceHistory(invalidData)).rejects.toThrow('ID da embalagem é obrigatório');
    });

    it('should validate supplier is provided', async () => {
      const invalidData = {
        packagingId: 'pkg-1',
        price: 10,
        supplierId: '',
        quantity: 100
      } as CreatePriceHistoryData;

      await expect(createPriceHistory(invalidData)).rejects.toThrow('ID do fornecedor é obrigatório');
    });

    it('should reject negative prices', async () => {
      const invalidData = {
        packagingId: 'pkg-1',
        price: -10,
        supplierId: 'supplier-1',
        quantity: 100
      } as CreatePriceHistoryData;

      await expect(createPriceHistory(invalidData)).rejects.toThrow('Preço não pode ser negativo');
    });

    it('should reject zero or negative quantities', async () => {
      const invalidData = {
        packagingId: 'pkg-1',
        price: 10,
        supplierId: 'supplier-1',
        quantity: 0
      } as CreatePriceHistoryData;

      await expect(createPriceHistory(invalidData)).rejects.toThrow('Quantidade deve ser maior que zero');
    });
  });
});
