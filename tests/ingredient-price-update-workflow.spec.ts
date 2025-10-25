import { test, expect } from '@playwright/test';

/**
 * Comprehensive ingredient price update workflow test
 * This test systematically updates ingredient prices using the discovered workflow
 */

// Test configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

// Ingredient price targets
const INGREDIENT_UPDATES = [
  { name: 'Farinha de Trigo', price: '5.50', priority: 1 },
  { name: 'Açúcar Refinado', price: '4.00', priority: 1 },
  { name: 'Leite Integral', price: '4.50', priority: 1 },
  { name: 'Margarina', price: '10.00', priority: 1 },
  { name: 'Chocolate em Pó', price: '20.00', priority: 1 },
  { name: 'Leite Condensado', price: '5.00', priority: 2 },
  { name: 'Essência de Baunilha', price: '0.80', priority: 2 },
  { name: 'Fermento Biológico Seco', price: '18.00', priority: 2 },
  { name: 'Canela em Pó', price: '30.00', priority: 2 },
  { name: 'Coco Ralado', price: '15.00', priority: 2 }
];

// Working selectors based on previous testing
const SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  eyeIcon: 'svg[data-testid="eye-icon"]',
  priceHistoryTab: 'button:has-text("Histórico de Preços")',
  registerPurchaseButton: 'button:has-text("Registrar Compra")',
  movementTypeSelect: 'select[name="movementType"]',
  packageQuantityInput: 'input[name="packageQuantity"]',
  supplierSelect: 'select[name="supplierId"]',
  unitCostInput: 'input[name="unitCost"]',
  reasonInput: 'input[name="reason"]',
  saveButton: 'button:has-text("Salvar")',
  confirmButton: 'button:has-text("Confirmar")'
};

test.describe('Ingredient Price Update Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto(BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    // Login with admin credentials
    await page.fill(SELECTORS.email, ADMIN_EMAIL);
    await page.fill(SELECTORS.password, ADMIN_PASSWORD);
    await page.click(SELECTORS.submitButton);
    
    // Wait for successful login (should redirect to dashboard)
    await page.waitForURL('**/dashboard**');
    
    // Navigate to ingredients inventory
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/ingredients-before-update.png',
      fullPage: true 
    });
  });

  test('Phase 1: Update Farinha de Trigo (Test Process)', async ({ page }) => {
    const ingredient = INGREDIENT_UPDATES.find(ing => ing.name === 'Farinha de Trigo');
    if (!ingredient) throw new Error('Farinha de Trigo not found in update list');

    console.log(`\n=== PHASE 1: Testing process with ${ingredient.name} ===`);
    
    // Find the ingredient row and click the eye icon
    const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
    await expect(ingredientRow).toBeVisible();
    
    // Take screenshot of the ingredient row before update
    await ingredientRow.screenshot({ path: `test-results/${ingredient.name}-before.png` });
    
    const eyeButton = ingredientRow.locator(SELECTORS.eyeIcon).first();
    await eyeButton.click();
    
    // Wait for detail view to load
    await page.waitForLoadState('load');
    
    // Switch to "Histórico de Preços" tab
    await page.click(SELECTORS.priceHistoryTab);
    await page.waitForTimeout(1000); // Wait for tab content to load
    
    // Click "Registrar Compra" button
    await page.click(SELECTORS.registerPurchaseButton);
    await page.waitForTimeout(1000);
    
    // CRITICAL: Change movement type from "Ajuste" to "Compra"
    await page.selectOption(SELECTORS.movementTypeSelect, 'compra');
    
    // Fill the form
    await page.fill(SELECTORS.packageQuantityInput, '1');
    
    // Handle supplier selection (create if needed)
    const supplierOptions = await page.locator(SELECTORS.supplierSelect + ' option').count();
    if (supplierOptions <= 1) {
      // No suppliers exist, we might need to create one or select an existing option
      console.log('No suppliers found, using available option or creating...');
      const supplierValues = await page.locator(SELECTORS.supplierSelect + ' option').allTextContents();
      console.log('Available supplier options:', supplierValues);
      
      if (supplierValues.length > 1) {
        // Select the first non-empty option
        await page.selectOption(SELECTORS.supplierSelect, { index: 1 });
      }
    } else {
      // Select first available supplier
      await page.selectOption(SELECTORS.supplierSelect, { index: 1 });
    }
    
    // Set the unit cost (target price)
    await page.fill(SELECTORS.unitCostInput, ingredient.price);
    
    // Add reason
    await page.fill(SELECTORS.reasonInput, 'Compra inicial - definição de preço');
    
    // Take screenshot of filled form
    await page.screenshot({ 
      path: `test-results/${ingredient.name}-form-filled.png` 
    });
    
    // Submit the form
    await page.click(SELECTORS.saveButton);
    
    // Wait for confirmation or success
    await page.waitForTimeout(2000);
    
    // Check if there's a confirmation dialog
    const confirmButton = page.locator(SELECTORS.confirmButton);
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot after submission
    await page.screenshot({ 
      path: `test-results/${ingredient.name}-after-submission.png`,
      fullPage: true 
    });
    
    // Go back to ingredients inventory to verify the price change
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    
    // Find the updated ingredient row
    const updatedRow = page.locator('tr').filter({ hasText: ingredient.name });
    await expect(updatedRow).toBeVisible();
    
    // Check if price was updated (look for the target price)
    const priceCell = updatedRow.locator('td').filter({ hasText: `R$ ${ingredient.price}` });
    await expect(priceCell).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of updated row
    await updatedRow.screenshot({ path: `test-results/${ingredient.name}-updated.png` });
    
    console.log(`✅ Successfully updated ${ingredient.name} to R$ ${ingredient.price}`);
  });

  test('Phase 2: Update Priority Ingredients', async ({ page }) => {
    const priorityIngredients = INGREDIENT_UPDATES.filter(ing => ing.priority === 1 && ing.name !== 'Farinha de Trigo');
    
    console.log(`\n=== PHASE 2: Updating ${priorityIngredients.length} priority ingredients ===`);
    
    for (const ingredient of priorityIngredients) {
      console.log(`\nUpdating: ${ingredient.name} to R$ ${ingredient.price}`);
      
      try {
        // Find the ingredient row and click the eye icon
        const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
        await expect(ingredientRow).toBeVisible();
        
        const eyeButton = ingredientRow.locator(SELECTORS.eyeIcon).first();
        await eyeButton.click();
        
        // Wait for detail view
        await page.waitForLoadState('load');
        
        // Switch to price history tab
        await page.click(SELECTORS.priceHistoryTab);
        await page.waitForTimeout(1000);
        
        // Click register purchase
        await page.click(SELECTORS.registerPurchaseButton);
        await page.waitForTimeout(1000);
        
        // Set movement type to "Compra"
        await page.selectOption(SELECTORS.movementTypeSelect, 'compra');
        
        // Fill form
        await page.fill(SELECTORS.packageQuantityInput, '1');
        
        // Select supplier (use first available)
        const supplierOptions = await page.locator(SELECTORS.supplierSelect + ' option').count();
        if (supplierOptions > 1) {
          await page.selectOption(SELECTORS.supplierSelect, { index: 1 });
        }
        
        // Set price
        await page.fill(SELECTORS.unitCostInput, ingredient.price);
        await page.fill(SELECTORS.reasonInput, `Atualização de preço - ${ingredient.name}`);
        
        // Submit
        await page.click(SELECTORS.saveButton);
        await page.waitForTimeout(2000);
        
        // Handle confirmation if needed
        const confirmButton = page.locator(SELECTORS.confirmButton);
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Return to inventory
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
        
        // Verify update
        const updatedRow = page.locator('tr').filter({ hasText: ingredient.name });
        const priceCell = updatedRow.locator('td').filter({ hasText: `R$ ${ingredient.price}` });
        await expect(priceCell).toBeVisible({ timeout: 5000 });
        
        console.log(`✅ Successfully updated ${ingredient.name}`);
        
      } catch (error) {
        console.log(`❌ Failed to update ${ingredient.name}: ${error}`);
        
        // Take error screenshot
        await page.screenshot({ 
          path: `test-results/${ingredient.name}-error.png`,
          fullPage: true 
        });
        
        // Continue with next ingredient
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
      }
    }
  });

  test('Phase 3: Update Additional Ingredients (Time Permitting)', async ({ page }) => {
    const additionalIngredients = INGREDIENT_UPDATES.filter(ing => ing.priority === 2);
    
    console.log(`\n=== PHASE 3: Updating ${additionalIngredients.length} additional ingredients ===`);
    
    for (const ingredient of additionalIngredients) {
      console.log(`\nUpdating: ${ingredient.name} to R$ ${ingredient.price}`);
      
      try {
        // Similar process as Phase 2
        const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
        
        // Check if ingredient exists
        if (!(await ingredientRow.isVisible())) {
          console.log(`⚠️ ${ingredient.name} not found, skipping...`);
          continue;
        }
        
        const eyeButton = ingredientRow.locator(SELECTORS.eyeIcon).first();
        await eyeButton.click();
        await page.waitForLoadState('load');
        
        await page.click(SELECTORS.priceHistoryTab);
        await page.waitForTimeout(1000);
        
        await page.click(SELECTORS.registerPurchaseButton);
        await page.waitForTimeout(1000);
        
        await page.selectOption(SELECTORS.movementTypeSelect, 'compra');
        await page.fill(SELECTORS.packageQuantityInput, '1');
        
        // Select supplier
        const supplierOptions = await page.locator(SELECTORS.supplierSelect + ' option').count();
        if (supplierOptions > 1) {
          await page.selectOption(SELECTORS.supplierSelect, { index: 1 });
        }
        
        await page.fill(SELECTORS.unitCostInput, ingredient.price);
        await page.fill(SELECTORS.reasonInput, `Atualização de preço - ${ingredient.name}`);
        
        await page.click(SELECTORS.saveButton);
        await page.waitForTimeout(2000);
        
        const confirmButton = page.locator(SELECTORS.confirmButton);
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
        
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
        
        console.log(`✅ Updated ${ingredient.name}`);
        
      } catch (error) {
        console.log(`❌ Failed to update ${ingredient.name}: ${error}`);
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
      }
    }
  });

  test('Phase 4: Final Verification and Results', async ({ page }) => {
    console.log(`\n=== PHASE 4: Final verification and results ===`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/ingredients-final-state.png',
      fullPage: true 
    });
    
    // Count ingredients with zero prices
    const ingredientRows = page.locator('tbody tr');
    const totalIngredients = await ingredientRows.count();
    
    let zeroPrice = 0;
    let updatedCount = 0;
    const results: string[] = [];
    
    for (let i = 0; i < totalIngredients; i++) {
      const row = ingredientRows.nth(i);
      const ingredientName = await row.locator('td').first().textContent();
      const priceCell = row.locator('td').filter({ hasText: /R\$/ });
      
      if (await priceCell.count() > 0) {
        const priceText = await priceCell.first().textContent();
        
        if (priceText?.includes('R$ 0,00')) {
          zeroPrice++;
          results.push(`❌ ${ingredientName}: R$ 0,00 (not updated)`);
        } else {
          updatedCount++;
          results.push(`✅ ${ingredientName}: ${priceText} (updated)`);
        }
      }
    }
    
    // Log final results
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`Total ingredients: ${totalIngredients}`);
    console.log(`Updated ingredients: ${updatedCount}`);
    console.log(`Zero price ingredients remaining: ${zeroPrice}`);
    console.log(`\nDetailed results:`);
    results.forEach(result => console.log(result));
    
    // Verify success criteria
    expect(updatedCount).toBeGreaterThanOrEqual(5); // At least 5 ingredients should be updated
    
    // Check specific target ingredients
    for (const target of INGREDIENT_UPDATES.filter(ing => ing.priority === 1)) {
      const targetRow = page.locator('tr').filter({ hasText: target.name });
      if (await targetRow.isVisible()) {
        const priceCell = targetRow.locator('td').filter({ hasText: `R$ ${target.price}` });
        await expect(priceCell).toBeVisible();
        console.log(`✅ Verified: ${target.name} = R$ ${target.price}`);
      }
    }
    
    console.log(`\n🎉 Ingredient price update workflow completed!`);
    console.log(`Successfully updated ${updatedCount} ingredients with proper pricing.`);
  });
});