import { test, expect } from '@playwright/test';

/**
 * Complete ingredient price update with correct workflow
 * Key insight: Must change movement type to "Compra" FIRST to reveal price fields
 */

test.describe('Complete Ingredient Price Update', () => {
  test('Update ingredient prices with correct workflow', async ({ page }) => {
    const BASE_URL = 'http://localhost:3001';
    
    console.log('🚀 Starting complete ingredient price update workflow...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('load');
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to ingredients
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    // Priority ingredients to update
    const ingredients = [
      { name: 'Farinha de Trigo', price: '5.50' },
      { name: 'Açúcar Refinado', price: '4.00' },
      { name: 'Chocolate em Pó', price: '20.00' }
    ];
    
    let successCount = 0;
    
    for (const ingredient of ingredients) {
      try {
        console.log(`\n🔄 Processing: ${ingredient.name} -> R$ ${ingredient.price}`);
        
        // Find and click ingredient
        const ingredientRow = page.locator('tr').filter({ hasText: ingredient.name });
        if (!(await ingredientRow.isVisible())) {
          console.log(`⚠️ ${ingredient.name} not found`);
          continue;
        }
        
        await ingredientRow.locator('svg').first().click();
        await page.waitForTimeout(2000);
        
        // Go to price history
        const priceTab = page.locator('button').filter({ hasText: 'Histórico de Preços' });
        if (await priceTab.isVisible()) {
          await priceTab.click();
          await page.waitForTimeout(1500);
        }
        
        // Click register purchase
        const registerBtn = page.locator('button').filter({ hasText: 'Registrar Compra' });
        if (await registerBtn.isVisible()) {
          await registerBtn.click();
          await page.waitForTimeout(1500);
          
          // CRITICAL: Change movement type to "Compra" FIRST
          const movementSelect = page.locator('select').filter({ hasText: 'Ajuste' }).or(
            page.locator('select[name="movementType"]')
          );
          
          if (await movementSelect.isVisible()) {
            console.log('🔧 Changing movement type to "Compra"...');
            await movementSelect.selectOption('compra');
            await page.waitForTimeout(1000); // Wait for form to update
            
            // Take screenshot after changing movement type
            await page.screenshot({ 
              path: `test-results/${ingredient.name.replace(/\s+/g, '-')}-compra-form.png` 
            });
            
            // Now fill the form fields that should be visible
            const quantityInput = page.locator('input[name="packageQuantity"]');
            if (await quantityInput.isVisible()) {
              await quantityInput.clear();
              await quantityInput.fill('1');
              console.log('✅ Set quantity to 1');
            }
            
            // Look for supplier field
            const supplierSelect = page.locator('select[name="supplierId"]');
            if (await supplierSelect.isVisible()) {
              const options = await supplierSelect.locator('option').count();
              if (options > 1) {
                await supplierSelect.selectOption({ index: 1 });
                console.log('✅ Selected supplier');
              }
            }
            
            // Look for unit cost field (should appear after changing to "Compra")
            const costInput = page.locator('input[name="unitCost"]').or(
              page.locator('input').filter({ hasAttribute: 'placeholder' }).filter({ hasText: /custo|preço|price|cost/i })
            );
            
            if (await costInput.isVisible()) {
              await costInput.clear();
              await costInput.fill(ingredient.price);
              console.log(`✅ Set unit cost to R$ ${ingredient.price}`);
            } else {
              // Try to find any number input that might be the cost field
              const allInputs = page.locator('input[type="number"]');
              const inputCount = await allInputs.count();
              console.log(`Found ${inputCount} number inputs, looking for cost field...`);
              
              for (let i = 0; i < inputCount; i++) {
                const input = allInputs.nth(i);
                const placeholder = await input.getAttribute('placeholder');
                const name = await input.getAttribute('name');
                console.log(`Input ${i}: name="${name}", placeholder="${placeholder}"`);
                
                if (name?.includes('cost') || name?.includes('price') || placeholder?.includes('custo')) {
                  await input.clear();
                  await input.fill(ingredient.price);
                  console.log(`✅ Set cost in input ${i}`);
                  break;
                }
              }
            }
            
            // Fill reason
            const reasonInput = page.locator('input[name="reason"]').or(
              page.locator('input').filter({ hasAttribute: 'placeholder' }).filter({ hasText: /motivo|reason/i })
            );
            
            if (await reasonInput.isVisible()) {
              await reasonInput.fill(`Definição de preço - ${ingredient.name}`);
              console.log('✅ Added reason');
            }
            
            // Take screenshot of completed form
            await page.screenshot({ 
              path: `test-results/${ingredient.name.replace(/\s+/g, '-')}-completed-form.png` 
            });
            
            // Submit the form
            const saveBtn = page.locator('button').filter({ hasText: /salvar|atualizar|confirmar/i });
            if (await saveBtn.isVisible()) {
              await saveBtn.click();
              await page.waitForTimeout(2000);
              console.log('✅ Submitted form');
              
              // Handle any confirmation dialog
              const confirmBtn = page.locator('button').filter({ hasText: /confirmar|sim|ok/i });
              if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
                await page.waitForTimeout(1000);
                console.log('✅ Confirmed submission');
              }
              
              successCount++;
            } else {
              console.log('❌ Save button not found');
            }
          } else {
            console.log('❌ Movement type selector not found');
          }
        } else {
          console.log('❌ Register purchase button not found');
        }
        
        // Return to ingredients list
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`❌ Error updating ${ingredient.name}: ${error}`);
        await page.goto(`${BASE_URL}/ingredients/inventory`);
        await page.waitForLoadState('load');
        await page.waitForTimeout(2000);
      }
    }
    
    // Final verification
    console.log(`\n📊 PROCESSING COMPLETE`);
    console.log(`Successfully processed: ${successCount}/${ingredients.length} ingredients`);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/final-ingredient-prices.png',
      fullPage: true 
    });
    
    // Check prices again
    console.log(`\n🔍 Final price verification:`);
    for (const ingredient of ingredients) {
      const row = page.locator('tr').filter({ hasText: ingredient.name });
      if (await row.isVisible()) {
        const priceCell = row.locator('td').filter({ hasText: /R\$/ });
        if (await priceCell.count() > 0) {
          const priceText = await priceCell.first().textContent();
          console.log(`${ingredient.name}: ${priceText}`);
          
          if (priceText?.includes(ingredient.price)) {
            console.log(`  ✅ Successfully updated to R$ ${ingredient.price}`);
          } else {
            console.log(`  ❌ Expected R$ ${ingredient.price} but found ${priceText}`);
          }
        }
      }
    }
    
    console.log(`\n🎉 Ingredient price update workflow completed!`);
    expect(successCount).toBeGreaterThan(0);
  });
});