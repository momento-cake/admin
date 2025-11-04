import { describe, it, expect, vi } from 'vitest';
import {
  calculateProductCost,
  calculateSuggestedPrice,
  calculateProfitMargin,
  isMarginViable,
  formatPrice,
  getCategoryDisplayName,
  getSubcategoryDisplayName,
  getMarginStatus,
} from '@/lib/products';
import type { Product, ProductCategory, ProductSubcategory } from '@/types/product';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('Products Library - Cost Calculations', () => {
  describe('calculateProductCost', () => {
    it('should calculate cost from recipes only', () => {
      const product: Partial<Product> = {
        productRecipes: [
          {
            id: 'recipe-1',
            recipeId: 'r1',
            recipeName: 'Vanilla Cake',
            portions: 2,
            recipeCost: 10.00, // 5.00 per serving × 2 portions
          },
          {
            id: 'recipe-2',
            recipeId: 'r2',
            recipeName: 'Chocolate Frosting',
            portions: 1,
            recipeCost: 5.00,
          },
        ],
        productPackages: [],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(15.00);
    });

    it('should calculate cost from packages only', () => {
      const product: Partial<Product> = {
        productRecipes: [],
        productPackages: [
          {
            id: 'pkg-1',
            packagingId: 'p1',
            packagingName: 'Box',
            quantity: 2,
            packageCost: 3.00, // 1.50 per unit × 2 units
          },
        ],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(3.00);
    });

    it('should calculate cost from recipes and packages combined', () => {
      const product: Partial<Product> = {
        productRecipes: [
          {
            id: 'recipe-1',
            recipeId: 'r1',
            recipeName: 'Cake Base',
            portions: 3,
            recipeCost: 15.00, // 5.00 per serving × 3 portions
          },
        ],
        productPackages: [
          {
            id: 'pkg-1',
            packagingId: 'p1',
            packagingName: 'Box',
            quantity: 1,
            packageCost: 2.50,
          },
          {
            id: 'pkg-2',
            packagingId: 'p2',
            packagingName: 'Ribbon',
            quantity: 2,
            packageCost: 1.00,
          },
        ],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(18.50); // 15.00 + 2.50 + 1.00
    });

    it('should return 0 for products with no recipes or packages', () => {
      const product: Partial<Product> = {
        productRecipes: [],
        productPackages: [],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(0);
    });

    it('should handle undefined productPackages gracefully', () => {
      const product: Partial<Product> = {
        productRecipes: [
          {
            id: 'recipe-1',
            recipeId: 'r1',
            recipeName: 'Cake',
            portions: 1,
            recipeCost: 10.00,
          },
        ],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(10.00);
    });

    it('should handle recipes with zero cost', () => {
      const product: Partial<Product> = {
        productRecipes: [
          {
            id: 'recipe-1',
            recipeId: 'r1',
            recipeName: 'Free Recipe',
            portions: 5,
            recipeCost: 0,
          },
        ],
        productPackages: [],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(0);
    });

    it('should handle large costs accurately', () => {
      const product: Partial<Product> = {
        productRecipes: [
          {
            id: 'recipe-1',
            recipeId: 'r1',
            recipeName: 'Expensive Cake',
            portions: 10,
            recipeCost: 500.00,
          },
        ],
        productPackages: [
          {
            id: 'pkg-1',
            packagingId: 'p1',
            packagingName: 'Luxury Box',
            quantity: 20,
            packageCost: 100.00,
          },
        ],
      };

      const cost = calculateProductCost(product);
      expect(cost).toBe(600.00);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('should calculate suggested price with standard 30% markup', () => {
      const costPrice = 100;
      const markup = 30;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBe(130);
    });

    it('should calculate suggested price with 50% markup', () => {
      const costPrice = 100;
      const markup = 50;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBe(150);
    });

    it('should calculate suggested price with 0% markup', () => {
      const costPrice = 100;
      const markup = 0;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBe(100);
    });

    it('should calculate suggested price with high markup', () => {
      const costPrice = 50;
      const markup = 200;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBe(150); // 50 × (1 + 2.0)
    });

    it('should handle zero cost price', () => {
      const costPrice = 0;
      const markup = 30;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBe(0);
    });

    it('should handle decimal costs and markups', () => {
      const costPrice = 25.50;
      const markup = 25;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBeCloseTo(31.875, 3);
    });

    it('should handle very small costs', () => {
      const costPrice = 0.10;
      const markup = 100;

      const suggestedPrice = calculateSuggestedPrice(costPrice, markup);
      expect(suggestedPrice).toBeCloseTo(0.20, 2);
    });
  });

  describe('calculateProfitMargin', () => {
    it('should calculate 20% profit margin', () => {
      const price = 100;
      const costPrice = 80;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(20);
    });

    it('should calculate 50% profit margin', () => {
      const price = 100;
      const costPrice = 50;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(50);
    });

    it('should calculate 0% profit margin (cost equals price)', () => {
      const price = 100;
      const costPrice = 100;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(0);
    });

    it('should return 0 for zero price', () => {
      const price = 0;
      const costPrice = 50;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(0);
    });

    it('should handle negative margin (cost > price)', () => {
      const price = 50;
      const costPrice = 100;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(-100);
    });

    it('should calculate accurate decimals', () => {
      const price = 100;
      const costPrice = 75;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBeCloseTo(25, 2);
    });

    it('should handle large prices', () => {
      const price = 10000;
      const costPrice = 7000;

      const margin = calculateProfitMargin(price, costPrice);
      expect(margin).toBe(30);
    });
  });

  describe('isMarginViable', () => {
    it('should mark margin > 20% as good', () => {
      expect(isMarginViable(25)).toBe('good');
      expect(isMarginViable(50)).toBe('good');
      expect(isMarginViable(100)).toBe('good');
      expect(isMarginViable(20.1)).toBe('good');
    });

    it('should mark margin 10-20% as warning', () => {
      expect(isMarginViable(15)).toBe('warning');
      expect(isMarginViable(10.01)).toBe('warning'); // > 10, not >=
      expect(isMarginViable(20)).toBe('warning');
      expect(isMarginViable(10.5)).toBe('warning');
    });

    it('should mark margin < 10% as poor', () => {
      expect(isMarginViable(5)).toBe('poor');
      expect(isMarginViable(0)).toBe('poor');
      expect(isMarginViable(9.99)).toBe('poor');
      expect(isMarginViable(-10)).toBe('poor');
    });

    it('should handle edge case at 20% boundary', () => {
      expect(isMarginViable(20.0)).toBe('warning');
      expect(isMarginViable(20.01)).toBe('good');
    });

    it('should handle edge case at 10% boundary', () => {
      expect(isMarginViable(10.01)).toBe('warning'); // > 10
      expect(isMarginViable(10.0)).toBe('poor');     // = 10
      expect(isMarginViable(9.99)).toBe('poor');
    });
  });
});

describe('Products Library - Formatting & Display', () => {
  describe('formatPrice', () => {
    it('should format currency in Brazilian Real', () => {
      const formatted = formatPrice(100);
      expect(formatted).toMatch(/R\$/); // Should include currency symbol
      expect(formatted).toMatch(/100/); // Should include the number
    });

    it('should format decimal prices', () => {
      const formatted = formatPrice(50.50);
      expect(formatted).toMatch(/50.*50/); // Should contain the value
    });

    it('should format zero price', () => {
      const formatted = formatPrice(0);
      expect(formatted).toContain('0');
    });

    it('should format large prices', () => {
      const formatted = formatPrice(10000.00);
      expect(formatted).toMatch(/10.*000/); // Number formatting may vary
    });

    it('should format small prices', () => {
      const formatted = formatPrice(0.50);
      expect(formatted).toMatch(/0.*50/);
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return category name with code', () => {
      const category: ProductCategory = {
        id: 'cat-1',
        name: 'Cakes',
        code: 'CAKE',
        description: 'Cake products',
        displayOrder: 1,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
      };

      const displayName = getCategoryDisplayName(category);
      expect(displayName).toBe('Cakes (CAKE)');
    });

    it('should handle categories with spaces in name', () => {
      const category: ProductCategory = {
        id: 'cat-1',
        name: 'Special Cakes',
        code: 'SPECIAL',
        description: '',
        displayOrder: 1,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
      };

      const displayName = getCategoryDisplayName(category);
      expect(displayName).toBe('Special Cakes (SPECIAL)');
    });

    it('should handle long category names', () => {
      const category: ProductCategory = {
        id: 'cat-1',
        name: 'Very Long Category Name',
        code: 'VLN',
        description: '',
        displayOrder: 1,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
      };

      const displayName = getCategoryDisplayName(category);
      expect(displayName).toBe('Very Long Category Name (VLN)');
    });
  });

  describe('getSubcategoryDisplayName', () => {
    it('should return subcategory name with code', () => {
      const subcategory: ProductSubcategory = {
        id: 'subcat-1',
        categoryId: 'cat-1',
        name: 'Vanilla',
        code: 'VAN',
        description: 'Vanilla cakes',
        displayOrder: 1,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
      };

      const displayName = getSubcategoryDisplayName(subcategory);
      expect(displayName).toBe('Vanilla (VAN)');
    });

    it('should handle subcategories with complex names', () => {
      const subcategory: ProductSubcategory = {
        id: 'subcat-1',
        categoryId: 'cat-1',
        name: 'White Chocolate Mousse',
        code: 'WCM',
        description: '',
        displayOrder: 1,
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: 'admin',
      };

      const displayName = getSubcategoryDisplayName(subcategory);
      expect(displayName).toBe('White Chocolate Mousse (WCM)');
    });
  });

  describe('getMarginStatus', () => {
    it('should format good margin with status', () => {
      const status = getMarginStatus(25);
      expect(status).toContain('25.00%');
      expect(status).toContain('good');
    });

    it('should format warning margin with status', () => {
      const status = getMarginStatus(15);
      expect(status).toContain('15.00%');
      expect(status).toContain('warning');
    });

    it('should format poor margin with status', () => {
      const status = getMarginStatus(5);
      expect(status).toContain('5.00%');
      expect(status).toContain('poor');
    });

    it('should format decimal margins with 2 decimals', () => {
      const status = getMarginStatus(15.5);
      expect(status).toContain('15.50%');
    });
  });
});

describe('Products Library - Filter Logic', () => {
  describe('Product filtering scenarios', () => {
    it('should represent filtering by category', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Chocolate Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-001',
          price: 50,
          costPrice: 30,
          suggestedPrice: 45,
          markup: 50,
          profitMargin: 0.4,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '2',
          name: 'Vanilla Cupcake',
          categoryId: 'cat-2',
          categoryName: 'Cupcakes',
          subcategoryId: 'subcat-2',
          subcategoryName: 'Vanilla',
          sku: 'CUP-VAN-001',
          price: 15,
          costPrice: 8,
          suggestedPrice: 12,
          markup: 50,
          profitMargin: 0.47,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
      ];

      const cakeProducts = products.filter(p => p.categoryId === 'cat-1');
      expect(cakeProducts).toHaveLength(1);
      expect(cakeProducts[0].categoryName).toBe('Cakes');
    });

    it('should represent filtering by subcategory', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Chocolate Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-001',
          price: 50,
          costPrice: 30,
          suggestedPrice: 45,
          markup: 50,
          profitMargin: 0.4,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '2',
          name: 'Vanilla Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-2',
          subcategoryName: 'Vanilla',
          sku: 'CAKE-VAN-001',
          price: 45,
          costPrice: 28,
          suggestedPrice: 42,
          markup: 50,
          profitMargin: 0.38,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
      ];

      const vanillaProducts = products.filter(p => p.subcategoryId === 'subcat-2');
      expect(vanillaProducts).toHaveLength(1);
      expect(vanillaProducts[0].subcategoryName).toBe('Vanilla');
    });

    it('should represent filtering by search query', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Chocolate Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-001',
          price: 50,
          costPrice: 30,
          suggestedPrice: 45,
          markup: 50,
          profitMargin: 0.4,
          description: 'Rich chocolate cake',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '2',
          name: 'Vanilla Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-2',
          subcategoryName: 'Vanilla',
          sku: 'CAKE-VAN-001',
          price: 45,
          costPrice: 28,
          suggestedPrice: 42,
          markup: 50,
          profitMargin: 0.38,
          description: 'Classic vanilla cake',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
      ];

      const searchResults = products.filter(p =>
        p.name.toLowerCase().includes('chocolate')
      );
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Chocolate Cake');
    });

    it('should represent filtering only active products', () => {
      const allProducts: Product[] = [
        {
          id: '1',
          name: 'Active Product',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-001',
          price: 50,
          costPrice: 30,
          suggestedPrice: 45,
          markup: 50,
          profitMargin: 0.4,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '2',
          name: 'Deleted Product',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-002',
          price: 45,
          costPrice: 28,
          suggestedPrice: 42,
          markup: 50,
          profitMargin: 0.38,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
      ];

      const activeProducts = allProducts.filter(p => p.isActive);
      expect(activeProducts).toHaveLength(1);
      expect(activeProducts[0].name).toBe('Active Product');
    });

    it('should combine multiple filters', () => {
      const products: Product[] = [
        {
          id: '1',
          name: 'Chocolate Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-1',
          subcategoryName: 'Chocolate',
          sku: 'CAKE-CHOC-001',
          price: 50,
          costPrice: 30,
          suggestedPrice: 45,
          markup: 50,
          profitMargin: 0.4,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '2',
          name: 'Chocolate Cupcake',
          categoryId: 'cat-2',
          categoryName: 'Cupcakes',
          subcategoryId: 'subcat-3',
          subcategoryName: 'Chocolate',
          sku: 'CUP-CHOC-001',
          price: 12,
          costPrice: 6,
          suggestedPrice: 9,
          markup: 50,
          profitMargin: 0.5,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
        {
          id: '3',
          name: 'Vanilla Cake',
          categoryId: 'cat-1',
          categoryName: 'Cakes',
          subcategoryId: 'subcat-2',
          subcategoryName: 'Vanilla',
          sku: 'CAKE-VAN-001',
          price: 45,
          costPrice: 28,
          suggestedPrice: 42,
          markup: 50,
          profitMargin: 0.38,
          description: '',
          productRecipes: [],
          productPackages: [],
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'admin',
        },
      ];

      const filtered = products.filter(
        p => p.categoryId === 'cat-1' && p.name.includes('Chocolate')
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });
});
