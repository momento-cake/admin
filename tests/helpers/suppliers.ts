import { Page, expect } from '@playwright/test';

/**
 * Helper functions for suppliers management E2E tests
 */

export class SuppliersPage {
  constructor(private page: Page) {}

  /**
   * Navigation helpers
   */
  async navigateToSuppliers() {
    await this.page.goto('/suppliers');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToNewSupplier() {
    await this.page.goto('/suppliers/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search helpers
   */
  async searchSuppliers(searchTerm: string) {
    const searchInput = this.page.locator('input[placeholder*="Buscar fornecedores"]');
    await searchInput.fill(searchTerm);
    
    // Wait for debounced search to trigger
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Supplier interaction helpers
   */
  async clickSupplierCard(supplierName: string) {
    const card = this.page.locator(`[data-testid="supplier-card"]:has-text("${supplierName}")`);
    await card.click();
  }

  async clickEditSupplier(supplierName: string) {
    const card = this.page.locator(`[data-testid="supplier-card"]:has-text("${supplierName}")`);
    const editButton = card.locator('button:has-text("Editar"), button[aria-label="Editar"]');
    await editButton.click();
  }

  async clickDeleteSupplier(supplierName: string) {
    const card = this.page.locator(`[data-testid="supplier-card"]:has-text("${supplierName}")`);
    const deleteButton = card.locator('button:has-text("Excluir"), button[aria-label="Excluir"]');
    await deleteButton.click();
  }

  /**
   * Form helpers
   */
  async fillSupplierForm(supplierData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
  }) {
    await this.page.fill('[data-testid="supplier-name"]', supplierData.name);
    await this.page.fill('[data-testid="supplier-email"]', supplierData.email);
    await this.page.fill('[data-testid="supplier-phone"]', supplierData.phone);
    await this.page.fill('[data-testid="supplier-address"]', supplierData.address);
    
    if (supplierData.notes) {
      await this.page.fill('[data-testid="supplier-notes"]', supplierData.notes);
    }
  }

  async submitSupplierForm() {
    const submitButton = this.page.locator('button[type="submit"]:has-text("Salvar"), button:has-text("Criar Fornecedor")');
    await submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCancelForm() {
    const cancelButton = this.page.locator('button:has-text("Cancelar")');
    await cancelButton.click();
  }

  /**
   * Assertion helpers
   */
  async expectSupplierVisible(supplierName: string) {
    const supplier = this.page.locator(`[data-testid="supplier-card"]:has-text("${supplierName}")`);
    await expect(supplier).toBeVisible();
  }

  async expectSupplierNotVisible(supplierName: string) {
    const supplier = this.page.locator(`[data-testid="supplier-card"]:has-text("${supplierName}")`);
    await expect(supplier).not.toBeVisible();
  }

  async expectSupplierCount(count: number) {
    const suppliers = this.page.locator('[data-testid="supplier-card"]');
    await expect(suppliers).toHaveCount(count);
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
 * API helpers for suppliers
 */
export class SuppliersAPI {
  constructor(private page: Page) {}

  async createSupplier(supplierData: any) {
    const response = await this.page.request.post('/api/suppliers', {
      data: supplierData
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async updateSupplier(id: string, supplierData: any) {
    const response = await this.page.request.put(`/api/suppliers/${id}`, {
      data: supplierData
    });
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async deleteSupplier(id: string) {
    const response = await this.page.request.delete(`/api/suppliers/${id}`);
    expect(response.ok()).toBeTruthy();
  }

  async getSuppliers() {
    const response = await this.page.request.get('/api/suppliers');
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}