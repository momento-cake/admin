import { test, expect } from '@playwright/test';

test.describe('Ingredient Price Updates via Registrar Compra', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:3001');
    
    // Login with admin credentials
    await page.waitForLoadState('load');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    
    // Fill login form using verified selectors
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and navigation to dashboard
    await page.waitForURL('**/dashboard**');
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('Phase 1: Access Purchase Registration Form for Farinha de Trigo', async ({ page }) => {
    console.log('Phase 1: Accessing Purchase Registration Form');
    
    // Navigate to ingredients inventory
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    
    // Take screenshot of inventory page
    await page.screenshot({ 
      path: 'screenshots/ingredients-inventory.png', 
      fullPage: true 
    });
    
    // Look for Farinha de Trigo and click eye icon
    const farinhaRow = page.locator('tr').filter({ hasText: 'Farinha de Trigo' });
    await expect(farinhaRow).toBeVisible();
    
    // Click the eye icon (view details)
    const eyeIcon = farinhaRow.locator('button', { hasText: /👁️|view|detalhes/i }).first();
    await eyeIcon.click();
    
    // Wait for details modal/page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of details view
    await page.screenshot({ 
      path: 'screenshots/farinha-details-initial.png', 
      fullPage: true 
    });
    
    // Look for price history tab
    const priceHistoryTab = page.locator('text=Histórico de Preços').or(
      page.locator('[data-testid*="price-history"]')
    ).or(
      page.locator('button', { hasText: /preço|histórico/i })
    );
    
    if (await priceHistoryTab.isVisible()) {
      await priceHistoryTab.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of price history tab
      await page.screenshot({ 
        path: 'screenshots/price-history-tab.png', 
        fullPage: true 
      });
      
      // Look for "Registrar Compra" button
      const registerPurchaseBtn = page.locator('text=Registrar Compra').or(
        page.locator('button', { hasText: /registrar|compra/i })
      ).or(
        page.locator('[data-testid*="register-purchase"]')
      );
      
      if (await registerPurchaseBtn.isVisible()) {
        await registerPurchaseBtn.click();
        await page.waitForTimeout(2000);
        
        // Take detailed screenshot of purchase form
        await page.screenshot({ 
          path: 'screenshots/purchase-form-complete.png', 
          fullPage: true 
        });
        
        console.log('✅ Found Registrar Compra button and accessed form');
      } else {
        console.log('❌ Registrar Compra button not found in price history tab');
      }
    } else {
      console.log('❌ Price history tab not found, exploring other options...');
      
      // Try to find tabs or navigation within the details view
      const tabs = page.locator('[role="tab"]').or(
        page.locator('button', { hasText: /tab|aba/i })
      );
      const tabCount = await tabs.count();
      
      if (tabCount > 0) {
        console.log(`Found ${tabCount} tabs, exploring each...`);
        for (let i = 0; i < tabCount; i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(1000);
          await page.screenshot({ 
            path: `screenshots/tab-${i}.png`, 
            fullPage: true 
          });
        }
      }
    }
  });

  test('Phase 2: Explore Complete Purchase Form Structure', async ({ page }) => {
    console.log('Phase 2: Exploring Purchase Form Structure');
    
    // Navigate to ingredients and access Farinha de Trigo details
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    
    const farinhaRow = page.locator('tr').filter({ hasText: 'Farinha de Trigo' });
    const eyeIcon = farinhaRow.locator('button').first();
    await eyeIcon.click();
    await page.waitForTimeout(2000);
    
    // Try to access purchase form via different methods
    const methods = [
      { name: 'Price History Tab', selector: 'text=Histórico de Preços' },
      { name: 'Edit Button', selector: 'button:has-text("Editar")' },
      { name: 'Purchase Button', selector: 'button:has-text("Compra")' },
      { name: 'Add Purchase', selector: 'button:has-text("Adicionar")' },
      { name: 'Register Purchase', selector: 'button:has-text("Registrar")' }
    ];
    
    for (const method of methods) {
      const element = page.locator(method.selector);
      if (await element.isVisible()) {
        console.log(`✅ Found ${method.name} - clicking...`);
        await element.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot after clicking
        await page.screenshot({ 
          path: `screenshots/method-${method.name.toLowerCase().replace(' ', '-')}.png`, 
          fullPage: true 
        });
        
        // Look for form fields
        await exploreFormFields(page, method.name);
        
        // Try to go back for next method
        const backBtn = page.locator('button:has-text("Voltar")').or(
          page.locator('button:has-text("Cancelar")')
        );
        if (await backBtn.isVisible()) {
          await backBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('Phase 3: Alternative Approach - Check Edit Form', async ({ page }) => {
    console.log('Phase 3: Checking Edit Form for Price Fields');
    
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    
    // Try edit button (pencil icon) instead
    const farinhaRow = page.locator('tr').filter({ hasText: 'Farinha de Trigo' });
    const editIcon = farinhaRow.locator('button').nth(1); // Usually second button is edit
    
    if (await editIcon.isVisible()) {
      await editIcon.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'screenshots/edit-form-complete.png', 
        fullPage: true 
      });
      
      // Look for price-related fields
      const priceFields = [
        'input[name*="price"]',
        'input[name*="preço"]',
        'input[name*="valor"]',
        'input[name*="custo"]',
        'input[placeholder*="preço"]',
        'input[placeholder*="valor"]'
      ];
      
      for (const selector of priceFields) {
        const field = page.locator(selector);
        if (await field.isVisible()) {
          console.log(`✅ Found price field: ${selector}`);
          await field.highlight();
          await page.waitForTimeout(500);
        }
      }
      
      // Look for tabs within edit modal
      const editTabs = page.locator('[role="tab"]');
      const editTabCount = await editTabs.count();
      
      if (editTabCount > 0) {
        console.log(`Found ${editTabCount} tabs in edit form`);
        for (let i = 0; i < editTabCount; i++) {
          await editTabs.nth(i).click();
          await page.waitForTimeout(1000);
          await page.screenshot({ 
            path: `screenshots/edit-tab-${i}.png`, 
            fullPage: true 
          });
          
          // Check for price fields in this tab
          await exploreFormFields(page, `Edit Tab ${i}`);
        }
      }
    }
  });

  test('Phase 4: Check Suppliers/Fornecedores Menu', async ({ page }) => {
    console.log('Phase 4: Checking Suppliers Management');
    
    // Check if there's a suppliers menu option
    const supplierLinks = [
      'a[href*="suppliers"]',
      'a[href*="fornecedores"]',
      'text=Fornecedores',
      'text=Suppliers'
    ];
    
    for (const selector of supplierLinks) {
      const link = page.locator(selector);
      if (await link.isVisible()) {
        console.log(`✅ Found suppliers link: ${selector}`);
        await link.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'screenshots/suppliers-page.png', 
          fullPage: true 
        });
        
        // Look for add supplier or price management options
        const addSupplierBtn = page.locator('button:has-text("Adicionar")').or(
          page.locator('button:has-text("Novo")')
        );
        
        if (await addSupplierBtn.isVisible()) {
          await addSupplierBtn.click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({ 
            path: 'screenshots/add-supplier-form.png', 
            fullPage: true 
          });
        }
        break;
      }
    }
  });

  test('Phase 5: Complete Price Update for All Ingredients', async ({ page }) => {
    console.log('Phase 5: Attempting to Update All Ingredient Prices');
    
    const ingredients = [
      { name: 'Farinha de Trigo', price: '5.50' },
      { name: 'Açúcar Refinado', price: '4.00' },
      { name: 'Leite Integral', price: '4.50' },
      { name: 'Margarina', price: '10.00' },
      { name: 'Chocolate em Pó', price: '20.00' }
    ];
    
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    
    for (const ingredient of ingredients) {
      console.log(`Updating price for: ${ingredient.name}`);
      
      try {
        // Find ingredient row
        const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
        await expect(ingredientRow).toBeVisible();
        
        // Try different approaches to update price
        await updateIngredientPrice(page, ingredient.name, ingredient.price);
        
        // Take screenshot after attempt
        await page.screenshot({ 
          path: `screenshots/after-update-${ingredient.name.toLowerCase().replace(/\s+/g, '-')}.png`, 
          fullPage: true 
        });
        
      } catch (error) {
        console.log(`❌ Failed to update ${ingredient.name}: ${error.message}`);
      }
    }
    
    // Final verification - check if prices are updated
    await page.reload();
    await page.waitForLoadState('load');
    
    await page.screenshot({ 
      path: 'screenshots/final-inventory-state.png', 
      fullPage: true 
    });
    
    // Check each ingredient for updated price
    for (const ingredient of ingredients) {
      const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
      const hasCorrectPrice = ingredientRow.locator(`text=R$ ${ingredient.price}`);
      
      if (await hasCorrectPrice.isVisible()) {
        console.log(`✅ ${ingredient.name} shows correct price: R$ ${ingredient.price}`);
      } else {
        console.log(`❌ ${ingredient.name} price not updated correctly`);
      }
    }
  });

});

// Helper function to explore form fields
async function exploreFormFields(page, context: string) {
    console.log(`Exploring form fields in: ${context}`);
    
    // Look for all input fields
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    console.log(`Found ${inputCount} input fields`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const type = await input.getAttribute('type') || 'unknown';
      const name = await input.getAttribute('name') || 'unnamed';
      const placeholder = await input.getAttribute('placeholder') || '';
      
      console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
      
      // Highlight price-related fields
      if (name.includes('price') || name.includes('preço') || name.includes('valor') || 
          placeholder.includes('preço') || placeholder.includes('valor')) {
        await input.highlight();
        console.log(`🎯 Found potential price field: ${name || placeholder}`);
      }
    }
    
    // Look for select fields
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    if (selectCount > 0) {
      console.log(`Found ${selectCount} select fields`);
      
      for (let i = 0; i < selectCount; i++) {
        const select = selects.nth(i);
        const name = await select.getAttribute('name') || 'unnamed';
        console.log(`Select ${i}: name=${name}`);
        
        // Check if it's a movement type selector
        if (name.includes('tipo') || name.includes('type')) {
          const options = select.locator('option');
          const optionCount = await options.count();
          
          console.log(`Movement type selector found with ${optionCount} options:`);
          for (let j = 0; j < optionCount; j++) {
            const optionText = await options.nth(j).textContent();
            console.log(`  Option ${j}: ${optionText}`);
          }
          
          // Try changing to different options to see if form changes
          for (let j = 1; j < optionCount; j++) {
            await select.selectOption({ index: j });
            await page.waitForTimeout(1000);
            
            const optionText = await options.nth(j).textContent();
            await page.screenshot({ 
              path: `screenshots/form-option-${j}-${optionText?.replace(/\s+/g, '-')}.png`, 
              fullPage: true 
            });
          }
        }
      }
    }
  }

// Helper function to attempt price update
async function updateIngredientPrice(page, ingredientName: string, price: string) {
    const ingredientRow = page.locator('tr').filter({ hasText: ingredientName });
    
    // Try eye icon first (view/details)
    const eyeIcon = ingredientRow.locator('button').first();
    await eyeIcon.click();
    await page.waitForTimeout(2000);
    
    // Look for price history tab or similar
    const priceTab = page.locator('text=Histórico de Preços');
    if (await priceTab.isVisible()) {
      await priceTab.click();
      await page.waitForTimeout(1000);
      
      // Look for register purchase button
      const registerBtn = page.locator('text=Registrar Compra');
      if (await registerBtn.isVisible()) {
        await registerBtn.click();
        await page.waitForTimeout(2000);
        
        // Fill purchase form
        await fillPurchaseForm(page, price);
        return true;
      }
    }
    
    // If that doesn't work, try edit button
    const editIcon = ingredientRow.locator('button').nth(1);
    if (await editIcon.isVisible()) {
      await editIcon.click();
      await page.waitForTimeout(2000);
      
      // Look for price field in edit form
      const priceField = page.locator('input[name*="price"]').or(
        page.locator('input[name*="preço"]')
      ).or(
        page.locator('input[placeholder*="preço"]')
      );
      
      if (await priceField.isVisible()) {
        await priceField.fill(price);
        
        // Submit form
        const saveBtn = page.locator('button:has-text("Salvar")');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
          return true;
        }
      }
    }
    
    return false;
  }

// Helper function to fill purchase form
async function fillPurchaseForm(page, price: string) {
    // Fill quantity
    const quantityField = page.locator('input[name*="quantidade"]').or(
      page.locator('input[placeholder*="quantidade"]')
    );
    if (await quantityField.isVisible()) {
      await quantityField.fill('10');
    }
    
    // Fill price
    const priceFields = [
      'input[name*="price"]',
      'input[name*="preço"]',
      'input[name*="valor"]',
      'input[placeholder*="preço"]',
      'input[placeholder*="valor"]'
    ];
    
    for (const selector of priceFields) {
      const field = page.locator(selector);
      if (await field.isVisible()) {
        await field.fill(price);
        break;
      }
    }
    
    // Fill reason/motive
    const reasonField = page.locator('input[name*="motivo"]').or(
      page.locator('textarea[name*="motivo"]')
    );
    if (await reasonField.isVisible()) {
      await reasonField.fill('Compra inicial - definição de preço');
    }
    
    // Submit form
    const submitBtn = page.locator('button:has-text("Confirmar")').or(
      page.locator('button:has-text("Salvar")')
    ).or(
      page.locator('button[type="submit"]')
    );
    
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
  }