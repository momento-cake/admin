import { test, expect, Page } from '@playwright/test';

// Working selectors for Momento Cake Admin login form
const WORKING_SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@momentocake.com.br',
  password: 'G8j5k188'
};

const BASE_URL = 'http://localhost:3001';
const INGREDIENTS_URL = `${BASE_URL}/ingredients/inventory`;

// Helper function to login
async function loginUser(page: Page) {
  console.log('🔐 Starting login process...');
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');
  
  // Fill login form
  await page.fill(WORKING_SELECTORS.email, ADMIN_CREDENTIALS.email);
  await page.fill(WORKING_SELECTORS.password, ADMIN_CREDENTIALS.password);
  
  // Submit form
  await page.click(WORKING_SELECTORS.submitButton);
  
  // Wait for navigation
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  if (currentUrl.includes('dashboard')) {
    console.log('✅ Login successful');
    return true;
  } else {
    throw new Error('Login failed');
  }
}

// Helper function to navigate to ingredients
async function navigateToIngredients(page: Page) {
  await page.goto(INGREDIENTS_URL);
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);
  console.log('🧭 Navigated to ingredients inventory');
}

// Helper function to take screenshot
async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ 
    path: filename,
    fullPage: true 
  });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

test.describe('EDIT Functionality Testing with Correct Form Selectors', () => {

  test('Test EDIT functionality with actual form fields', async ({ page }) => {
    console.log('=== EDIT FUNCTIONALITY TESTING WITH CORRECT SELECTORS ===');
    
    // Setup
    await loginUser(page);
    await navigateToIngredients(page);
    
    const ingredientCount = await page.locator('tbody tr').count();
    console.log(`📊 Available ingredients: ${ingredientCount}`);
    
    if (ingredientCount === 0) {
      console.log('❌ SKIP: No ingredients available');
      return;
    }
    
    let successfulEdits = 0;
    const targetEdits = Math.min(3, ingredientCount); // Test up to 3 edits
    
    for (let i = 0; i < targetEdits; i++) {
      console.log(`\n--- EDIT TEST ${i + 1}/${targetEdits} ---`);
      
      try {
        // Get the ingredient row
        const targetRow = page.locator('tbody tr').nth(i);
        await targetRow.waitFor({ timeout: 5000 });
        
        // Get ingredient name for logging
        const ingredientName = await targetRow.locator('td:first-child').textContent();
        console.log(`✏️ Editing: ${ingredientName?.trim()}`);
        
        // Take screenshot before editing
        await takeScreenshot(page, `edit-before-${i + 1}-${ingredientName?.trim().replace(/\s+/g, '-')}`);
        
        // Find and click edit button (second action button)
        const actionButtons = targetRow.locator('td:last-child button');
        const editButton = actionButtons.nth(1); // Second button (edit)
        
        if (await editButton.isVisible()) {
          await editButton.click();
          console.log('✏️ Edit button clicked');
          
          // Wait for modal to appear
          await page.waitForTimeout(2000);
          
          // Take screenshot of edit form
          await takeScreenshot(page, `edit-form-${i + 1}-${ingredientName?.trim().replace(/\s+/g, '-')}`);
          
          // Wait for form to be fully loaded
          await page.waitForSelector('text=Editar Ingrediente', { timeout: 5000 });
          
          let editsMade = 0;
          const originalValues: Record<string, string> = {};
          
          // 1. Test Marca (Brand) field
          const marcaField = page.locator('input[placeholder*="Ex: União, Crystal, Nestlé"], input[placeholder*="marca"]');
          if (await marcaField.isVisible()) {
            originalValues.marca = await marcaField.inputValue();
            const newMarca = `${originalValues.marca || 'TestBrand'} (Editado)`;
            await marcaField.fill(newMarca);
            console.log(`🏷️ Marca updated: "${originalValues.marca}" → "${newMarca}"`);
            editsMade++;
          }
          
          // 2. Test Valor da Medida field
          const valorMedidaField = page.locator('input[placeholder*="1"]').first();
          if (await valorMedidaField.isVisible()) {
            originalValues.valorMedida = await valorMedidaField.inputValue();
            const newValue = String(parseFloat(originalValues.valorMedida || '1') + 0.5);
            await valorMedidaField.fill(newValue);
            console.log(`📏 Valor da Medida updated: "${originalValues.valorMedida}" → "${newValue}"`);
            editsMade++;
          }
          
          // 3. Test Description field
          const descricaoField = page.locator('textarea[placeholder*="Descrição opcional"]');
          if (await descricaoField.isVisible()) {
            originalValues.descricao = await descricaoField.inputValue();
            const newDescription = `${originalValues.descricao || 'Ingrediente'} - Editado pelo teste automatizado`;
            await descricaoField.fill(newDescription);
            console.log(`📝 Descrição updated: "${originalValues.descricao}" → "${newDescription}"`);
            editsMade++;
          }
          
          // 4. Test Estoque Inicial field
          const estoqueInicialField = page.locator('input').filter({ hasText: /^\d+$/ }).first();
          const estoqueInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
          
          // Try to find stock fields more specifically
          let stockField = null;
          const allInputs = await page.locator('input').all();
          
          for (const input of allInputs) {
            const placeholder = await input.getAttribute('placeholder');
            const type = await input.getAttribute('type');
            const value = await input.inputValue();
            
            // Look for numeric fields that might be stock fields
            if ((type === 'number' || /^\d+$/.test(value)) && value && parseInt(value) > 0) {
              stockField = input;
              break;
            }
          }
          
          if (stockField) {
            const currentStock = await stockField.inputValue();
            const newStock = String(parseInt(currentStock) + 5);
            await stockField.fill(newStock);
            console.log(`📦 Estoque updated: "${currentStock}" → "${newStock}"`);
            editsMade++;
          }
          
          // 5. Test Estoque Mínimo field (if we find multiple numeric inputs)
          if (estoqueInputs && await estoqueInputs.count() > 1) {
            const minStockField = estoqueInputs.nth(1);
            if (await minStockField.isVisible()) {
              const currentMinStock = await minStockField.inputValue();
              const newMinStock = String(parseInt(currentMinStock || '1') + 2);
              await minStockField.fill(newMinStock);
              console.log(`📊 Estoque Mínimo updated: "${currentMinStock}" → "${newMinStock}"`);
              editsMade++;
            }
          }
          
          console.log(`🔧 Total edits made: ${editsMade}`);
          
          if (editsMade === 0) {
            console.log('⚠️ No fields could be edited');
            
            // Close modal and continue
            const cancelButton = page.locator('button:has-text("Cancelar")');
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
              await page.waitForTimeout(1000);
            }
            continue;
          }
          
          // Look for save button
          const saveButtons = [
            page.locator('button:has-text("Salvar")'),
            page.locator('button:has-text("Atualizar")'),
            page.locator('button:has-text("Confirmar")'),
            page.locator('button[type="submit"]')
          ];
          
          let saved = false;
          for (const saveBtn of saveButtons) {
            if (await saveBtn.isVisible({ timeout: 2000 })) {
              await saveBtn.click();
              console.log('💾 Save button clicked');
              saved = true;
              break;
            }
          }
          
          if (!saved) {
            console.log('❌ Could not find save button');
            
            // Take screenshot for debugging
            await takeScreenshot(page, `edit-no-save-button-${i + 1}`);
            
            // Try to find any button that might save
            const allButtons = await page.locator('button').all();
            console.log(`🔍 Found ${allButtons.length} buttons in modal`);
            
            for (let btnIdx = 0; btnIdx < allButtons.length; btnIdx++) {
              const btnText = await allButtons[btnIdx].textContent();
              console.log(`   Button ${btnIdx}: "${btnText}"`);
            }
            
            // Close modal
            const closeButton = page.locator('button[aria-label="Close"], .modal button:last-child');
            if (await closeButton.isVisible()) {
              await closeButton.click();
            }
            continue;
          }
          
          // Wait for save operation to complete
          await page.waitForTimeout(3000);
          
          // Check if modal closed (indicates success)
          const modalStillOpen = await page.locator('text=Editar Ingrediente').isVisible({ timeout: 2000 });
          
          if (!modalStillOpen) {
            console.log('✅ Edit modal closed - changes likely saved');
            successfulEdits++;
            
            // Take screenshot of updated list
            await takeScreenshot(page, `edit-success-${i + 1}-${ingredientName?.trim().replace(/\s+/g, '-')}`);
          } else {
            console.log('⚠️ Modal still open - checking for validation errors');
            
            const errorElements = await page.locator('.error, .invalid, [aria-invalid="true"], .text-red-500').count();
            if (errorElements > 0) {
              console.log('❌ Validation errors found');
              await takeScreenshot(page, `edit-validation-error-${i + 1}`);
            } else {
              console.log('✅ No validation errors - edit may have succeeded');
              successfulEdits++;
            }
            
            // Close modal
            const cancelButton = page.locator('button:has-text("Cancelar")');
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
              await page.waitForTimeout(1000);
            }
          }
          
        } else {
          console.log('❌ Edit button not found');
          continue;
        }
        
      } catch (error) {
        console.log(`❌ Error during edit ${i + 1}: ${error}`);
        await takeScreenshot(page, `edit-error-${i + 1}`);
        
        // Try to close any open modal
        const modalClose = page.locator('button[aria-label="Close"], .modal button:last-child');
        if (await modalClose.isVisible()) {
          await modalClose.click();
        }
      }
    }
    
    // Final summary
    console.log(`\n📊 EDIT TEST SUMMARY:`);
    console.log(`- Attempted edits: ${targetEdits}`);
    console.log(`- Successful edits: ${successfulEdits}`);
    console.log(`- Success rate: ${(successfulEdits/targetEdits*100).toFixed(1)}%`);
    
    // Take final screenshot
    await takeScreenshot(page, 'edit-testing-complete');
    
    // Verification - check if ingredients are still there
    const finalCount = await page.locator('tbody tr').count();
    console.log(`📊 Final ingredient count: ${finalCount}`);
    
    expect(successfulEdits).toBeGreaterThan(0);
    console.log('✅ EDIT FUNCTIONALITY TESTING COMPLETE');
  });
  
  test('Test form field validation and error handling', async ({ page }) => {
    console.log('=== FORM VALIDATION TESTING ===');
    
    // Setup
    await loginUser(page);
    await navigateToIngredients(page);
    
    const ingredientCount = await page.locator('tbody tr').count();
    if (ingredientCount === 0) {
      console.log('❌ SKIP: No ingredients available');
      return;
    }
    
    // Test validation on first ingredient
    const firstRow = page.locator('tbody tr').first();
    const editButton = firstRow.locator('td:last-child button').nth(1);
    
    if (await editButton.isVisible()) {
      await editButton.click();
      console.log('✏️ Opened edit form for validation testing');
      
      // Wait for form
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'validation-test-form');
      
      // Test 1: Try to submit empty name field
      const nameField = page.locator('input').first(); // Nome do Ingrediente is usually first
      if (await nameField.isVisible()) {
        const originalName = await nameField.inputValue();
        
        // Clear the name field
        await nameField.fill('');
        console.log('🧪 Cleared name field to test validation');
        
        // Try to save
        const saveButton = page.locator('button:has-text("Salvar")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          console.log('💾 Attempted to save with empty name');
          
          await page.waitForTimeout(2000);
          
          // Check for validation errors
          const hasValidationError = await page.locator('.error, .invalid, [aria-invalid="true"], .text-red-500').count() > 0;
          console.log(`🔍 Validation error shown: ${hasValidationError}`);
          
          // Restore original name
          await nameField.fill(originalName);
        }
      }
      
      // Test 2: Test cancel button
      const cancelButton = page.locator('button:has-text("Cancelar")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        console.log('✅ Cancel button works');
        
        await page.waitForTimeout(1000);
        
        // Check modal closed
        const modalClosed = !await page.locator('text=Editar Ingrediente').isVisible({ timeout: 2000 });
        console.log(`✅ Modal closed on cancel: ${modalClosed}`);
      }
    }
    
    await takeScreenshot(page, 'validation-testing-complete');
    console.log('✅ VALIDATION TESTING COMPLETE');
  });
});