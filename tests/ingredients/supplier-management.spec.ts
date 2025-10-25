import { test, expect } from '@playwright/test';
import { SuppliersPage, SuppliersAPI } from '../helpers/suppliers';
import { IngredientsAPI } from '../helpers/ingredients';
import { AuthHelper } from '../helpers/auth';
import { testSuppliers, testIngredients } from '../fixtures/ingredients';

test.describe('Supplier Management', () => {
  let suppliersPage: SuppliersPage;
  let suppliersAPI: SuppliersAPI;
  let ingredientsAPI: IngredientsAPI;
  let authHelper: AuthHelper;
  let createdSuppliers: any[] = [];
  let createdIngredients: any[] = [];

  test.beforeEach(async ({ page }) => {
    suppliersPage = new SuppliersPage(page);
    suppliersAPI = new SuppliersAPI(page);
    ingredientsAPI = new IngredientsAPI(page);
    authHelper = new AuthHelper(page);

    // Setup authentication
    await authHelper.setupAuth();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created ingredients first (due to foreign key constraints)
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

  test.describe('Create Supplier', () => {
    test('should create a new supplier successfully', async () => {
      const supplierData = {
        name: 'Novo Fornecedor Teste',
        email: 'novo@fornecedor.com',
        phone: '(11) 9999-8888',
        address: 'Rua Nova, 789',
        notes: 'Fornecedor criado via teste E2E'
      };

      await suppliersPage.navigateToNewSupplier();
      
      // Fill and submit form
      await suppliersPage.fillSupplierForm(supplierData);
      await suppliersPage.submitSupplierForm();
      
      // Verify success - should navigate back to suppliers list
      await expect(suppliersPage.page).toHaveURL('/suppliers');
      
      // Verify supplier appears in list
      await suppliersPage.expectSuccessMessage('Fornecedor criado com sucesso');
      await suppliersPage.expectSupplierVisible(supplierData.name);
      
      // Store for cleanup
      const suppliers = await suppliersAPI.getSuppliers();
      const createdSupplier = suppliers.suppliers.find((s: any) => s.name === supplierData.name);
      if (createdSupplier) {
        createdSuppliers.push(createdSupplier);
      }
    });

    test('should validate required fields', async () => {
      await suppliersPage.navigateToNewSupplier();
      
      // Try to submit empty form
      await suppliersPage.submitSupplierForm();
      
      // Verify validation errors
      await suppliersPage.expectErrorMessage('Nome é obrigatório');
      await suppliersPage.expectErrorMessage('Email é obrigatório');
      
      // Should stay on form page
      await expect(suppliersPage.page).toHaveURL('/suppliers/new');
    });

    test('should validate email format', async () => {
      await suppliersPage.navigateToNewSupplier();
      
      const invalidSupplierData = {
        name: 'Fornecedor Teste',
        email: 'email-invalido', // Invalid email format
        phone: '(11) 1234-5678',
        address: 'Endereço teste'
      };
      
      await suppliersPage.fillSupplierForm(invalidSupplierData);
      await suppliersPage.submitSupplierForm();
      
      // Verify validation error
      await suppliersPage.expectErrorMessage('Email inválido');
    });

    test('should prevent creating duplicate suppliers', async () => {
      // First create a supplier via API
      const supplier = await suppliersAPI.createSupplier(testSuppliers[0]);
      createdSuppliers.push(supplier);
      
      await suppliersPage.navigateToNewSupplier();
      
      // Try to create supplier with same email
      await suppliersPage.fillSupplierForm({
        name: 'Fornecedor Diferente',
        email: testSuppliers[0].email, // Same email
        phone: '(11) 8888-9999',
        address: 'Endereço diferente'
      });
      await suppliersPage.submitSupplierForm();
      
      // Verify error message
      await suppliersPage.expectErrorMessage('Já existe um fornecedor com esse email');
    });

    test('should cancel supplier creation', async () => {
      await suppliersPage.navigateToNewSupplier();
      
      // Fill form partially
      await suppliersPage.page.fill('[data-testid="supplier-name"]', 'Test Cancel');
      
      // Click cancel
      await suppliersPage.clickCancelForm();
      
      // Should navigate back to suppliers list
      await expect(suppliersPage.page).toHaveURL('/suppliers');
    });
  });

  test.describe('Read Suppliers', () => {
    test.beforeEach(async () => {
      // Create test suppliers
      for (const supplierData of testSuppliers) {
        const supplier = await suppliersAPI.createSupplier(supplierData);
        createdSuppliers.push(supplier);
      }
    });

    test('should display all suppliers', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Verify suppliers are displayed
      await suppliersPage.expectSupplierCount(testSuppliers.length);
      
      for (const supplier of testSuppliers) {
        await suppliersPage.expectSupplierVisible(supplier.name);
      }
    });

    test('should search suppliers by name', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Search for specific supplier
      await suppliersPage.searchSuppliers('Fornecedor Teste A');
      
      // Should show only matching suppliers
      await suppliersPage.expectSupplierVisible('Fornecedor Teste A');
      await suppliersPage.expectSupplierNotVisible('Fornecedor Teste B');
    });

    test('should search suppliers by email', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Search by email
      await suppliersPage.searchSuppliers('teste-a@fornecedor.com');
      
      // Should show only matching suppliers
      await suppliersPage.expectSupplierVisible('Fornecedor Teste A');
      await suppliersPage.expectSupplierNotVisible('Fornecedor Teste B');
    });

    test('should show empty state when no suppliers exist', async () => {
      // Delete all test suppliers
      for (const supplier of createdSuppliers) {
        await suppliersAPI.deleteSupplier(supplier.id);
      }
      createdSuppliers = [];

      await suppliersPage.navigateToSuppliers();
      
      // Verify empty state is shown
      await suppliersPage.expectEmptyState();
      await suppliersPage.expectSupplierCount(0);
    });
  });

  test.describe('Update Supplier', () => {
    let testSupplier: any;

    test.beforeEach(async () => {
      // Create a test supplier
      testSupplier = await suppliersAPI.createSupplier(testSuppliers[0]);
      createdSuppliers.push(testSupplier);
    });

    test('should update supplier successfully', async () => {
      const updatedData = {
        name: 'Fornecedor Atualizado',
        email: 'atualizado@fornecedor.com',
        phone: '(11) 5555-4444',
        address: 'Endereço Atualizado, 999',
        notes: 'Informações atualizadas'
      };

      await suppliersPage.navigateToSuppliers();
      
      // Click edit on the supplier
      await suppliersPage.clickEditSupplier(testSupplier.name);
      
      // Fill updated data
      await suppliersPage.fillSupplierForm(updatedData);
      
      // Submit form
      await suppliersPage.submitSupplierForm();
      
      // Verify success
      await suppliersPage.expectSuccessMessage('Fornecedor atualizado com sucesso');
      await suppliersPage.expectSupplierVisible(updatedData.name);
      await suppliersPage.expectSupplierNotVisible(testSupplier.name);
    });

    test('should validate updated supplier data', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Click edit on the supplier
      await suppliersPage.clickEditSupplier(testSupplier.name);
      
      // Clear required field
      await suppliersPage.page.fill('[data-testid="supplier-name"]', '');
      await suppliersPage.submitSupplierForm();
      
      // Verify validation error
      await suppliersPage.expectErrorMessage('Nome é obrigatório');
    });

    test('should cancel supplier update', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Click edit on the supplier
      await suppliersPage.clickEditSupplier(testSupplier.name);
      
      // Make changes
      await suppliersPage.page.fill('[data-testid="supplier-name"]', 'Changed Name');
      
      // Cancel
      await suppliersPage.clickCancelForm();
      
      // Should show original supplier name
      await suppliersPage.expectSupplierVisible(testSupplier.name);
      await suppliersPage.expectSupplierNotVisible('Changed Name');
    });
  });

  test.describe('Delete Supplier', () => {
    let testSupplier: any;

    test.beforeEach(async () => {
      // Create a test supplier
      testSupplier = await suppliersAPI.createSupplier(testSuppliers[0]);
      createdSuppliers.push(testSupplier);
    });

    test('should delete supplier successfully when no ingredients are linked', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Click delete on the supplier
      await suppliersPage.clickDeleteSupplier(testSupplier.name);
      
      // Confirm deletion
      await suppliersPage.confirmDelete();
      
      // Verify success
      await suppliersPage.expectSuccessMessage('Fornecedor excluído com sucesso');
      await suppliersPage.expectSupplierNotVisible(testSupplier.name);
      
      // Remove from cleanup array since it's already deleted
      createdSuppliers = createdSuppliers.filter(s => s.id !== testSupplier.id);
    });

    test('should prevent deletion when ingredients are linked', async () => {
      // Create an ingredient linked to the supplier
      const ingredientData = { ...testIngredients[0], supplierId: testSupplier.id };
      const ingredient = await ingredientsAPI.createIngredient(ingredientData);
      createdIngredients.push(ingredient);

      await suppliersPage.navigateToSuppliers();
      
      // Click delete on the supplier
      await suppliersPage.clickDeleteSupplier(testSupplier.name);
      
      // Confirm deletion
      await suppliersPage.confirmDelete();
      
      // Verify error message
      await suppliersPage.expectErrorMessage('Não é possível excluir fornecedor com ingredientes vinculados');
      
      // Supplier should still be visible
      await suppliersPage.expectSupplierVisible(testSupplier.name);
    });

    test('should cancel supplier deletion', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Click delete on the supplier
      await suppliersPage.clickDeleteSupplier(testSupplier.name);
      
      // Cancel deletion
      await suppliersPage.cancelDelete();
      
      // Supplier should still be visible
      await suppliersPage.expectSupplierVisible(testSupplier.name);
    });
  });

  test.describe('Supplier-Ingredient Integration', () => {
    let testSupplier: any;

    test.beforeEach(async () => {
      // Create test supplier
      testSupplier = await suppliersAPI.createSupplier(testSuppliers[0]);
      createdSuppliers.push(testSupplier);
    });

    test('should create ingredient with supplier', async () => {
      // Navigate to ingredients page
      await suppliersPage.page.goto('/ingredients/new');
      
      // Fill ingredient form with supplier
      await suppliersPage.page.fill('[data-testid="ingredient-name"]', 'Ingrediente com Fornecedor');
      await suppliersPage.page.fill('[data-testid="ingredient-price"]', '10.50');
      await suppliersPage.page.fill('[data-testid="ingredient-current-stock"]', '20');
      await suppliersPage.page.fill('[data-testid="ingredient-min-stock"]', '5');
      
      // Select unit
      await suppliersPage.page.locator('[data-testid="ingredient-unit"]').click();
      await suppliersPage.page.locator('[data-value="kg"]').click();
      
      // Select category
      await suppliersPage.page.locator('[data-testid="ingredient-category"]').click();
      await suppliersPage.page.locator('[data-value="other"]').click();
      
      // Select supplier
      await suppliersPage.page.locator('[data-testid="ingredient-supplier"]').click();
      await suppliersPage.page.locator(`[data-value="${testSupplier.id}"]`).click();
      
      // Submit form
      await suppliersPage.page.click('button[type="submit"]');
      
      // Verify ingredient was created with supplier
      await expect(suppliersPage.page).toHaveURL('/ingredients');
      
      // Store for cleanup
      const ingredients = await ingredientsAPI.getIngredients({ 
        searchQuery: 'Ingrediente com Fornecedor' 
      });
      if (ingredients.ingredients.length > 0) {
        createdIngredients.push(ingredients.ingredients[0]);
      }
    });

    test('should filter ingredients by supplier', async () => {
      // Create ingredients with different suppliers
      const ingredient1 = await ingredientsAPI.createIngredient({ 
        ...testIngredients[0], 
        supplierId: testSupplier.id 
      });
      const ingredient2 = await ingredientsAPI.createIngredient({ 
        ...testIngredients[1], 
        supplierId: null 
      });
      createdIngredients.push(ingredient1, ingredient2);

      await suppliersPage.page.goto('/ingredients');
      
      // Filter by supplier
      await suppliersPage.page.locator('[data-testid="supplier-filter"]').first().click();
      await suppliersPage.page.locator(`[data-value="${testSupplier.id}"]`).click();
      
      // Should show only ingredients from that supplier
      await expect(suppliersPage.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredient1.name}")`)).toBeVisible();
      await expect(suppliersPage.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredient2.name}")`)).not.toBeVisible();
    });

    test('should display supplier information in ingredient details', async () => {
      // Create ingredient with supplier
      const ingredient = await ingredientsAPI.createIngredient({ 
        ...testIngredients[0], 
        supplierId: testSupplier.id 
      });
      createdIngredients.push(ingredient);

      await suppliersPage.page.goto('/ingredients');
      
      // Click on ingredient card
      await suppliersPage.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredient.name}")`).click();
      
      // Should display supplier information
      await expect(suppliersPage.page.locator(`text="${testSupplier.name}"`)).toBeVisible();
    });
  });

  test.describe('Supplier Detail View', () => {
    let testSupplier: any;

    test.beforeEach(async () => {
      testSupplier = await suppliersAPI.createSupplier(testSuppliers[0]);
      createdSuppliers.push(testSupplier);
    });

    test('should view supplier details', async () => {
      await suppliersPage.navigateToSuppliers();
      
      // Click on supplier card
      await suppliersPage.clickSupplierCard(testSupplier.name);
      
      // Should display supplier details
      await expect(suppliersPage.page.locator('h1')).toContainText(testSupplier.name);
      await expect(suppliersPage.page.locator(`text="${testSupplier.email}"`)).toBeVisible();
      await expect(suppliersPage.page.locator(`text="${testSupplier.phone}"`)).toBeVisible();
      await expect(suppliersPage.page.locator(`text="${testSupplier.address}"`)).toBeVisible();
    });

    test('should show linked ingredients in supplier detail', async () => {
      // Create ingredient linked to supplier
      const ingredient = await ingredientsAPI.createIngredient({ 
        ...testIngredients[0], 
        supplierId: testSupplier.id 
      });
      createdIngredients.push(ingredient);

      await suppliersPage.navigateToSuppliers();
      await suppliersPage.clickSupplierCard(testSupplier.name);
      
      // Should show linked ingredients section
      await expect(suppliersPage.page.locator('text="Ingredientes"')).toBeVisible();
      await expect(suppliersPage.page.locator(`text="${ingredient.name}"`)).toBeVisible();
    });
  });

  test.describe('API Operations', () => {
    test('should perform CRUD operations via API', async () => {
      // Create
      const supplierData = {
        name: 'API Test Supplier',
        email: 'api@test.com',
        phone: '(11) 9999-8888',
        address: 'API Test Address',
        isActive: true
      };

      const createdSupplier = await suppliersAPI.createSupplier(supplierData);
      expect(createdSupplier.name).toBe(supplierData.name);
      createdSuppliers.push(createdSupplier);

      // Read
      const suppliers = await suppliersAPI.getSuppliers();
      expect(suppliers.suppliers).toContainEqual(expect.objectContaining({
        id: createdSupplier.id,
        name: supplierData.name
      }));

      // Update
      const updatedData = { name: 'Updated API Supplier' };
      const updatedSupplier = await suppliersAPI.updateSupplier(createdSupplier.id, updatedData);
      expect(updatedSupplier.name).toBe(updatedData.name);

      // Delete
      await suppliersAPI.deleteSupplier(createdSupplier.id);
      createdSuppliers = createdSuppliers.filter(s => s.id !== createdSupplier.id);

      // Verify deletion
      const suppliersAfterDelete = await suppliersAPI.getSuppliers();
      expect(suppliersAfterDelete.suppliers.find((s: any) => s.id === createdSupplier.id)).toBeUndefined();
    });
  });
});