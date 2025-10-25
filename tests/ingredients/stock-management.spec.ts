import { test, expect } from '@playwright/test';
import { IngredientsPage, IngredientsAPI } from '../helpers/ingredients';
import { AuthHelper } from '../helpers/auth';
import { testIngredients, stockMovementData } from '../fixtures/ingredients';

test.describe('Stock Management', () => {
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

    // Create test ingredients with different stock levels
    for (const ingredientData of testIngredients) {
      const ingredient = await ingredientsAPI.createIngredient(ingredientData);
      createdIngredients.push(ingredient);
    }
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

  test.describe('Stock Level Indicators', () => {
    test('should display correct stock level indicators', async () => {
      await ingredientsPage.navigateToIngredients();

      // Good stock (Farinha: 25 current, 5 min)
      await ingredientsPage.expectStockLevel('Farinha de Trigo Especial', 'good');

      // Low stock (Leite: 3 current, 15 min)
      await ingredientsPage.expectStockLevel('Leite Integral', 'low');

      // Out of stock (Ovos: 0 current, 30 min)
      await ingredientsPage.expectStockLevel('Ovos Grandes', 'out');
    });

    test('should filter ingredients by stock status', async () => {
      await ingredientsPage.navigateToIngredients();

      // Filter by low stock
      await ingredientsPage.filterByStockStatus('low');
      await ingredientsPage.expectIngredientVisible('Leite Integral');
      await ingredientsPage.expectIngredientNotVisible('Farinha de Trigo Especial');

      // Filter by out of stock
      await ingredientsPage.filterByStockStatus('out');
      await ingredientsPage.expectIngredientVisible('Ovos Grandes');
      await ingredientsPage.expectIngredientNotVisible('Leite Integral');
    });
  });

  test.describe('Add Stock', () => {
    test('should add stock successfully', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Leite Integral');
      const initialStock = testIngredient.currentStock;

      await ingredientsPage.navigateToIngredients();
      
      // Open stock management modal
      await ingredientsPage.openStockModal(testIngredient.name);

      // Add stock
      await ingredientsPage.addStock(
        stockMovementData.add.quantity,
        stockMovementData.add.unitCost,
        stockMovementData.add.reason,
        stockMovementData.add.notes
      );

      // Verify success
      await ingredientsPage.expectSuccessMessage('Estoque adicionado com sucesso');

      // Close modal
      await ingredientsPage.closeStockModal();

      // Verify stock level updated
      const updatedIngredient = await ingredientsAPI.getIngredients({ 
        searchQuery: testIngredient.name 
      });
      expect(updatedIngredient.ingredients[0].currentStock).toBe(
        initialStock + stockMovementData.add.quantity
      );
    });

    test('should validate add stock form', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Leite Integral');

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Try to add invalid quantity
      await ingredientsPage.addStock(-5);

      // Should show validation error
      await ingredientsPage.expectErrorMessage('Quantidade deve ser positiva');
    });

    test('should update ingredient price when adding stock', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Farinha de Trigo Especial');
      const newUnitCost = 9.25;

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Add stock with different unit cost
      await ingredientsPage.addStock(10, newUnitCost, 'Atualização de preço');

      // Close modal
      await ingredientsPage.closeStockModal();

      // Verify price was updated
      const updatedIngredient = await ingredientsAPI.getIngredients({ 
        searchQuery: testIngredient.name 
      });
      expect(updatedIngredient.ingredients[0].currentPrice).toBe(newUnitCost);
    });
  });

  test.describe('Remove Stock', () => {
    test('should remove stock successfully', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Açúcar Cristal');
      const initialStock = testIngredient.currentStock;

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Remove stock
      await ingredientsPage.removeStock(
        stockMovementData.remove.quantity,
        stockMovementData.remove.reason,
        stockMovementData.remove.notes
      );

      // Verify success
      await ingredientsPage.expectSuccessMessage('Estoque removido com sucesso');

      // Close modal
      await ingredientsPage.closeStockModal();

      // Verify stock level updated
      const updatedIngredient = await ingredientsAPI.getIngredients({ 
        searchQuery: testIngredient.name 
      });
      expect(updatedIngredient.ingredients[0].currentStock).toBe(
        initialStock - stockMovementData.remove.quantity
      );
    });

    test('should prevent removing more stock than available', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Leite Integral'); // Has 3 in stock
      
      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Try to remove more than available
      await ingredientsPage.removeStock(10); // Trying to remove 10 when only 3 available

      // Should show validation error
      await ingredientsPage.expectErrorMessage('Quantidade insuficiente em estoque');
    });
  });

  test.describe('Adjust Stock', () => {
    test('should adjust stock to new quantity', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Chocolate em Pó');
      const newQuantity = stockMovementData.adjust.newQuantity;

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Adjust stock
      await ingredientsPage.adjustStock(
        newQuantity,
        stockMovementData.adjust.reason,
        stockMovementData.adjust.notes
      );

      // Verify success
      await ingredientsPage.expectSuccessMessage('Estoque ajustado com sucesso');

      // Close modal
      await ingredientsPage.closeStockModal();

      // Verify stock level updated
      const updatedIngredient = await ingredientsAPI.getIngredients({ 
        searchQuery: testIngredient.name 
      });
      expect(updatedIngredient.ingredients[0].currentStock).toBe(newQuantity);
    });

    test('should validate adjust stock form', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Chocolate em Pó');

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Try to set negative quantity
      await ingredientsPage.adjustStock(-5);

      // Should show validation error
      await ingredientsPage.expectErrorMessage('Quantidade deve ser positiva');
    });
  });

  test.describe('Stock History', () => {
    test('should record stock movements', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Manteiga Sem Sal');

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Add stock
      await ingredientsPage.addStock(5, 19.50, 'Compra teste', 'Teste de histórico');

      // Close and reopen modal
      await ingredientsPage.closeStockModal();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Check if history shows the movement
      const historyTab = ingredientsPage.page.locator('[data-testid="stock-history-tab"]');
      if (await historyTab.isVisible()) {
        await historyTab.click();
        
        // Verify movement is recorded
        await expect(ingredientsPage.page.locator('text="Compra teste"')).toBeVisible();
        await expect(ingredientsPage.page.locator('text="Teste de histórico"')).toBeVisible();
        await expect(ingredientsPage.page.locator('text="+5"')).toBeVisible();
      }
    });
  });

  test.describe('Stock Alerts', () => {
    test('should show low stock alert', async () => {
      await ingredientsPage.navigateToIngredients();

      // Low stock ingredient should show alert
      const lowStockCard = ingredientsPage.page.locator('[data-testid="ingredient-card"]:has-text("Leite Integral")');
      await expect(lowStockCard.locator('[data-testid="low-stock-alert"]')).toBeVisible();
    });

    test('should show out of stock alert', async () => {
      await ingredientsPage.navigateToIngredients();

      // Out of stock ingredient should show alert
      const outOfStockCard = ingredientsPage.page.locator('[data-testid="ingredient-card"]:has-text("Ovos Grandes")');
      await expect(outOfStockCard.locator('[data-testid="out-of-stock-alert"]')).toBeVisible();
    });
  });

  test.describe('Stock Management Modal', () => {
    test('should open and close stock modal', async () => {
      const testIngredient = createdIngredients[0];

      await ingredientsPage.navigateToIngredients();

      // Open modal
      await ingredientsPage.openStockModal(testIngredient.name);
      await expect(ingredientsPage.page.locator('[data-testid="stock-modal"]')).toBeVisible();

      // Close modal
      await ingredientsPage.closeStockModal();
      await expect(ingredientsPage.page.locator('[data-testid="stock-modal"]')).not.toBeVisible();
    });

    test('should show current stock information', async () => {
      const testIngredient = createdIngredients.find(i => i.name === 'Açúcar Cristal');

      await ingredientsPage.navigateToIngredients();
      await ingredientsPage.openStockModal(testIngredient.name);

      // Verify current stock is displayed
      await expect(ingredientsPage.page.locator(`text="${testIngredient.currentStock}"`)).toBeVisible();
      await expect(ingredientsPage.page.locator(`text="${testIngredient.minStock}"`)).toBeVisible();
    });
  });

  test.describe('API Stock Operations', () => {
    test('should add stock via API', async () => {
      const testIngredient = createdIngredients[0];
      const initialStock = testIngredient.currentStock;

      // Add stock via API
      await ingredientsAPI.addStock(testIngredient.id, {
        quantity: 10,
        unitCost: 12.50,
        reason: 'API Test',
        notes: 'Testing API endpoint'
      });

      // Verify stock was added
      const response = await ingredientsAPI.getIngredients();
      const updatedIngredient = response.ingredients.find((i: any) => i.id === testIngredient.id);
      expect(updatedIngredient.currentStock).toBe(initialStock + 10);
    });

    test('should remove stock via API', async () => {
      const testIngredient = createdIngredients.find(i => i.currentStock > 5);
      const initialStock = testIngredient.currentStock;

      // Remove stock via API
      await ingredientsAPI.removeStock(testIngredient.id, {
        quantity: 3,
        reason: 'API Test',
        notes: 'Testing removal'
      });

      // Verify stock was removed
      const response = await ingredientsAPI.getIngredients();
      const updatedIngredient = response.ingredients.find((i: any) => i.id === testIngredient.id);
      expect(updatedIngredient.currentStock).toBe(initialStock - 3);
    });

    test('should adjust stock via API', async () => {
      const testIngredient = createdIngredients[0];
      const newQuantity = 25;

      // Adjust stock via API
      await ingredientsAPI.adjustStock(testIngredient.id, {
        newQuantity: newQuantity,
        reason: 'API Test',
        notes: 'Testing adjustment'
      });

      // Verify stock was adjusted
      const response = await ingredientsAPI.getIngredients();
      const updatedIngredient = response.ingredients.find((i: any) => i.id === testIngredient.id);
      expect(updatedIngredient.currentStock).toBe(newQuantity);
    });
  });
});