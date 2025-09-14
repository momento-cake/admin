import { Page, expect } from '@playwright/test';
import { Ingredient, IngredientCategory } from '@/types/ingredient';

/**
 * Helper functions for ingredients management E2E tests
 */

export class IngredientsPage {
  constructor(private page: Page) {}

  /**
   * Navigation helpers
   */
  async navigateToIngredients() {
    await this.page.goto('/ingredients');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToNewIngredient() {
    await this.page.goto('/ingredients/new');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToIngredientDetail(ingredientId: string) {
    await this.page.goto(`/ingredients/${ingredientId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search and filter helpers
   */
  async searchIngredients(searchTerm: string) {
    const searchInput = this.page.locator('input[placeholder*="Buscar ingredientes"]');
    await searchInput.fill(searchTerm);
    
    // Wait for debounced search to trigger
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByCategory(category: IngredientCategory | 'all') {
    const categorySelect = this.page.locator('[data-testid="category-filter"]').first();
    await categorySelect.click();
    
    const option = category === 'all' 
      ? this.page.locator('text="Todas as categorias"')
      : this.page.locator(`[data-value="${category}"]`);
    
    await option.click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterBySupplier(supplierId: string | 'all') {
    const supplierSelect = this.page.locator('[data-testid="supplier-filter"]').first();
    await supplierSelect.click();
    
    const option = supplierId === 'all'
      ? this.page.locator('text="Todos os fornecedores"')
      : this.page.locator(`[data-value="${supplierId}"]`);
    
    await option.click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStockStatus(status: 'good' | 'low' | 'critical' | 'out' | 'all') {
    const stockSelect = this.page.locator('[data-testid="stock-status-filter"]').first();
    await stockSelect.click();
    
    const option = status === 'all'
      ? this.page.locator('text="Todos os status"')
      : this.page.locator(`[data-value="${status}"]`);
    
    await option.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clearFilters() {
    const clearButton = this.page.locator('button:has-text("Limpar filtros")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * View mode helpers
   */
  async switchToGridView() {
    const gridButton = this.page.locator('button[aria-label="Grid view"], button:has([data-testid="grid-icon"])');
    await gridButton.click();
  }

  async switchToListView() {
    const listButton = this.page.locator('button[aria-label="List view"], button:has([data-testid="list-icon"])');
    await listButton.click();
  }

  /**
   * Ingredient card/list interaction helpers
   */
  async clickIngredientCard(ingredientName: string) {
    const card = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    await card.click();
  }

  async clickEditIngredient(ingredientName: string) {
    const card = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    const editButton = card.locator('button:has-text("Editar"), button[aria-label="Editar"]');
    await editButton.click();
  }

  async clickDeleteIngredient(ingredientName: string) {
    const card = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    const deleteButton = card.locator('button:has-text("Excluir"), button[aria-label="Excluir"]');
    await deleteButton.click();
  }

  async clickManageStock(ingredientName: string) {
    const card = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    const stockButton = card.locator('button:has-text("Estoque"), button[aria-label="Gerenciar estoque"]');
    await stockButton.click();
  }

  /**
   * Form helpers
   */
  async fillIngredientForm(ingredientData: {
    name: string;
    description?: string;
    unit: string;
    currentPrice: string;
    currentStock: string;
    minStock: string;
    category: string;
    allergens?: string;
    supplierId?: string;
  }) {
    // Fill basic information
    await this.page.fill('[data-testid="ingredient-name"]', ingredientData.name);
    
    if (ingredientData.description) {
      await this.page.fill('[data-testid="ingredient-description"]', ingredientData.description);
    }

    // Select unit
    await this.page.locator('[data-testid="ingredient-unit"]').click();
    await this.page.locator(`[data-value="${ingredientData.unit}"]`).click();

    // Fill price and stock
    await this.page.fill('[data-testid="ingredient-price"]', ingredientData.currentPrice);
    await this.page.fill('[data-testid="ingredient-current-stock"]', ingredientData.currentStock);
    await this.page.fill('[data-testid="ingredient-min-stock"]', ingredientData.minStock);

    // Select category
    await this.page.locator('[data-testid="ingredient-category"]').click();
    await this.page.locator(`[data-value="${ingredientData.category}"]`).click();

    // Fill allergens if provided
    if (ingredientData.allergens) {
      await this.page.fill('[data-testid="ingredient-allergens"]', ingredientData.allergens);
    }

    // Select supplier if provided
    if (ingredientData.supplierId) {
      await this.page.locator('[data-testid="ingredient-supplier"]').click();
      await this.page.locator(`[data-value="${ingredientData.supplierId}"]`).click();
    }
  }

  async submitIngredientForm() {
    const submitButton = this.page.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Criar Ingrediente")');
    await submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancelForm() {
    const cancelButton = this.page.locator('button:has-text("Cancelar")');
    await cancelButton.click();
  }

  /**
   * Stock management helpers
   */
  async openStockModal(ingredientName: string) {
    await this.clickManageStock(ingredientName);
    await this.page.waitForSelector('[data-testid="stock-modal"]');
  }

  async addStock(quantity: number, unitCost?: number, reason?: string, notes?: string) {
    // Switch to add stock tab
    await this.page.locator('[data-testid="add-stock-tab"]').click();
    
    // Fill quantity
    await this.page.fill('[data-testid="stock-quantity"]', quantity.toString());
    
    // Fill unit cost if provided
    if (unitCost !== undefined) {
      await this.page.fill('[data-testid="stock-unit-cost"]', unitCost.toString());
    }
    
    // Fill reason if provided
    if (reason) {
      await this.page.fill('[data-testid="stock-reason"]', reason);
    }
    
    // Fill notes if provided
    if (notes) {
      await this.page.fill('[data-testid="stock-notes"]', notes);
    }
    
    // Submit
    await this.page.locator('[data-testid="stock-submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async removeStock(quantity: number, reason?: string, notes?: string) {
    // Switch to remove stock tab
    await this.page.locator('[data-testid="remove-stock-tab"]').click();
    
    // Fill quantity
    await this.page.fill('[data-testid="stock-quantity"]', quantity.toString());
    
    // Fill reason if provided
    if (reason) {
      await this.page.fill('[data-testid="stock-reason"]', reason);
    }
    
    // Fill notes if provided
    if (notes) {
      await this.page.fill('[data-testid="stock-notes"]', notes);
    }
    
    // Submit
    await this.page.locator('[data-testid="stock-submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async adjustStock(newQuantity: number, reason?: string, notes?: string) {
    // Switch to adjust stock tab
    await this.page.locator('[data-testid="adjust-stock-tab"]').click();
    
    // Fill new quantity
    await this.page.fill('[data-testid="stock-new-quantity"]', newQuantity.toString());
    
    // Fill reason if provided
    if (reason) {
      await this.page.fill('[data-testid="stock-reason"]', reason);
    }
    
    // Fill notes if provided
    if (notes) {
      await this.page.fill('[data-testid="stock-notes"]', notes);
    }
    
    // Submit
    await this.page.locator('[data-testid="stock-submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  async closeStockModal() {
    await this.page.locator('[data-testid="stock-modal-close"]').click();
  }

  /**
   * Assertion helpers
   */
  async expectIngredientVisible(ingredientName: string) {
    const ingredient = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    await expect(ingredient).toBeVisible();
  }

  async expectIngredientNotVisible(ingredientName: string) {
    const ingredient = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    await expect(ingredient).not.toBeVisible();
  }

  async expectIngredientCount(count: number) {
    const ingredients = this.page.locator('[data-testid="ingredient-card"]');
    await expect(ingredients).toHaveCount(count);
  }

  async expectEmptyState() {
    const emptyState = this.page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    const error = this.page.locator(`text="${message}"`);
    await expect(error).toBeVisible();
  }

  async expectSuccessMessage(message: string) {
    const success = this.page.locator(`text="${message}"`);
    await expect(success).toBeVisible();
  }

  async expectStockLevel(ingredientName: string, level: 'good' | 'low' | 'critical' | 'out') {
    const card = this.page.locator(`[data-testid="ingredient-card"]:has-text("${ingredientName}")`);
    const stockIndicator = card.locator(`[data-testid="stock-indicator-${level}"]`);
    await expect(stockIndicator).toBeVisible();
  }

  /**
   * Delete confirmation helpers
   */
  async confirmDelete() {
    const confirmButton = this.page.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelDelete() {
    const cancelButton = this.page.locator('[data-testid="cancel-delete"]');
    await cancelButton.click();
  }
}

/**
 * API helpers for test setup/teardown
 */
export class IngredientsAPI {
  constructor(private page: Page) {}

  async createIngredient(ingredientData: any) {
    const response = await this.page.request.post('/api/ingredients', {
      data: ingredientData
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async updateIngredient(id: string, ingredientData: any) {
    const response = await this.page.request.put(`/api/ingredients/${id}`, {
      data: ingredientData
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async deleteIngredient(id: string) {
    const response = await this.page.request.delete(`/api/ingredients/${id}`);
    expect(response.ok()).toBeTruthy();
  }

  async getIngredients(params?: any) {
    const url = new URL('/api/ingredients', this.page.url());
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    
    const response = await this.page.request.get(url.toString());
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async addStock(id: string, stockData: any) {
    const response = await this.page.request.post(`/api/ingredients/${id}/stock`, {
      data: { ...stockData, type: 'add' }
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async removeStock(id: string, stockData: any) {
    const response = await this.page.request.post(`/api/ingredients/${id}/stock`, {
      data: { ...stockData, type: 'remove' }
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async adjustStock(id: string, stockData: any) {
    const response = await this.page.request.post(`/api/ingredients/${id}/stock`, {
      data: { ...stockData, type: 'adjust' }
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}