import { test, expect } from '@playwright/test';

test.describe('Precise Ingredient Price Updates', () => {
  test('Update specific ingredient prices using exact selectors', async ({ page }) => {
    test.setTimeout(300000);

    console.log('=== Starting Precise Price Updates ===');
    
    // Login
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('load');
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Navigate to ingredients
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    console.log('✓ Successfully logged in and navigated to ingredients');

    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/precise-01-initial-state.png', 
      fullPage: true 
    });

    // First, let's analyze the exact structure of the edit buttons
    console.log('\\n=== Analyzing Edit Button Structure ===');
    
    // Look for the pencil icon buttons specifically
    const pencilButtons = await page.locator('button:has(svg[data-icon="edit"]), button:has([stroke="currentColor"]):has([d*="M15"]), button:has([d*="M11"]):has([d*="M15"])').all();
    console.log(`Found ${pencilButtons.length} pencil icon buttons`);
    
    // Also look for buttons in table rows
    const tableRows = await page.locator('tbody tr').all();
    console.log(`Found ${tableRows.length} table body rows`);
    
    // Let's examine the first few rows to understand the structure
    for (let i = 0; i < Math.min(3, tableRows.length); i++) {
      const row = tableRows[i];
      const ingredientName = await row.locator('td').first().textContent();
      const buttons = await row.locator('button').all();
      console.log(`Row ${i + 1}: "${ingredientName}" has ${buttons.length} buttons`);
      
      // Examine each button in this row
      for (let j = 0; j < buttons.length; j++) {
        const button = buttons[j];
        const buttonHTML = await button.innerHTML();
        const isEditButton = buttonHTML.includes('M15.232') || buttonHTML.includes('edit') || buttonHTML.includes('pencil');
        if (isEditButton) {
          console.log(`  Edit button found at position ${j + 1}`);
        }
      }
    }

    // Test clicking the first edit button to understand the form
    console.log('\\n=== Testing First Edit Button ===');
    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const ingredientName = await firstRow.locator('td').first().textContent();
      console.log(`Testing edit for: ${ingredientName}`);
      
      // Try to find the edit button - it should be the pencil icon (usually second button)
      const editButton = firstRow.locator('button').nth(1); // Second button is typically edit
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(2000);
        
        console.log('✓ Edit modal opened');
        
        // Take screenshot of the edit modal
        await page.screenshot({ 
          path: 'test-results/precise-02-edit-modal.png', 
          fullPage: true 
        });
        
        // Analyze the form structure
        console.log('\\n=== Edit Form Analysis ===');
        const inputs = await page.locator('input').all();
        console.log(`Found ${inputs.length} input fields:`);
        
        let priceFieldIndex = -1;
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const type = await input.getAttribute('type');
          const name = await input.getAttribute('name');
          const placeholder = await input.getAttribute('placeholder');
          const value = await input.inputValue();
          const label = await input.locator('../label').textContent().catch(() => '');
          
          console.log(`Input ${i + 1}:`, { type, name, placeholder, value, label });
          
          // Identify price field
          if (type === 'number' || 
              name?.toLowerCase().includes('price') ||
              name?.toLowerCase().includes('preco') ||
              placeholder?.toLowerCase().includes('price') ||
              placeholder?.toLowerCase().includes('preço') ||
              label?.toLowerCase().includes('preço') ||
              label?.toLowerCase().includes('price')) {
            priceFieldIndex = i;
            console.log(`🎯 PRICE FIELD IDENTIFIED: Input ${i + 1}`);
          }
        }
        
        if (priceFieldIndex >= 0) {
          const priceField = inputs[priceFieldIndex];
          
          // Test price update
          console.log('\\n=== Testing Price Update ===');
          await priceField.clear();
          await priceField.fill('123.45'); // Test value
          console.log('✓ Entered test price: 123.45');
          
          // Look for save button
          const saveButton = page.locator('button:has-text("Salvar"), button:has-text("Save"), button[type="submit"]').first();
          if (await saveButton.isVisible()) {
            const saveButtonText = await saveButton.textContent();
            console.log(`✓ Found save button: "${saveButtonText}"`);
            
            await saveButton.click();
            await page.waitForTimeout(3000);
            console.log('✓ Clicked save button');
            
            // Take screenshot after save
            await page.screenshot({ 
              path: 'test-results/precise-03-after-test-save.png', 
              fullPage: true 
            });
          } else {
            console.log('❌ No save button found');
            await page.keyboard.press('Escape');
          }
        } else {
          console.log('❌ No price field identified');
          await page.keyboard.press('Escape');
        }
      }
    }

    // Now proceed with systematic updates
    const targetPrices = [
      { name: 'Açúcar Refinado', price: '4.00' },
      { name: 'Chocolate em Pó', price: '20.00' }
    ];

    console.log('\\n=== Systematic Price Updates ===');
    
    for (const target of targetPrices) {
      console.log(`\\n--- Updating ${target.name} to R$ ${target.price} ---`);
      
      // Refresh page to ensure clean state
      await page.goto('http://localhost:3001/ingredients/inventory');
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);
      
      // Find the specific ingredient row
      const rows = await page.locator('tbody tr').all();
      let targetRowIndex = -1;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowText = await row.textContent();
        if (rowText?.includes(target.name)) {
          targetRowIndex = i;
          console.log(`✓ Found ${target.name} at row ${i + 1}`);
          break;
        }
      }
      
      if (targetRowIndex >= 0) {
        const targetRow = rows[targetRowIndex];
        
        // Click the edit button (second button in the row)
        const editButton = targetRow.locator('button').nth(1);
        await editButton.click();
        await page.waitForTimeout(2000);
        
        console.log(`✓ Opened edit form for ${target.name}`);
        
        // Find and update the price field
        const numberInput = page.locator('input[type="number"]').first();
        if (await numberInput.isVisible()) {
          await numberInput.clear();
          await numberInput.fill(target.price);
          console.log(`✓ Entered price: R$ ${target.price}`);
          
          // Save the changes
          const saveButton = page.locator('button:has-text("Salvar"), button[type="submit"]').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(3000);
            console.log(`✓ Saved price for ${target.name}`);
            
            // Take screenshot after each successful update
            await page.screenshot({ 
              path: `test-results/precise-updated-${target.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`, 
              fullPage: true 
            });
          } else {
            console.log(`❌ Save button not found for ${target.name}`);
            await page.keyboard.press('Escape');
          }
        } else {
          console.log(`❌ Price field not found for ${target.name}`);
          await page.keyboard.press('Escape');
        }
      } else {
        console.log(`❌ Could not find ingredient: ${target.name}`);
      }
    }

    // Check for other ingredients (scroll down to find Farinha de Trigo, Leite Integral, Margarina)
    console.log('\\n=== Looking for Additional Ingredients ===');
    
    // Scroll down to see if there are more ingredients
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    
    // Check if we can see more ingredients now
    const allText = await page.textContent('body');
    const additionalIngredients = ['Farinha de Trigo', 'Leite Integral', 'Margarina'];
    
    for (const ingredient of additionalIngredients) {
      if (allText?.includes(ingredient)) {
        console.log(`✓ Found additional ingredient: ${ingredient}`);
        
        // Try to update this ingredient too
        const rows = await page.locator('tbody tr').all();
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowText = await row.textContent();
          if (rowText?.includes(ingredient)) {
            console.log(`Attempting to update ${ingredient}...`);
            
            const editButton = row.locator('button').nth(1);
            await editButton.click();
            await page.waitForTimeout(2000);
            
            const numberInput = page.locator('input[type="number"]').first();
            if (await numberInput.isVisible()) {
              let price = '0.00';
              if (ingredient === 'Farinha de Trigo') price = '5.50';
              else if (ingredient === 'Leite Integral') price = '4.50';
              else if (ingredient === 'Margarina') price = '10.00';
              
              await numberInput.clear();
              await numberInput.fill(price);
              
              const saveButton = page.locator('button:has-text("Salvar"), button[type="submit"]').first();
              if (await saveButton.isVisible()) {
                await saveButton.click();
                await page.waitForTimeout(3000);
                console.log(`✓ Updated ${ingredient} to R$ ${price}`);
              }
            }
            break;
          }
        }
      } else {
        console.log(`❌ Additional ingredient not found: ${ingredient}`);
      }
    }

    // Final verification
    console.log('\\n=== Final Verification ===');
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/precise-99-final-result.png', 
      fullPage: true 
    });
    
    console.log('\\n✅ Precise price update process completed!');
    console.log('📸 Check precise-*.png screenshots for detailed results');
  });
});