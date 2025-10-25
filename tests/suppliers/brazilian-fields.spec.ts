import { test, expect } from '@playwright/test';

test.describe('Brazilian Supplier Fields Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/suppliers');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to suppliers page and display correctly', async ({ page }) => {
    // Check Portuguese title
    await expect(page.locator('h1')).toContainText('Fornecedores');
    
    // Check if "Novo Fornecedor" button exists (correct Portuguese text)
    const addButton = page.locator('button:has-text("Novo Fornecedor")');
    await expect(addButton).toBeVisible();
    
    // Take screenshot of suppliers page
    await page.screenshot({ 
      path: 'test-results/suppliers-page-initial.png',
      fullPage: true 
    });
  });

  test('should create new supplier with Brazilian fields', async ({ page }) => {
    // Click the correct Portuguese button
    await page.click('button:has-text("Novo Fornecedor")');
    
    // Verify we're on the new supplier page
    await expect(page.locator('h1')).toContainText('Novo Fornecedor');
    
    // Take screenshot of form
    await page.screenshot({ 
      path: 'test-results/supplier-form-page.png',
      fullPage: true 
    });

    // Fill basic information
    await page.fill('#name', 'Fornecedor Teste Brasileiro Ltda');
    await page.fill('#contactPerson', 'João Silva');
    await page.fill('#phone', '(11) 99999-8888');
    await page.fill('#email', 'contato@fornecedorteste.com.br');

    // Fill Brazilian business fields
    await page.fill('#cpfCnpj', '11.222.333/0001-81');
    await page.fill('#inscricaoEstadual', '123.456.789.123');

    // Fill structured Brazilian address
    await page.fill('#cep', '01310-100');
    await page.fill('#estado', 'SP');
    await page.fill('#cidade', 'São Paulo');
    await page.fill('#bairro', 'Bela Vista');
    await page.fill('#endereco', 'Av. Paulista');
    await page.fill('#numero', '1000');
    await page.fill('#complemento', 'Sala 101');

    // Select rating (click on 4th star)
    await page.click('[class*="star"]:nth-child(4), .p-1:nth-child(4)');

    // Add a category - click on first available category
    const firstCategoryButton = page.locator('button:has-text("Farinhas"), button:has-text("Açúcares")').first();
    if (await firstCategoryButton.count() > 0) {
      await firstCategoryButton.click();
    }

    // Take screenshot before saving
    await page.screenshot({ 
      path: 'test-results/supplier-form-filled.png',
      fullPage: true 
    });

    // Submit form
    await page.click('button:has-text("Criar Fornecedor")');
    
    // Wait for navigation back to suppliers page
    await page.waitForURL('**/suppliers');
    
    // Take screenshot after creation
    await page.screenshot({ 
      path: 'test-results/supplier-created-success.png',
      fullPage: true 
    });

    // Verify supplier was created
    await expect(page.locator('text=Fornecedor Teste Brasileiro')).toBeVisible();
  });

  test('should validate CPF/CNPJ format correctly', async ({ page }) => {
    await page.click('button:has-text("Novo Fornecedor")');
    
    // Fill required fields first
    await page.fill('#name', 'Teste Validação');
    
    // Test invalid CPF/CNPJ formats
    const cpfCnpjField = page.locator('#cpfCnpj');
    
    // Test invalid format
    await cpfCnpjField.fill('123.456.789-00'); // Invalid CPF
    await cpfCnpjField.blur();
    await page.waitForTimeout(1000);
    
    // Try to submit and check for validation
    await page.fill('#email', 'test@test.com'); // Valid email
    
    // Add a category to meet requirements
    const categoryButton = page.locator('button:has-text("Farinhas")').first();
    if (await categoryButton.count() > 0) {
      await categoryButton.click();
    }
    
    await page.click('button:has-text("Criar Fornecedor")');
    
    // Check if validation error appears
    await page.screenshot({ 
      path: 'test-results/cpf-cnpj-validation-error.png',
      fullPage: true 
    });
    
    // Test valid CNPJ format
    await cpfCnpjField.fill('11.222.333/0001-81');
    await page.screenshot({ 
      path: 'test-results/cpf-cnpj-valid-format.png',
      fullPage: true 
    });
  });

  test('should validate CEP format correctly', async ({ page }) => {
    await page.click('button:has-text("Novo Fornecedor")');
    
    const cepField = page.locator('#cep');
    
    // Test invalid CEP formats
    await cepField.fill('12345'); // Too short
    await cepField.blur();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/cep-validation-invalid.png',
      fullPage: true 
    });
    
    // Test valid CEP format
    await cepField.fill('01310-100'); // Valid format
    await page.screenshot({ 
      path: 'test-results/cep-validation-valid.png',
      fullPage: true 
    });
  });

  test('should test search functionality', async ({ page }) => {
    // Search for existing supplier
    const searchField = page.locator('input[placeholder*="Buscar fornecedores"]');
    await searchField.fill('Moinho');
    await page.waitForTimeout(1000);
    
    // Check if search results appear
    await page.screenshot({ 
      path: 'test-results/supplier-search-results.png',
      fullPage: true 
    });
    
    // Clear search
    await searchField.clear();
    await page.waitForTimeout(1000);
    
    // Test search with no results
    await searchField.fill('XYZ123NonExistent');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/supplier-search-no-results.png',
      fullPage: true 
    });
  });

  test('should test view modes (Grid/List)', async ({ page }) => {
    // Test switching between grid and list views
    const gridButton = page.locator('button:has-text("Grade")');
    const listButton = page.locator('button:has-text("Lista")');
    
    // Click List view
    if (await listButton.count() > 0) {
      await listButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'test-results/supplier-list-view.png',
        fullPage: true 
      });
    }
    
    // Click Grid view
    if (await gridButton.count() > 0) {
      await gridButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'test-results/supplier-grid-view.png',
        fullPage: true 
      });
    }
  });

  test('should capture console errors and warnings', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    // Navigate and interact with the page
    await page.reload();
    await page.click('button:has-text("Novo Fornecedor")');
    await page.waitForTimeout(2000);
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);
    
    // Log any console messages found
    if (consoleMessages.length > 0) {
      console.log('Console Messages Found:');
      consoleMessages.forEach(msg => console.log(msg));
    } else {
      console.log('No console errors or warnings found');
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'test-results/final-state-with-console-check.png',
      fullPage: true 
    });
  });
});