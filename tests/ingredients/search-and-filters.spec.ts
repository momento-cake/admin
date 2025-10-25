import { test, expect } from '@playwright/test';
import { IngredientsPage, IngredientsAPI } from '../helpers/ingredients';
import { SuppliersAPI } from '../helpers/suppliers';
import { AuthHelper } from '../helpers/auth';
import { testIngredients, testSuppliers, searchAndFilterData } from '../fixtures/ingredients';

test.describe('Search and Filters', () => {
  let ingredientsPage: IngredientsPage;
  let ingredientsAPI: IngredientsAPI;
  let suppliersAPI: SuppliersAPI;
  let authHelper: AuthHelper;
  let createdIngredients: any[] = [];
  let createdSuppliers: any[] = [];

  test.beforeEach(async ({ page }) => {
    ingredientsPage = new IngredientsPage(page);
    ingredientsAPI = new IngredientsAPI(page);
    suppliersAPI = new SuppliersAPI(page);
    authHelper = new AuthHelper(page);

    // Setup authentication
    await authHelper.setupAuth();

    // Create test suppliers first
    for (const supplierData of testSuppliers) {
      const supplier = await suppliersAPI.createSupplier(supplierData);
      createdSuppliers.push(supplier);
    }

    // Create test ingredients with suppliers
    for (let i = 0; i < testIngredients.length; i++) {
      const ingredientData = {
        ...testIngredients[i],
        supplierId: i < 2 ? createdSuppliers[0].id : createdSuppliers[1].id
      };
      const ingredient = await ingredientsAPI.createIngredient(ingredientData);
      createdIngredients.push(ingredient);
    }
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created ingredients first
    for (const ingredient of createdIngredients) {
      try {
        await ingredientsAPI.deleteIngredient(ingredient.id);
      } catch (error) {
        console.warn('Failed to cleanup ingredient:', ingredient.id);
      }
    }
    createdIngredients = [];

    // Then cleanup suppliers
    for (const supplier of createdSuppliers) {
      try {
        await suppliersAPI.deleteSupplier(supplier.id);
      } catch (error) {
        console.warn('Failed to cleanup supplier:', supplier.id);
      }
    }
    createdSuppliers = [];
  });

  test.describe('Search Functionality', () => {
    test('should search by ingredient name', async () => {
      await ingredientsPage.navigateToIngredients();

      // Search for "farinha"
      await ingredientsPage.searchIngredients('farinha');

      // Should show only flour ingredients
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientNotVisible('Açúcar Cristal');
      await ingredientsPage.expectIngredientNotVisible('Leite Integral');
    });

    test('should search by ingredient description', async () => {
      await ingredientsPage.navigateToIngredients();

      // Search for "especial" (in description)
      await ingredientsPage.searchIngredients('especial');

      // Should show ingredients with "especial" in name or description
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientVisible('Açúcar Cristal');
    });

    test('should perform case-insensitive search', async () => {
      await ingredientsPage.navigateToIngredients();

      // Search with different cases
      await ingredientsPage.searchIngredients('FARINHA');
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');

      await ingredientsPage.searchIngredients('açúcar');
      await ingredientsPage.expectIngredientVisible('Açúcar Cristal');
    });

    test('should handle partial matches', async () => {
      await ingredientsPage.navigateToIngredients();

      // Search for partial text
      await ingredientsPage.searchIngredients('choco');
      await ingredientsPage.expectIngredientVisible('Chocolate em Pó');
      await ingredientsPage.expectIngredientNotVisible('Farinha de Trigo Especial');
    });

    test('should show no results for non-existent search', async () => {
      await ingredientsPage.navigateToIngredients();

      // Search for non-existent ingredient
      await ingredientsPage.searchIngredients('ingrediente-inexistente');
      await ingredientsPage.expectIngredientCount(0);
      await ingredientsPage.expectEmptyState();
    });

    test('should clear search results', async () => {
      await ingredientsPage.navigateToIngredients();

      // Perform search
      await ingredientsPage.searchIngredients('farinha');
      await ingredientsPage.expectIngredientCount(1);

      // Clear search
      await ingredientsPage.searchIngredients('');
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });
  });

  test.describe('Category Filter', () => {
    test('should filter by each category', async () => {
      await ingredientsPage.navigateToIngredients();

      for (const category of searchAndFilterData.categories) {
        await ingredientsPage.filterByCategory(category);
        
        // Should show only ingredients of that category
        const expectedIngredients = testIngredients.filter(ing => ing.category === category);
        await ingredientsPage.expectIngredientCount(expectedIngredients.length);
        
        for (const ingredient of expectedIngredients) {
          await ingredientsPage.expectIngredientVisible(ingredient.name);
        }
      }
    });

    test('should show all categories when "all" is selected', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply a filter first
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.expectIngredientCount(1);

      // Select "all"
      await ingredientsPage.filterByCategory('all');
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });

    test('should persist category filter with search', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply category filter
      await ingredientsPage.filterByCategory('dairy');
      
      // Then search within filtered results
      await ingredientsPage.searchIngredients('leite');
      
      // Should show only dairy ingredients matching search
      await ingredientsPage.expectIngredientVisible('Leite Integral');
      await ingredientsPage.expectIngredientCount(1);
    });
  });

  test.describe('Supplier Filter', () => {
    test('should filter by supplier', async () => {
      await ingredientsPage.navigateToIngredients();

      // Filter by first supplier
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);
      
      // Should show only ingredients from first supplier (first 2 ingredients)
      await ingredientsPage.expectIngredientCount(2);
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientVisible('Açúcar Cristal');
      await ingredientsPage.expectIngredientNotVisible('Leite Integral');
    });

    test('should show all suppliers when "all" is selected', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply supplier filter
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);
      await ingredientsPage.expectIngredientCount(2);

      // Select "all"
      await ingredientsPage.filterBySupplier('all');
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });

    test('should handle ingredients without suppliers', async () => {
      // Create ingredient without supplier
      const ingredientWithoutSupplier = await ingredientsAPI.createIngredient({
        ...testIngredients[0],
        name: 'Ingrediente Sem Fornecedor',
        supplierId: null
      });
      createdIngredients.push(ingredientWithoutSupplier);

      await ingredientsPage.navigateToIngredients();

      // Filter by a specific supplier
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);
      
      // Ingredient without supplier should not be shown
      await ingredientsPage.expectIngredientNotVisible('Ingrediente Sem Fornecedor');
    });
  });

  test.describe('Stock Status Filter', () => {
    test('should filter by each stock status', async () => {
      await ingredientsPage.navigateToIngredients();

      // Test each stock status
      for (const status of searchAndFilterData.stockStatuses) {
        await ingredientsPage.filterByStockStatus(status);
        
        // Verify appropriate ingredients are shown
        switch (status) {
          case 'good':
            await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial'); // 25 >= 5
            await ingredientsPage.expectIngredientVisible('Açúcar Cristal'); // 50 >= 10
            break;
          case 'low':
            await ingredientsPage.expectIngredientVisible('Leite Integral'); // 3 < 15
            break;
          case 'out':
            await ingredientsPage.expectIngredientVisible('Ovos Grandes'); // 0
            break;
          case 'critical':
            // Would need ingredients with stock > 0 but very low
            break;
        }
      }
    });

    test('should show all statuses when "all" is selected', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply stock status filter
      await ingredientsPage.filterByStockStatus('good');
      
      // Select "all"
      await ingredientsPage.filterByStockStatus('all');
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply multiple filters simultaneously', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply category and supplier filters
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);
      
      // Should show only flour from first supplier
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientCount(1);
    });

    test('should combine search with filters', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply filter then search
      await ingredientsPage.filterByCategory('dairy');
      await ingredientsPage.searchIngredients('leite');
      
      // Should show only dairy ingredients matching search
      await ingredientsPage.expectIngredientVisible('Leite Integral');
      await ingredientsPage.expectIngredientCount(1);
    });

    test('should show filter badges for active filters', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply multiple filters
      await ingredientsPage.searchIngredients('farinha');
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);

      // Verify filter badges are shown
      await expect(ingredientsPage.page.locator('text="Busca: farinha"')).toBeVisible();
      await expect(ingredientsPage.page.locator('text="Farinha"')).toBeVisible();
      await expect(ingredientsPage.page.locator(`text="${createdSuppliers[0].name}"`)).toBeVisible();
    });

    test('should clear all filters at once', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply multiple filters
      await ingredientsPage.searchIngredients('test');
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.filterBySupplier(createdSuppliers[0].id);
      
      // Clear all filters
      await ingredientsPage.clearFilters();
      
      // Should show all ingredients
      await ingredientsPage.expectIngredientCount(testIngredients.length);
      
      // Filter badges should be hidden
      await expect(ingredientsPage.page.locator('.flex.flex-wrap.gap-2')).not.toBeVisible();
    });
  });

  test.describe('Filter Persistence', () => {
    test('should maintain filters when switching view modes', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply filter
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.expectIngredientCount(1);

      // Switch to list view
      await ingredientsPage.switchToListView();
      await ingredientsPage.expectIngredientCount(1);

      // Switch back to grid view
      await ingredientsPage.switchToGridView();
      await ingredientsPage.expectIngredientCount(1);
    });

    test('should reset filters when navigating away and back', async () => {
      await ingredientsPage.navigateToIngredients();

      // Apply filter
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.expectIngredientCount(1);

      // Navigate to different page
      await ingredientsPage.page.goto('/suppliers');
      await ingredientsPage.page.waitForLoadState('networkidle');

      // Navigate back
      await ingredientsPage.navigateToIngredients();

      // Filters should be reset
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });
  });

  test.describe('Debounced Search', () => {
    test('should debounce search input', async () => {
      await ingredientsPage.navigateToIngredients();

      // Type quickly
      const searchInput = ingredientsPage.page.locator('input[placeholder*="Buscar ingredientes"]');
      await searchInput.type('f');
      await searchInput.type('a');
      await searchInput.type('r');
      await searchInput.type('i');
      await searchInput.type('n');
      await searchInput.type('h');
      await searchInput.type('a');

      // Wait for debounce
      await ingredientsPage.page.waitForTimeout(400);
      await ingredientsPage.page.waitForLoadState('networkidle');

      // Should show search results
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientCount(1);
    });
  });

  test.describe('Performance with Large Dataset', () => {
    test('should handle many ingredients efficiently', async () => {
      // Create additional ingredients for performance testing
      const additionalIngredients = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient = await ingredientsAPI.createIngredient({
          name: `Ingrediente Teste ${i}`,
          unit: 'kg',
          currentPrice: Math.random() * 20 + 5,
          currentStock: Math.floor(Math.random() * 100),
          minStock: Math.floor(Math.random() * 10) + 1,
          category: 'other',
          isActive: true
        });
        additionalIngredients.push(ingredient);
        createdIngredients.push(ingredient);
      }

      const startTime = Date.now();
      await ingredientsPage.navigateToIngredients();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Should show all ingredients
      await ingredientsPage.expectIngredientCount(testIngredients.length + 20);

      // Search should still be fast
      const searchStartTime = Date.now();
      await ingredientsPage.searchIngredients('Ingrediente Teste 1');
      const searchTime = Date.now() - searchStartTime;

      expect(searchTime).toBeLessThan(2000);
    });
  });
});