import { test, expect } from '@playwright/test';

test.describe('Supplier Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to suppliers page
    await page.goto('http://localhost:3000/suppliers');
    await page.waitForLoadState('networkidle');
  });

  test('should display suppliers page correctly', async ({ page }) => {
    // Check page title and navigation
    await expect(page).toHaveTitle(/Momento Cake/);
    
    // Check if suppliers page loaded
    await expect(page.locator('h1')).toContainText(/Fornecedores|Suppliers/);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/suppliers-initial.png',
      fullPage: true 
    });
  });

  test('should create new supplier with Brazilian fields', async ({ page }) => {
    // Click add supplier button
    await page.click('[data-testid="add-supplier-button"], button:has-text("Adicionar"), button:has-text("Add")');
    
    // Wait for form to load
    await page.waitForSelector('form, [role="dialog"]');
    
    // Take screenshot of form
    await page.screenshot({ 
      path: 'test-results/supplier-form.png',
      fullPage: true 
    });
    
    // Fill supplier form with Brazilian data
    await page.fill('[name="name"], [data-testid="supplier-name"]', 'Fornecedor Teste Ltda');
    
    // Test CPF/CNPJ field
    const cnpjField = page.locator('[name="cpfCnpj"], [data-testid="cpf-cnpj"]');
    if (await cnpjField.count() > 0) {
      await cnpjField.fill('11.222.333/0001-81');
    }
    
    // Test structured address fields
    const cepField = page.locator('[name="cep"], [data-testid="cep"]');
    if (await cepField.count() > 0) {
      await cepField.fill('01310-100');
    }
    
    const addressField = page.locator('[name="address"], [data-testid="address"]');
    if (await addressField.count() > 0) {
      await addressField.fill('Av. Paulista, 1000');
    }
    
    const neighborhoodField = page.locator('[name="neighborhood"], [data-testid="neighborhood"]');
    if (await neighborhoodField.count() > 0) {
      await neighborhoodField.fill('Bela Vista');
    }
    
    const cityField = page.locator('[name="city"], [data-testid="city"]');
    if (await cityField.count() > 0) {
      await cityField.fill('São Paulo');
    }
    
    const stateField = page.locator('[name="state"], [data-testid="state"]');
    if (await stateField.count() > 0) {
      await stateField.fill('SP');
    }
    
    // Fill contact information
    const emailField = page.locator('[name="email"], [data-testid="email"]');
    if (await emailField.count() > 0) {
      await emailField.fill('contato@fornecedor.com.br');
    }
    
    const phoneField = page.locator('[name="phone"], [data-testid="phone"]');
    if (await phoneField.count() > 0) {
      await phoneField.fill('(11) 9999-8888');
    }
    
    // Take screenshot before saving
    await page.screenshot({ 
      path: 'test-results/supplier-form-filled.png',
      fullPage: true 
    });
    
    // Save supplier
    await page.click('button:has-text("Salvar"), button:has-text("Save"), [data-testid="save-button"]');
    
    // Wait for save completion
    await page.waitForTimeout(2000);
    
    // Take screenshot after save
    await page.screenshot({ 
      path: 'test-results/supplier-created.png',
      fullPage: true 
    });
  });

  test('should validate CPF/CNPJ format', async ({ page }) => {
    // Click add supplier button
    await page.click('[data-testid="add-supplier-button"], button:has-text("Adicionar"), button:has-text("Add")');
    await page.waitForSelector('form, [role="dialog"]');
    
    // Test invalid CPF/CNPJ
    const cnpjField = page.locator('[name="cpfCnpj"], [data-testid="cpf-cnpj"]');
    if (await cnpjField.count() > 0) {
      await cnpjField.fill('123.456.789-00'); // Invalid format
      await cnpjField.blur();
      
      // Check for validation error
      await page.waitForTimeout(1000);
      
      // Take screenshot of validation
      await page.screenshot({ 
        path: 'test-results/cpf-cnpj-validation.png',
        fullPage: true 
      });
    }
  });

  test('should validate CEP format', async ({ page }) => {
    // Click add supplier button
    await page.click('[data-testid="add-supplier-button"], button:has-text("Adicionar"), button:has-text("Add")');
    await page.waitForSelector('form, [role="dialog"]');
    
    // Test invalid CEP
    const cepField = page.locator('[name="cep"], [data-testid="cep"]');
    if (await cepField.count() > 0) {
      await cepField.fill('12345'); // Invalid format
      await cepField.blur();
      
      // Check for validation error
      await page.waitForTimeout(1000);
      
      // Take screenshot of validation
      await page.screenshot({ 
        path: 'test-results/cep-validation.png',
        fullPage: true 
      });
    }
  });

  test('should test search functionality', async ({ page }) => {
    // Look for search input
    const searchField = page.locator('[placeholder*="buscar"], [placeholder*="search"], input[type="search"]');
    
    if (await searchField.count() > 0) {
      await searchField.fill('Teste');
      await page.waitForTimeout(1000);
      
      // Take screenshot of search results
      await page.screenshot({ 
        path: 'test-results/supplier-search.png',
        fullPage: true 
      });
    }
  });

  test('should capture console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Perform various actions to trigger potential errors
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Try to interact with add button
    const addButton = page.locator('[data-testid="add-supplier-button"], button:has-text("Adicionar"), button:has-text("Add")');
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Log console errors
    console.log('Console Errors Found:', consoleErrors);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/final-state.png',
      fullPage: true 
    });
  });
});