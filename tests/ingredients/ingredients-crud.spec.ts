import { test, expect } from '@playwright/test';
import { IngredientsPage, IngredientsAPI } from '../helpers/ingredients';
import { AuthHelper } from '../helpers/auth';
import { testIngredients, createIngredientFormData, ingredientUpdateData } from '../fixtures/ingredients';

test.describe('Ingredients CRUD Operations', () => {
  let ingredientsPage: IngredientsPage;
  let ingredientsAPI: IngredientsAPI;
  let authHelper: AuthHelper;
  let createdIngredients: any[] = [];

  test.beforeEach(async ({ page }) => {
    ingredientsPage = new IngredientsPage(page);
    ingredientsAPI = new IngredientsAPI(page);
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
  });

  test.describe('Create Ingredient', () => {
    test('should create a new ingredient successfully', async () => {
      await ingredientsPage.navigateToNewIngredient();
      
      // Fill and submit form
      await ingredientsPage.fillIngredientForm(createIngredientFormData.valid);
      await ingredientsPage.submitIngredientForm();
      
      // Verify success - should navigate back to ingredients list
      await expect(ingredientsPage.page).toHaveURL('/ingredients');
      
      // Verify ingredient appears in list
      await ingredientsPage.expectSuccessMessage('Ingrediente criado com sucesso');
      await ingredientsPage.expectIngredientVisible(createIngredientFormData.valid.name);
      
      // Store for cleanup
      const ingredients = await ingredientsAPI.getIngredients({ 
        searchQuery: createIngredientFormData.valid.name 
      });
      if (ingredients.ingredients.length > 0) {
        createdIngredients.push(ingredients.ingredients[0]);
      }
    });

    test('should show validation errors for invalid input', async () => {
      await ingredientsPage.navigateToNewIngredient();
      
      // Submit form with invalid data
      await ingredientsPage.fillIngredientForm(createIngredientFormData.invalid);
      await ingredientsPage.submitIngredientForm();
      
      // Verify validation errors are shown
      await ingredientsPage.expectErrorMessage('Nome é obrigatório');
      await ingredientsPage.expectErrorMessage('Preço deve ser positivo');
      
      // Should stay on form page
      await expect(ingredientsPage.page).toHaveURL('/ingredients/new');
    });

    test('should prevent creating duplicate ingredients', async () => {
      // First create an ingredient via API
      const ingredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(ingredient);
      
      await ingredientsPage.navigateToNewIngredient();
      
      // Try to create ingredient with same name
      await ingredientsPage.fillIngredientForm(createIngredientFormData.duplicate);
      await ingredientsPage.submitIngredientForm();
      
      // Verify error message
      await ingredientsPage.expectErrorMessage('Já existe um ingrediente com esse nome');
      
      // Should stay on form page
      await expect(ingredientsPage.page).toHaveURL('/ingredients/new');
    });

    test('should cancel ingredient creation', async () => {
      await ingredientsPage.navigateToNewIngredient();
      
      // Fill form partially
      await ingredientsPage.page.fill('[data-testid="ingredient-name"]', 'Test Cancel');
      
      // Click cancel
      await ingredientsPage.clickCancelForm();
      
      // Should navigate back to ingredients list
      await expect(ingredientsPage.page).toHaveURL('/ingredients');
    });
  });

  test.describe('Read Ingredients', () => {
    test.beforeEach(async () => {
      // Create test ingredients
      for (const ingredientData of testIngredients) {
        const ingredient = await ingredientsAPI.createIngredient(ingredientData);
        createdIngredients.push(ingredient);
      }
    });

    test('should display all ingredients', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Verify ingredients are displayed
      await ingredientsPage.expectIngredientCount(testIngredients.length);
      
      for (const ingredient of testIngredients) {
        await ingredientsPage.expectIngredientVisible(ingredient.name);
      }
    });

    test('should search ingredients by name', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Search for specific ingredient
      await ingredientsPage.searchIngredients('Farinha');
      
      // Should show only flour ingredients
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientNotVisible('Açúcar Cristal');
    });

    test('should filter by category', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Filter by FLOUR category
      await ingredientsPage.filterByCategory('flour');
      
      // Should show only flour ingredients
      await ingredientsPage.expectIngredientVisible('Farinha de Trigo Especial');
      await ingredientsPage.expectIngredientNotVisible('Açúcar Cristal');
    });

    test('should filter by stock status', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Filter by low stock
      await ingredientsPage.filterByStockStatus('low');
      
      // Should show only low stock ingredients
      await ingredientsPage.expectIngredientVisible('Leite Integral'); // Has 3 stock, min 15
    });

    test('should clear filters', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Apply filter
      await ingredientsPage.filterByCategory('flour');
      await ingredientsPage.expectIngredientNotVisible('Açúcar Cristal');
      
      // Clear filters
      await ingredientsPage.clearFilters();
      
      // Should show all ingredients again
      await ingredientsPage.expectIngredientVisible('Açúcar Cristal');
      await ingredientsPage.expectIngredientCount(testIngredients.length);
    });

    test('should switch between grid and list view', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Test grid view (default)
      await ingredientsPage.switchToGridView();
      const gridContainer = ingredientsPage.page.locator('.grid');
      await expect(gridContainer).toBeVisible();
      
      // Test list view
      await ingredientsPage.switchToListView();
      const listContainer = ingredientsPage.page.locator('.space-y-2');
      await expect(listContainer).toBeVisible();
    });
  });

  test.describe('Update Ingredient', () => {
    let testIngredient: any;

    test.beforeEach(async () => {
      // Create a test ingredient
      testIngredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(testIngredient);
    });

    test('should update ingredient successfully', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click edit on the ingredient
      await ingredientsPage.clickEditIngredient(testIngredient.name);
      
      // Fill updated data
      await ingredientsPage.page.fill('[data-testid="ingredient-name"]', ingredientUpdateData.name);
      await ingredientsPage.page.fill('[data-testid="ingredient-description"]', ingredientUpdateData.description);
      await ingredientsPage.page.fill('[data-testid="ingredient-price"]', ingredientUpdateData.currentPrice.toString());
      
      // Submit form
      await ingredientsPage.submitIngredientForm();
      
      // Verify success
      await ingredientsPage.expectSuccessMessage('Ingrediente atualizado com sucesso');
      await ingredientsPage.expectIngredientVisible(ingredientUpdateData.name);
      await ingredientsPage.expectIngredientNotVisible(testIngredient.name);
    });

    test('should validate updated ingredient data', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click edit on the ingredient
      await ingredientsPage.clickEditIngredient(testIngredient.name);
      
      // Try to set invalid price
      await ingredientsPage.page.fill('[data-testid="ingredient-price"]', '-10');
      await ingredientsPage.submitIngredientForm();
      
      // Verify validation error
      await ingredientsPage.expectErrorMessage('Preço deve ser positivo');
    });

    test('should cancel ingredient update', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click edit on the ingredient
      await ingredientsPage.clickEditIngredient(testIngredient.name);
      
      // Make changes
      await ingredientsPage.page.fill('[data-testid="ingredient-name"]', 'Changed Name');
      
      // Cancel
      await ingredientsPage.clickCancelForm();
      
      // Should show original ingredient name
      await ingredientsPage.expectIngredientVisible(testIngredient.name);
      await ingredientsPage.expectIngredientNotVisible('Changed Name');
    });
  });

  test.describe('Delete Ingredient', () => {
    let testIngredient: any;

    test.beforeEach(async () => {
      // Create a test ingredient
      testIngredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(testIngredient);
    });

    test('should delete ingredient successfully', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click delete on the ingredient
      await ingredientsPage.clickDeleteIngredient(testIngredient.name);
      
      // Confirm deletion
      await ingredientsPage.confirmDelete();
      
      // Verify success
      await ingredientsPage.expectSuccessMessage('Ingrediente excluído com sucesso');
      await ingredientsPage.expectIngredientNotVisible(testIngredient.name);
      
      // Remove from cleanup array since it's already deleted
      createdIngredients = createdIngredients.filter(i => i.id !== testIngredient.id);
    });

    test('should cancel ingredient deletion', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click delete on the ingredient
      await ingredientsPage.clickDeleteIngredient(testIngredient.name);
      
      // Cancel deletion
      await ingredientsPage.cancelDelete();
      
      // Ingredient should still be visible
      await ingredientsPage.expectIngredientVisible(testIngredient.name);
    });
  });

  test.describe('Ingredient Detail View', () => {
    let testIngredient: any;

    test.beforeEach(async () => {
      // Create a test ingredient
      testIngredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(testIngredient);
    });

    test('should view ingredient details', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Click on ingredient card
      await ingredientsPage.clickIngredientCard(testIngredient.name);
      
      // Should navigate to detail page
      await expect(ingredientsPage.page).toHaveURL(new RegExp(`/ingredients/${testIngredient.id}`));
      
      // Verify ingredient details are displayed
      await expect(ingredientsPage.page.locator('h1')).toContainText(testIngredient.name);
      await expect(ingredientsPage.page.locator('text="Descrição"')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no ingredients exist', async () => {
      await ingredientsPage.navigateToIngredients();
      
      // Verify empty state is shown
      await ingredientsPage.expectEmptyState();
      await ingredientsPage.expectIngredientCount(0);
    });

    test('should show filtered empty state', async () => {
      // Create one ingredient
      const ingredient = await ingredientsAPI.createIngredient(testIngredients[0]);
      createdIngredients.push(ingredient);
      
      await ingredientsPage.navigateToIngredients();
      
      // Apply filter that returns no results
      await ingredientsPage.searchIngredients('nonexistent');
      
      // Verify filtered empty state
      await ingredientsPage.expectEmptyState();
      await ingredientsPage.expectIngredientCount(0);
    });
  });
});