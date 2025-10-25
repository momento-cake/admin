import { test, expect } from '@playwright/test';

// All 20 Brazilian bakery ingredients
const BRAZILIAN_INGREDIENTS = [
  { name: 'Farinha de Trigo', category: 'flour', unit: 'kilogram', currentPrice: '4.50', currentStock: '50', minStock: '10', brand: 'Dona Benta' },
  { name: 'Açúcar Cristal', category: 'sugar', unit: 'kilogram', currentPrice: '3.80', currentStock: '30', minStock: '5', brand: 'União' },
  { name: 'Fermento Biológico Seco', category: 'leavening', unit: 'gram', currentPrice: '15.90', currentStock: '20', minStock: '5', brand: 'Fleischmann' },
  { name: 'Sal Refinado', category: 'other', unit: 'kilogram', currentPrice: '2.50', currentStock: '25', minStock: '5', brand: 'Cisne' },
  { name: 'Óleo de Soja', category: 'fats', unit: 'liter', currentPrice: '8.90', currentStock: '15', minStock: '3', brand: 'Liza' },
  { name: 'Margarina', category: 'fats', unit: 'kilogram', currentPrice: '12.50', currentStock: '20', minStock: '5', brand: 'Qualy' },
  { name: 'Ovos', category: 'eggs', unit: 'unit', currentPrice: '0.80', currentStock: '100', minStock: '20', brand: 'Korin' },
  { name: 'Leite Integral', category: 'dairy', unit: 'liter', currentPrice: '4.20', currentStock: '30', minStock: '10', brand: 'Parmalat' },
  { name: 'Leite Condensado', category: 'dairy', unit: 'unit', currentPrice: '5.60', currentStock: '25', minStock: '8', brand: 'Nestlé' },
  { name: 'Coco Ralado', category: 'other', unit: 'kilogram', currentPrice: '18.90', currentStock: '10', minStock: '3', brand: 'Sococo' },
  { name: 'Chocolate em Pó', category: 'chocolate', unit: 'kilogram', currentPrice: '22.80', currentStock: '15', minStock: '5', brand: 'Nestlé' },
  { name: 'Polvilho Doce', category: 'flour', unit: 'kilogram', currentPrice: '6.50', currentStock: '12', minStock: '3', brand: 'Yoki' },
  { name: 'Castanha-do-Pará', category: 'nuts', unit: 'kilogram', currentPrice: '45.90', currentStock: '5', minStock: '2', brand: 'Nutreal' },
  { name: 'Amêndoas', category: 'nuts', unit: 'kilogram', currentPrice: '48.90', currentStock: '3', minStock: '1', brand: 'Nutreal' },
  { name: 'Baunilha', category: 'flavoring', unit: 'milliliter', currentPrice: '12.90', currentStock: '8', minStock: '2', brand: 'Arcolor' },
  { name: 'Canela em Pó', category: 'spices', unit: 'gram', currentPrice: '8.50', currentStock: '10', minStock: '2', brand: 'Kitano' },
  { name: 'Fermento Químico', category: 'leavening', unit: 'gram', currentPrice: '4.80', currentStock: '15', minStock: '5', brand: 'Royal' },
  { name: 'Açúcar Refinado', category: 'sugar', unit: 'kilogram', currentPrice: '4.20', currentStock: '40', minStock: '8', brand: 'Cristal' },
  { name: 'Manteiga', category: 'fats', unit: 'kilogram', currentPrice: '28.90', currentStock: '12', minStock: '4', brand: 'Aviação' },
  { name: 'Mel', category: 'flavoring', unit: 'kilogram', currentPrice: '18.50', currentStock: '8', minStock: '2', brand: 'Mel Silvestre' }
];

const SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

test.describe('Populate Brazilian Bakery Ingredients', () => {
  
  test('Populate all 20 Brazilian bakery ingredients', async ({ page }) => {
    console.log('🥖 Starting Brazilian bakery ingredients population...');
    
    // Step 1: Login
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    await page.fill(SELECTORS.email, 'admin@momentocake.com.br');
    await page.fill(SELECTORS.password, 'G8j5k188');
    await page.click(SELECTORS.submitButton);
    await page.waitForTimeout(3000);
    console.log('✅ Login completed');
    
    // Step 2: Navigate to ingredients
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    console.log('✅ Navigated to ingredients inventory');
    
    // Step 3: Delete existing test ingredients
    console.log('🧹 Cleaning up existing test ingredients...');
    
    // Look for delete buttons in the actions column
    const deleteButtons = page.locator('button[aria-label*="delete"], button[title*="delete"], button:has(svg), td:last-child button').last();
    let deletedCount = 0;
    
    // Delete existing ingredients one by one
    while (await deleteButtons.count() > 0 && deletedCount < 10) {
      try {
        await deleteButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Handle confirmation dialog if it appears
        const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("Delete"), button:has-text("Yes")');
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          await page.waitForTimeout(1500);
        }
        
        deletedCount++;
        console.log(`Deleted ingredient ${deletedCount}`);
        
        // Break if no more delete buttons
        if (await deleteButtons.count() === 0) break;
        
      } catch (error) {
        console.log(`Could not delete ingredient: ${error}`);
        break;
      }
    }
    
    console.log(`✅ Deleted ${deletedCount} existing ingredients`);
    
    // Step 4: Add all 20 Brazilian ingredients
    console.log('🏗️ Creating all 20 Brazilian bakery ingredients...');
    
    let successCount = 0;
    let failureCount = 0;
    const failedIngredients: string[] = [];
    
    for (const [index, ingredient] of BRAZILIAN_INGREDIENTS.entries()) {
      try {
        console.log(`\n📝 Creating ${index + 1}/20: ${ingredient.name}`);
        
        // Click the "Adicionar" button
        const addButton = page.locator('button:has-text("Adicionar")');
        await addButton.click();
        await page.waitForTimeout(2000);
        
        // Fill the form fields
        console.log(`  - Filling name: ${ingredient.name}`);
        const nameField = page.locator('input[name="name"], input[placeholder*="nome"]');
        await nameField.fill(ingredient.name);
        
        // Fill brand if field exists
        const brandField = page.locator('input[name="brand"], input[placeholder*="marca"]');
        if (await brandField.count() > 0) {
          await brandField.fill(ingredient.brand);
          console.log(`  - Filled brand: ${ingredient.brand}`);
        }
        
        // Select category if dropdown exists
        const categorySelect = page.locator('select[name="category"], [role="combobox"]');
        if (await categorySelect.count() > 0) {
          await categorySelect.selectOption(ingredient.category);
          console.log(`  - Selected category: ${ingredient.category}`);
        }
        
        // Select unit if dropdown exists
        const unitSelect = page.locator('select[name="unit"]');
        if (await unitSelect.count() > 0) {
          await unitSelect.selectOption(ingredient.unit);
          console.log(`  - Selected unit: ${ingredient.unit}`);
        }
        
        // Fill price
        const priceField = page.locator('input[name*="price"], input[placeholder*="preço"]');
        if (await priceField.count() > 0) {
          await priceField.fill(ingredient.currentPrice);
          console.log(`  - Filled price: R$ ${ingredient.currentPrice}`);
        }
        
        // Fill stock
        const stockField = page.locator('input[name*="stock"], input[placeholder*="estoque"]');
        if (await stockField.count() > 0) {
          await stockField.fill(ingredient.currentStock);
          console.log(`  - Filled stock: ${ingredient.currentStock}`);
        }
        
        // Fill minimum stock
        const minStockField = page.locator('input[name*="min"], input[placeholder*="mínimo"]');
        if (await minStockField.count() > 0) {
          await minStockField.fill(ingredient.minStock);
          console.log(`  - Filled min stock: ${ingredient.minStock}`);
        }
        
        // Submit the form
        const submitButton = page.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")');
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        // Verify the ingredient was added
        const wasAdded = await page.locator(`text="${ingredient.name}"`).count() > 0;
        
        if (wasAdded) {
          successCount++;
          console.log(`  ✅ Successfully created: ${ingredient.name}`);
        } else {
          failureCount++;
          failedIngredients.push(ingredient.name);
          console.log(`  ❌ Failed to create: ${ingredient.name}`);
        }
        
      } catch (error) {
        failureCount++;
        failedIngredients.push(ingredient.name);
        console.log(`  ❌ Error creating ${ingredient.name}: ${error}`);
        
        // Try to close any open dialogs
        const closeButton = page.locator('button:has-text("×"), button[aria-label="Close"], button:has-text("Fechar")');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Small delay between ingredients
      await page.waitForTimeout(500);
    }
    
    // Step 5: Final validation and screenshot
    console.log('\n📊 Taking final screenshot and validation...');
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/brazilian-ingredients-complete.png',
      fullPage: true
    });
    
    // Count final ingredients on page
    const finalIngredientRows = await page.locator('table tbody tr, [role="table"] [role="row"]:not(:first-child)').count();
    
    // Get ingredient names from the page
    const ingredientNames = await page.locator('table tbody tr td:first-child, [role="table"] [role="row"] [role="cell"]:first-child').allTextContents();
    
    console.log('\n🎯 BRAZILIAN INGREDIENTS POPULATION RESULTS');
    console.log('===========================================');
    console.log(`✅ Successfully created: ${successCount}/20 ingredients`);
    console.log(`❌ Failed to create: ${failureCount}/20 ingredients`);
    console.log(`📊 Total ingredients visible on page: ${finalIngredientRows}`);
    
    if (ingredientNames.length > 0) {
      console.log('\n📋 Ingredients currently in inventory:');
      ingredientNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
    }
    
    if (failedIngredients.length > 0) {
      console.log('\n❌ Failed ingredients:');
      failedIngredients.forEach(name => console.log(`  - ${name}`));
    }
    
    console.log('\n📸 Screenshot saved: tests/screenshots/brazilian-ingredients-complete.png');
    
    // Final assessment
    if (successCount >= 15) {
      console.log('\n🎉 EXCELLENT! Most ingredients successfully created!');
      console.log('🥖 Brazilian bakery ingredients database is well populated!');
    } else if (successCount >= 10) {
      console.log('\n✅ GOOD! Majority of ingredients created successfully!');
      console.log('🥖 Brazilian bakery ingredients database is partially populated!');
    } else if (successCount >= 5) {
      console.log('\n⚠️ PARTIAL SUCCESS! Some ingredients created');
      console.log('May need to review form fields or API issues');
    } else {
      console.log('\n❌ LOW SUCCESS RATE! Need to investigate form structure');
      console.log('Check form field selectors and validation requirements');
    }
    
    // Test assertion
    expect(successCount).toBeGreaterThan(0, 'At least some ingredients should be created');
    expect(finalIngredientRows).toBeGreaterThan(0, 'Should have ingredients in the list');
  });
});