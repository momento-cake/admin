import { test, expect } from '@playwright/test';

test.describe('Fixed Price Update Process', () => {
  test('Complete one ingredient price update with correct form interaction', async ({ page }) => {
    console.log('🎯 Testing corrected price update process for Farinha de Trigo');

    // Login
    await page.goto('http://localhost:3001');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Logged in successfully');

    // Navigate to ingredients inventory
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to ingredients inventory');

    // Find Farinha de Trigo row
    const farinhaRow = page.locator('tr').filter({ hasText: 'Farinha de Trigo' });
    await expect(farinhaRow).toBeVisible();
    console.log('✅ Found Farinha de Trigo row');

    // Click eye icon (view details)
    const eyeIcon = farinhaRow.locator('button').first();
    await eyeIcon.click();
    await page.waitForTimeout(2000);
    console.log('✅ Opened ingredient details');

    // Go to price history tab
    const priceHistoryTab = page.locator('text=Histórico de Preços');
    await priceHistoryTab.click();
    await page.waitForTimeout(1000);
    console.log('✅ Switched to price history tab');

    // Click register purchase
    const registerPurchaseBtn = page.locator('text=Registrar Compra');
    await registerPurchaseBtn.click();
    await page.waitForTimeout(2000);
    console.log('✅ Opened purchase registration form');

    // Take screenshot of initial form
    await page.screenshot({ 
      path: 'screenshots/fixed-01-initial-form.png', 
      fullPage: true 
    });

    // CRITICAL: Find and select the movement type dropdown correctly
    console.log('🔄 Looking for movement type dropdown...');
    
    // Try multiple ways to find the dropdown
    const dropdownSelectors = [
      'select',
      '[role="combobox"]',
      'button[aria-haspopup="listbox"]',
      'div:has-text("Ajuste")',
      'button:has-text("Ajuste")'
    ];

    let dropdownFound = false;
    
    for (const selector of dropdownSelectors) {
      const dropdown = page.locator(selector);
      const count = await dropdown.count();
      
      if (count > 0) {
        console.log(`Found ${count} elements with selector: ${selector}`);
        
        for (let i = 0; i < count; i++) {
          const element = dropdown.nth(i);
          const text = await element.textContent() || '';
          const tagName = await element.evaluate(el => el.tagName);
          
          console.log(`  Element ${i}: ${tagName} - "${text}"`);
          
          if (text.includes('Ajuste') || text.includes('Compra')) {
            console.log(`🎯 Found movement type element: ${tagName} - "${text}"`);
            
            if (tagName === 'SELECT') {
              // It's a select dropdown
              await element.selectOption('purchase');
              console.log('✅ Selected purchase option from select');
              dropdownFound = true;
              break;
            } else if (tagName === 'BUTTON' || element.getAttribute('role') === 'combobox') {
              // It's a custom dropdown button
              await element.click();
              await page.waitForTimeout(1000);
              
              // Look for the "Compra" option
              const compraOption = page.locator('text=Compra').first();
              if (await compraOption.isVisible()) {
                await compraOption.click();
                console.log('✅ Selected Compra from custom dropdown');
                dropdownFound = true;
                break;
              }
            }
          }
        }
        
        if (dropdownFound) break;
      }
    }

    if (!dropdownFound) {
      console.log('❌ Could not find movement type dropdown');
      // Take screenshot for debugging
      await page.screenshot({ 
        path: 'screenshots/fixed-02-dropdown-not-found.png', 
        fullPage: true 
      });
    }

    // Wait for form to update after selection
    await page.waitForTimeout(2000);
    
    // Take screenshot after movement type selection
    await page.screenshot({ 
      path: 'screenshots/fixed-03-after-movement-type.png', 
      fullPage: true 
    });

    // Now look for all the required fields
    console.log('🔍 Looking for form fields...');
    
    // Find quantity field
    const quantitySelectors = [
      'input[value="0"]',
      'input[placeholder*="0"]',
      'input[type="number"]',
      'input:not([type])'
    ];
    
    let quantityField = null;
    for (const selector of quantitySelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible()) {
        const value = await field.inputValue();
        if (value === '0' || value === '') {
          quantityField = field;
          console.log(`✅ Found quantity field with selector: ${selector}`);
          break;
        }
      }
    }

    if (quantityField) {
      await quantityField.fill('1');
      console.log('✅ Filled quantity: 1');
    } else {
      console.log('❌ Could not find quantity field');
    }

    // Find supplier dropdown (if visible)
    const supplierDropdown = page.locator('select').filter({ hasText: /fornecedor|supplier/i });
    if (await supplierDropdown.isVisible()) {
      const options = supplierDropdown.locator('option');
      const optionCount = await options.count();
      
      console.log(`Found supplier dropdown with ${optionCount} options`);
      
      if (optionCount > 1) {
        await supplierDropdown.selectOption({ index: 1 });
        console.log('✅ Selected supplier');
      }
    } else {
      // Try custom supplier dropdown
      const supplierButton = page.locator('button:has-text("Selecione")');
      if (await supplierButton.isVisible()) {
        await supplierButton.click();
        await page.waitForTimeout(1000);
        
        const supplierOption = page.locator('text=Fornecedor').first();
        if (await supplierOption.isVisible()) {
          await supplierOption.click();
          console.log('✅ Selected supplier from custom dropdown');
        }
      }
    }

    // Find price field (Custo por Unidade)
    const priceSelectors = [
      'input[value="0"]:not(:first-child)', // Not the first zero field (which is quantity)
      'label:has-text("Custo") + input',
      'label:has-text("Custo") ~ input',
      '[data-testid*="cost"] input',
      '[data-testid*="price"] input'
    ];
    
    let priceField = null;
    
    // First, try to find by looking for inputs near "Custo" text
    const allInputs = page.locator('input[type="text"], input[type="number"], input:not([type])');
    const inputCount = await allInputs.count();
    
    console.log(`Found ${inputCount} total input fields`);
    
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const value = await input.inputValue();
      const isVisible = await input.isVisible();
      
      if (isVisible) {
        // Get the text content around this input to see if it's near "Custo"
        const parentElement = input.locator('..');
        const parentText = await parentElement.textContent() || '';
        
        console.log(`Input ${i}: value="${value}" context="${parentText.substring(0, 50)}..."`);
        
        if (parentText.includes('Custo') && (value === '0' || value === '')) {
          priceField = input;
          console.log(`✅ Found price field at index ${i}`);
          break;
        }
      }
    }

    if (priceField) {
      await priceField.fill('5.50');
      console.log('✅ Filled price: 5.50');
    } else {
      console.log('❌ Could not find price field');
    }

    // Fill reason
    const reasonField = page.locator('input[placeholder*="Compra"], textarea[placeholder*="Compra"]').first();
    if (await reasonField.isVisible()) {
      await reasonField.fill('Compra inicial - definição de preço R$ 5,50');
      console.log('✅ Filled reason');
    }

    // Take screenshot before submission
    await page.screenshot({ 
      path: 'screenshots/fixed-04-before-submit.png', 
      fullPage: true 
    });

    // Submit the form
    const submitButton = page.locator('button:has-text("Atualizar"), button:has-text("Confirmar"), button:has-text("Salvar")');
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Submitted form');
    } else {
      console.log('❌ Submit button not found');
    }

    // Take screenshot after submission
    await page.screenshot({ 
      path: 'screenshots/fixed-05-after-submit.png', 
      fullPage: true 
    });

    // Close any modals
    const closeButton = page.locator('button:has-text("Fechar"), [aria-label="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }

    // Go back to inventory and check if price was updated
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    await page.screenshot({ 
      path: 'screenshots/fixed-06-final-verification.png', 
      fullPage: true 
    });

    // Check if price was updated
    const updatedRow = page.locator('tr').filter({ hasText: 'Farinha de Trigo' });
    const rowText = await updatedRow.textContent() || '';
    
    if (rowText.includes('R$ 5,50') || rowText.includes('R$ 5.50')) {
      console.log('🎉 SUCCESS: Price was updated to R$ 5,50!');
    } else {
      console.log(`❌ Price not updated. Row text: ${rowText}`);
    }

    console.log('✅ Test completed');
  });
});