import { describe, it, expect } from 'vitest';
import {
  ingredientValidation,
  updateIngredientValidation,
  supplierValidation,
  updateSupplierValidation,
  ingredientFiltersValidation,
  unitConversionValidation,
  stockUpdateValidation,
} from '@/lib/validators/ingredient';

describe('Ingredient Validators', () => {
  describe('ingredientValidation', () => {
    it('should validate correct ingredient data', () => {
      const data = {
        name: 'Flour',
        description: 'White flour',
        unit: 'kilogram',
        measurementValue: 1,
        brand: 'BrandX',
        currentPrice: 10.5,
        supplierId: 'supplier-1',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
        allergens: ['gluten'],
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject ingredient with short name', () => {
      const data = {
        name: 'F',
        unit: 'kilogram',
        measurementValue: 1,
        currentPrice: 10.5,
        supplierId: 'supplier-1',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('pelo menos 2 caracteres');
      }
    });

    it('should reject ingredient with invalid price', () => {
      const data = {
        name: 'Flour',
        unit: 'kilogram',
        measurementValue: 1,
        currentPrice: -10,
        supplierId: 'supplier-1',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positivo');
      }
    });

    it('should reject ingredient without supplier', () => {
      const data = {
        name: 'Flour',
        unit: 'kilogram',
        measurementValue: 1,
        currentPrice: 10.5,
        supplierId: '',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obrigatório');
      }
    });

    it('should reject invalid measurement value', () => {
      const data = {
        name: 'Flour',
        unit: 'kilogram',
        measurementValue: 0,
        currentPrice: 10.5,
        supplierId: 'supplier-1',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('maior que zero');
      }
    });

    it('should reject negative minStock', () => {
      const data = {
        name: 'Flour',
        unit: 'kilogram',
        measurementValue: 1,
        currentPrice: 10.5,
        supplierId: 'supplier-1',
        minStock: -5,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const data = {
        name: 'Flour',
        unit: 'kilogram',
        measurementValue: 1,
        currentPrice: 10.5,
        supplierId: 'supplier-1',
        minStock: 10,
        currentStock: 50,
        category: 'flour',
      };

      const result = ingredientValidation.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('updateIngredientValidation', () => {
    it('should allow partial updates with id', () => {
      const data = {
        id: 'ing-1',
        name: 'Updated Flour',
        currentPrice: 12.0,
      };

      const result = updateIngredientValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require id field', () => {
      const data = {
        name: 'Updated Flour',
        currentPrice: 12.0,
      };

      const result = updateIngredientValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate individual fields', () => {
      const data = {
        id: 'ing-1',
        name: 'F', // Too short
      };

      const result = updateIngredientValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('supplierValidation', () => {
    it('should validate correct supplier data', () => {
      const data = {
        name: 'Test Supplier',
        contactPerson: 'John Doe',
        phone: '(11) 98765-4321',
        email: 'supplier@example.com',
        address: '123 Main St',
        rating: 4,
        categories: ['flour', 'sugar'],
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject supplier with short name', () => {
      const data = {
        name: 'X',
        rating: 3,
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid phone format', () => {
      const data = {
        name: 'Test Supplier',
        phone: '123456',
        rating: 3,
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('telefone');
      }
    });

    it('should reject invalid email format', () => {
      const data = {
        name: 'Test Supplier',
        email: 'invalid-email',
        rating: 3,
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email');
      }
    });

    it('should reject invalid rating', () => {
      const data = {
        name: 'Test Supplier',
        rating: 6,
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept empty phone', () => {
      const data = {
        name: 'Test Supplier',
        phone: '',
        rating: 3,
      };

      const result = supplierValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should apply default rating', () => {
      const data = {
        name: 'Test Supplier',
      };

      const result = supplierValidation.safeParse(data);
      if (result.success) {
        expect(result.data.rating).toBe(3);
      }
    });
  });

  describe('updateSupplierValidation', () => {
    it('should allow partial updates with id', () => {
      const data = {
        id: 'supplier-1',
        name: 'Updated Supplier',
        rating: 5,
      };

      const result = updateSupplierValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require id field', () => {
      const data = {
        name: 'Updated Supplier',
      };

      const result = updateSupplierValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('ingredientFiltersValidation', () => {
    it('should validate correct filters', () => {
      const data = {
        category: 'flour',
        supplierId: 'supplier-1',
        stockStatus: 'low',
        searchQuery: 'test',
        page: 1,
        limit: 50,
      };

      const result = ingredientFiltersValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should apply default page and limit', () => {
      const data = {};

      const result = ingredientFiltersValidation.safeParse(data);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject invalid stock status', () => {
      const data = {
        stockStatus: 'invalid',
      };

      const result = ingredientFiltersValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid page', () => {
      const data = {
        page: 0,
      };

      const result = ingredientFiltersValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const data = {
        limit: 150,
      };

      const result = ingredientFiltersValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('unitConversionValidation', () => {
    it('should validate correct unit conversion', () => {
      const data = {
        from: 'kilogram',
        to: 'gram',
        value: 1,
      };

      const result = unitConversionValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative value', () => {
      const data = {
        from: 'kilogram',
        to: 'gram',
        value: -5,
      };

      const result = unitConversionValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow zero value', () => {
      const data = {
        from: 'kilogram',
        to: 'gram',
        value: 0,
      };

      const result = unitConversionValidation.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('stockUpdateValidation', () => {
    it('should validate correct stock update data', () => {
      const data = {
        quantity: 50,
        type: 'purchase',
        notes: 'New stock',
        supplierId: 'supplier-1',
        unitCost: 10.5,
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject zero quantity', () => {
      const data = {
        quantity: 0,
        type: 'purchase',
        unitCost: 10.5,
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const data = {
        quantity: 50,
        type: 'invalid',
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require unitCost for purchase type', () => {
      const data = {
        quantity: 50,
        type: 'purchase',
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should not require unitCost for usage type', () => {
      const data = {
        quantity: 50,
        type: 'usage',
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate optional fields', () => {
      const data = {
        quantity: 100,
        type: 'adjustment',
        notes: 'Inventory adjustment',
        reason: 'Stock count',
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject long notes', () => {
      const data = {
        quantity: 50,
        type: 'adjustment',
        notes: 'A'.repeat(501),
      };

      const result = stockUpdateValidation.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
