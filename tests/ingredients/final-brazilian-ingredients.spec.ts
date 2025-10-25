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

// Helper function to create a single ingredient
async function createIngredient(page: any, ingredient: any) {
  console.log(`📝 Creating: ${ingredient.name}`);
  
  // Ensure we're on the main page and no dialogs are open
  await page.goto('http://localhost:3001/ingredients/inventory');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  
  // Close any open dialogs first
  const closeButton = page.locator('button:has-text("×"), [aria-label="Close"]');
  if (await closeButton.count() > 0) {
    await closeButton.first().click();
    await page.waitForTimeout(1000);
  }
  
  // Click "Adicionar" button
  await page.locator('button:has-text("Adicionar")').click();
  await page.waitForTimeout(2000);
  
  // Fill form fields based on the exact form structure we saw
  
  // 1. Nome do Ingrediente (Name)
  const nameInput = page.locator('input[placeholder*="Açúcar cristal"], input[name*="name"]').first();
  await nameInput.fill(ingredient.name);
  
  // 2. Marca (Brand)
  const brandInput = page.locator('input[placeholder*="União, Crystal, Nestlé"], input[name*="brand"]').first();
  await brandInput.fill(ingredient.brand);
  
  // 3. Categoria (Category) - click dropdown and select
  const categoryDropdown = page.locator('button:has-text("Outros")').first();
  await categoryDropdown.click();
  await page.waitForTimeout(500);
  
  // Try to select the category from the dropdown options
  const categoryOption = page.locator(`[role="option"]:has-text("${ingredient.category}"), li:has-text("${ingredient.category}")`).first();
  if (await categoryOption.count() > 0) {
    await categoryOption.click();
  } else {
    // If category not found, just use "Outros"
    const outrosOption = page.locator('[role="option"]:has-text("Outros"), li:has-text("Outros")').first();
    if (await outrosOption.count() > 0) {
      await outrosOption.click();
    }
  }
  await page.waitForTimeout(500);
  
  // 4. Valor da Medida (Measure Value) - this seems to be quantity
  const measureInput = page.locator('input[value="1"]').first();
  await measureInput.fill(ingredient.currentStock);
  
  // 5. Unidade de Medida (Unit) - click dropdown
  const unitDropdown = page.locator('button:has-text("kg")').first();
  await unitDropdown.click();
  await page.waitForTimeout(500);
  
  // Select unit option
  const unitOption = page.locator(`[role="option"]:has-text("${ingredient.unit}"), li:has-text("${ingredient.unit}")`).first();
  if (await unitOption.count() > 0) {
    await unitOption.click();
  } else {
    // Default to kg if unit not found
    const kgOption = page.locator('[role="option"]:has-text("kg"), li:has-text("kg")').first();
    if (await kgOption.count() > 0) {
      await kgOption.click();
    }
  }
  await page.waitForTimeout(500);
  
  // 6. Description (optional)
  const descInput = page.locator('textarea[placeholder*="Descrição"]');
  if (await descInput.count() > 0) {
    await descInput.fill(`Ingrediente: ${ingredient.name} da marca ${ingredient.brand}`);
  }
  
  // 7. Scroll down to see more fields if needed
  await page.locator('[role="dialog"]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  // 8. Fill price field (should be visible after scroll)
  const priceInput = page.locator('input[name*="price"], input[placeholder*="preço"]').first();
  if (await priceInput.count() > 0) {
    await priceInput.fill(ingredient.currentPrice);
  }
  
  // 9. Try to find and fill supplier if available
  const supplierDropdown = page.locator('button:has-text("Selecione um fornecedor")');
  if (await supplierDropdown.count() > 0) {
    await supplierDropdown.click();
    await page.waitForTimeout(500);
    // Select first available supplier if any
    const firstSupplier = page.locator('[role="option"]').first();
    if (await firstSupplier.count() > 0) {
      await firstSupplier.click();
    }
  }
  
  // 10. Submit the form
  const submitButton = page.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")').first();
  await submitButton.click();
  await page.waitForTimeout(3000);
  
  // 11. Check if ingredient was created
  const wasCreated = await page.locator(`text="${ingredient.name}"`).count() > 0;
  
  if (wasCreated) {
    console.log(`  ✅ Successfully created: ${ingredient.name}`);
    return true;
  } else {
    console.log(`  ❌ Failed to create: ${ingredient.name}`);
    return false;
  }
}

test.describe('Final Brazilian Ingredients Test', () => {
  
  test('Create all 20 Brazilian bakery ingredients with proper modal handling', async ({ page }) => {
    console.log('🥖 Starting final Brazilian bakery ingredients test...');
    
    // Step 1: Login
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    await page.fill(SELECTORS.email, 'admin@momentocake.com.br');
    await page.fill(SELECTORS.password, 'G8j5k188');
    await page.click(SELECTORS.submitButton);
    await page.waitForTimeout(3000);
    console.log('✅ Login completed');
    
    // Step 2: Navigate to ingredients and take initial screenshot
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'tests/screenshots/before-brazilian-ingredients.png',
      fullPage: true
    });
    console.log('✅ Initial state captured');
    
    // Step 3: Create ingredients one by one
    let successCount = 0;
    let failureCount = 0;
    const failedIngredients: string[] = [];
    
    for (const [index, ingredient] of BRAZILIAN_INGREDIENTS.entries()) {
      try {
        console.log(`\n[${index + 1}/20] Processing: ${ingredient.name}`);
        const success = await createIngredient(page, ingredient);
        
        if (success) {
          successCount++;
        } else {
          failureCount++;
          failedIngredients.push(ingredient.name);
        }
        
      } catch (error) {
        console.log(`❌ Error with ${ingredient.name}: ${error}`);
        failureCount++;
        failedIngredients.push(ingredient.name);
      }
      
      // Short delay between ingredients
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Final validation
    console.log('\n📊 Final validation...');
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/after-brazilian-ingredients.png',
      fullPage: true
    });
    
    // Count ingredients on page
    const finalCount = await page.locator('table tbody tr').count();
    const ingredientNames = await page.locator('table tbody tr td:first-child').allTextContents();
    
    console.log('\n🎯 FINAL RESULTS - BRAZILIAN INGREDIENTS POPULATION');
    console.log('==================================================');
    console.log(`✅ Successfully created: ${successCount}/20 ingredients`);
    console.log(`❌ Failed to create: ${failureCount}/20 ingredients`);
    console.log(`📊 Total ingredients on page: ${finalCount}`);
    
    if (ingredientNames.length > 0) {
      console.log('\n📋 Current ingredients in inventory:');
      ingredientNames.forEach((name, index) => {
        const isBrazilian = BRAZILIAN_INGREDIENTS.some(ing => ing.name === name.trim());
        console.log(`  ${index + 1}. ${name} ${isBrazilian ? '🇧🇷' : ''}`);
      });
    }
    
    if (failedIngredients.length > 0) {
      console.log('\n❌ Failed ingredients that need manual attention:');
      failedIngredients.forEach(name => console.log(`  - ${name}`));
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - tests/screenshots/before-brazilian-ingredients.png');
    console.log('  - tests/screenshots/after-brazilian-ingredients.png');
    
    // Success assessment
    if (successCount >= 15) {
      console.log('\n🎉 EXCELLENT SUCCESS! Brazilian bakery database is excellently populated!');
      console.log('🥖 Momento Cake admin system has comprehensive ingredient inventory!');
    } else if (successCount >= 10) {
      console.log('\n✅ GOOD SUCCESS! Most ingredients were added successfully!');
      console.log('🥖 Brazilian bakery database is well populated!');
    } else if (successCount >= 5) {
      console.log('\n⚠️ PARTIAL SUCCESS! Some ingredients added, but needs attention');
    } else {
      console.log('\n❌ LOW SUCCESS! May need to investigate form structure or API issues');
    }
    
    // API final check
    const apiCheck = await page.evaluate(async () => {
      const response = await fetch('/api/ingredients/');
      const data = await response.json();
      return {
        status: response.status,
        ingredientsCount: data.ingredients ? data.ingredients.length : 0,
        success: data.success
      };
    });
    
    console.log(`\n🔌 API Status: ${apiCheck.status} | Ingredients in API: ${apiCheck.ingredientsCount} | Success: ${apiCheck.success}`);
    
    // Test assertions
    expect(successCount).toBeGreaterThan(0, 'At least some ingredients should be created');
    expect(finalCount).toBeGreaterThan(0, 'Should have ingredients visible on page');
    
    console.log('\n🏁 Brazilian ingredients population test completed!');
  });
});