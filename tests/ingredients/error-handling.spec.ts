import { test, expect } from '@playwright/test';
import { IngredientsPage, IngredientsAPI } from '../helpers/ingredients';
import { SuppliersAPI } from '../helpers/suppliers';
import { AuthHelper } from '../helpers/auth';
import { testIngredients } from '../fixtures/ingredients';

test.describe('Error Handling', () => {
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
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created ingredients
    for (const ingredient of createdIngredients) {
      try {
        await ingredientsAPI.deleteIngredient(ingredient.id);
      } catch (error) {
        console.warn('Failed to cleanup ingredient:', ingredient.id);
      }
    }
    createdIngredients = [];

    // Cleanup created suppliers
    for (const supplier of createdSuppliers) {
      try {
        await suppliersAPI.deleteSupplier(supplier.id);
      } catch (error) {
        console.warn('Failed to cleanup supplier:', supplier.id);
      }
    }
    createdSuppliers = [];
  });

  test.describe('Network Errors', () => {
    test('should handle network failure gracefully', async () => {
      await ingredientsPage.navigateToIngredients();

      // Simulate network failure by going offline
      await ingredientsPage.page.context().setOffline(true);

      // Try to create an ingredient
      await ingredientsPage.navigateToNewIngredient();
      await ingredientsPage.fillIngredientForm({
        name: 'Test Offline',
        unit: 'kg',
        currentPrice: '10.00',
        currentStock: '20',
        minStock: '5',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show network error message
      await ingredientsPage.expectErrorMessage('Erro de conexão');

      // Restore network
      await ingredientsPage.page.context().setOffline(false);
    });

    test('should retry failed requests', async () => {
      await ingredientsPage.navigateToIngredients();

      // Intercept API request to simulate temporary failure
      let requestCount = 0;
      await ingredientsPage.page.route('/api/ingredients', route => {
        requestCount++;
        if (requestCount === 1) {
          // Fail first request
          route.abort('failed');
        } else {
          // Allow subsequent requests
          route.continue();
        }
      });

      // Try to load ingredients
      await ingredientsPage.page.reload();

      // Should eventually load after retry
      await ingredientsPage.page.waitForLoadState('networkidle');
      
      // Verify retry happened
      expect(requestCount).toBeGreaterThan(1);
    });

    test('should handle slow network gracefully', async () => {
      await ingredientsPage.navigateToIngredients();

      // Simulate slow network
      await ingredientsPage.page.route('/api/ingredients', route => {
        setTimeout(() => {
          route.continue();
        }, 3000); // 3 second delay
      });

      // Navigate to ingredients - should show loading state
      await ingredientsPage.page.goto('/ingredients');
      
      // Should show loading indicator
      await expect(ingredientsPage.page.locator('text="Carregando ingredientes"')).toBeVisible();

      // Should eventually load
      await ingredientsPage.page.waitForLoadState('networkidle', { timeout: 10000 });
    });
  });

  test.describe('API Errors', () => {
    test('should handle 400 validation errors', async () => {
      await ingredientsPage.navigateToNewIngredient();

      // Mock API to return validation error
      await ingredientsPage.page.route('/api/ingredients', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Preço deve ser positivo' })
          });
        } else {
          route.continue();
        }
      });

      await ingredientsPage.fillIngredientForm({
        name: 'Test Error',
        unit: 'kg',
        currentPrice: '10.00',
        currentStock: '20',
        minStock: '5',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show validation error
      await ingredientsPage.expectErrorMessage('Preço deve ser positivo');
    });

    test('should handle 409 conflict errors', async () => {
      await ingredientsPage.navigateToNewIngredient();

      // Mock API to return conflict error
      await ingredientsPage.page.route('/api/ingredients', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Já existe um ingrediente com esse nome' })
          });
        } else {
          route.continue();
        }
      });

      await ingredientsPage.fillIngredientForm({
        name: 'Duplicate Name',
        unit: 'kg',
        currentPrice: '10.00',
        currentStock: '20',
        minStock: '5',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show conflict error
      await ingredientsPage.expectErrorMessage('Já existe um ingrediente com esse nome');
    });

    test('should handle 500 server errors', async () => {
      await ingredientsPage.navigateToNewIngredient();

      // Mock API to return server error
      await ingredientsPage.page.route('/api/ingredients', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Erro interno do servidor' })
          });
        } else {
          route.continue();
        }
      });

      await ingredientsPage.fillIngredientForm({
        name: 'Server Error Test',
        unit: 'kg',
        currentPrice: '10.00',
        currentStock: '20',
        minStock: '5',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show server error
      await ingredientsPage.expectErrorMessage('Erro interno do servidor');
    });

    test('should handle 404 not found errors', async () => {
      // Create an ingredient first
      const ingredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(ingredient);

      await ingredientsPage.navigateToIngredients();

      // Mock API to return 404 for update request
      await ingredientsPage.page.route(`/api/ingredients/${ingredient.id}`, route => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Ingrediente não encontrado' })
          });
        } else {
          route.continue();
        }
      });

      // Try to edit the ingredient
      await ingredientsPage.clickEditIngredient(ingredient.name);
      await ingredientsPage.page.fill('[data-testid="ingredient-name"]', 'Updated Name');
      await ingredientsPage.submitIngredientForm();

      // Should show not found error
      await ingredientsPage.expectErrorMessage('Ingrediente não encontrado');
    });
  });

  test.describe('Database Errors', () => {
    test('should handle database connection errors', async () => {
      await ingredientsPage.navigateToIngredients();

      // Mock API to simulate database connection error
      await ingredientsPage.page.route('/api/ingredients', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Serviço temporariamente indisponível' })
        });
      });

      await ingredientsPage.page.reload();

      // Should show database error
      await ingredientsPage.expectErrorMessage('Serviço temporariamente indisponível');
    });

    test('should handle constraint violations', async () => {
      // Create a supplier
      const supplier = await suppliersAPI.createSupplier({
        name: 'Test Supplier',
        email: 'test@supplier.com',
        phone: '(11) 1234-5678',
        address: 'Test Address',
        isActive: true
      });
      createdSuppliers.push(supplier);

      // Create ingredient with supplier
      const ingredient = await ingredientsAPI.createIngredient({
        ...testIngredients[0],
        supplierId: supplier.id
      });
      createdIngredients.push(ingredient);

      await ingredientsPage.page.goto('/suppliers');

      // Mock API to return constraint violation when trying to delete supplier
      await ingredientsPage.page.route(`/api/suppliers/${supplier.id}`, route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Não é possível excluir fornecedor com ingredientes vinculados' })
          });
        } else {
          route.continue();
        }
      });

      // Try to delete supplier
      const suppliersPage = new (await import('../helpers/suppliers')).SuppliersPage(ingredientsPage.page);
      await suppliersPage.clickDeleteSupplier(supplier.name);
      await suppliersPage.confirmDelete();

      // Should show constraint error
      await suppliersPage.expectErrorMessage('Não é possível excluir fornecedor com ingredientes vinculados');
    });
  });

  test.describe('Authentication Errors', () => {
    test('should handle authentication expiration', async () => {
      await ingredientsPage.navigateToIngredients();

      // Mock API to return authentication error
      await ingredientsPage.page.route('/api/ingredients', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Token expirado' })
        });
      });

      await ingredientsPage.page.reload();

      // Should redirect to login or show auth error
      await expect(async () => {
        await expect(ingredientsPage.page).toHaveURL(/\/login/);
      }).toPass({ timeout: 10000 });
    });

    test('should handle insufficient permissions', async () => {
      await ingredientsPage.navigateToIngredients();

      // Mock API to return permission error
      await ingredientsPage.page.route('/api/ingredients', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Acesso negado' })
          });
        } else {
          route.continue();
        }
      });

      await ingredientsPage.navigateToNewIngredient();
      await ingredientsPage.fillIngredientForm({
        name: 'Permission Test',
        unit: 'kg',
        currentPrice: '10.00',
        currentStock: '20',
        minStock: '5',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show permission error
      await ingredientsPage.expectErrorMessage('Acesso negado');
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should validate required fields', async () => {
      await ingredientsPage.navigateToNewIngredient();

      // Submit empty form
      await ingredientsPage.submitIngredientForm();

      // Should show multiple validation errors
      await ingredientsPage.expectErrorMessage('Nome é obrigatório');
      await expect(ingredientsPage.page.locator('[data-testid="ingredient-name"]')).toHaveAttribute('aria-invalid', 'true');
    });

    test('should validate numeric fields', async () => {
      await ingredientsPage.navigateToNewIngredient();

      // Fill with invalid numeric values
      await ingredientsPage.fillIngredientForm({
        name: 'Test Validation',
        unit: 'kg',
        currentPrice: 'invalid-price',
        currentStock: '-10',
        minStock: 'not-a-number',
        category: 'other'
      });

      await ingredientsPage.submitIngredientForm();

      // Should show validation errors
      await ingredientsPage.expectErrorMessage('Preço deve ser um número válido');
      await ingredientsPage.expectErrorMessage('Estoque deve ser positivo');
    });

    test('should validate email format in supplier', async () => {
      await ingredientsPage.page.goto('/suppliers/new');

      const suppliersPage = new (await import('../helpers/suppliers')).SuppliersPage(ingredientsPage.page);
      
      await suppliersPage.fillSupplierForm({
        name: 'Test Supplier',
        email: 'invalid-email',
        phone: '(11) 1234-5678',
        address: 'Test Address'
      });

      await suppliersPage.submitSupplierForm();

      // Should show email validation error
      await suppliersPage.expectErrorMessage('Email inválido');
    });
  });

  test.describe('Stock Management Errors', () => {
    test('should handle insufficient stock errors', async () => {
      // Create ingredient with low stock
      const ingredient = await ingredientsAPI.createIngredient({
        ...testIngredients[2], // Leite Integral has 3 stock
      });
      createdIngredients.push(ingredient);

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(ingredient.name);

      // Try to remove more stock than available
      await ingredientsPage.removeStock(10); // More than 3 available

      // Should show insufficient stock error
      await ingredientsPage.expectErrorMessage('Quantidade insuficiente em estoque');
    });

    test('should handle negative stock adjustment errors', async () => {
      const ingredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(ingredient);

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(ingredient.name);

      // Try to set negative stock
      await ingredientsPage.adjustStock(-5);

      // Should show validation error
      await ingredientsPage.expectErrorMessage('Quantidade deve ser positiva');
    });
  });

  test.describe('File Upload Errors', () => {
    test('should handle invalid file format errors', async () => {
      await ingredientsPage.navigateToIngredients();

      // If there's an import functionality, test invalid file format
      const importButton = ingredientsPage.page.locator('button:has-text("Importar")');
      if (await importButton.isVisible()) {
        await importButton.click();

        // Upload invalid file (if file upload exists)
        const fileInput = ingredientsPage.page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Create a text file instead of CSV/Excel
          await fileInput.setInputFiles({
            name: 'invalid.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('invalid content')
          });

          // Should show format error
          await ingredientsPage.expectErrorMessage('Formato de arquivo inválido');
        }
      }
    });

    test('should handle file size limit errors', async () => {
      await ingredientsPage.navigateToIngredients();

      const importButton = ingredientsPage.page.locator('button:has-text("Importar")');
      if (await importButton.isVisible()) {
        await importButton.click();

        const fileInput = ingredientsPage.page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Create a large file
          const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
          await fileInput.setInputFiles({
            name: 'large-file.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(largeContent)
          });

          // Should show size limit error
          await ingredientsPage.expectErrorMessage('Arquivo muito grande');
        }
      }
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should handle browser storage errors', async () => {
      // Mock localStorage to throw error
      await ingredientsPage.page.addInitScript(() => {
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function() {
          throw new Error('Storage quota exceeded');
        };
      });

      await ingredientsPage.navigateToIngredients();

      // Apply some filters that might use localStorage
      await ingredientsPage.searchIngredients('test');

      // Should handle storage error gracefully (not crash)
      await ingredientsPage.page.waitForLoadState('networkidle');
    });
  });

  test.describe('Race Conditions', () => {
    test('should handle concurrent modifications', async () => {
      const ingredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(ingredient);

      await ingredientsPage.navigateToIngredients();

      // Start editing ingredient
      await ingredientsPage.clickEditIngredient(ingredient.name);

      // Simulate concurrent modification via API
      await ingredientsAPI.updateIngredient(ingredient.id, {
        name: 'Modified by Another User'
      });

      // Try to submit changes
      await ingredientsPage.page.fill('[data-testid="ingredient-name"]', 'My Changes');
      await ingredientsPage.submitIngredientForm();

      // Should handle conflict gracefully
      await ingredientsPage.expectErrorMessage('Ingrediente foi modificado por outro usuário');
    });
  });
});