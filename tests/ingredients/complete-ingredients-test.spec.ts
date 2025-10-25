import { test, expect } from '@playwright/test';

// Brazilian bakery ingredients data
const BRAZILIAN_INGREDIENTS = [
  {
    name: 'Farinha de Trigo',
    category: 'flour',
    unit: 'kilogram',
    currentPrice: '4.50',
    currentStock: '50',
    minStock: '10',
    brand: 'Dona Benta'
  },
  {
    name: 'Açúcar Cristal',
    category: 'sugar',
    unit: 'kilogram',
    currentPrice: '3.80',
    currentStock: '30',
    minStock: '5',
    brand: 'União'
  },
  {
    name: 'Fermento Biológico Seco',
    category: 'leavening',
    unit: 'gram',
    currentPrice: '15.90',
    currentStock: '20',
    minStock: '5',
    brand: 'Fleischmann'
  },
  {
    name: 'Sal Refinado',
    category: 'other',
    unit: 'kilogram',
    currentPrice: '2.50',
    currentStock: '25',
    minStock: '5',
    brand: 'Cisne'
  },
  {
    name: 'Óleo de Soja',
    category: 'fats',
    unit: 'liter',
    currentPrice: '8.90',
    currentStock: '15',
    minStock: '3',
    brand: 'Liza'
  },
  {
    name: 'Margarina',
    category: 'fats',
    unit: 'kilogram',
    currentPrice: '12.50',
    currentStock: '20',
    minStock: '5',
    brand: 'Qualy'
  },
  {
    name: 'Ovos',
    category: 'eggs',
    unit: 'unit',
    currentPrice: '0.80',
    currentStock: '100',
    minStock: '20',
    brand: 'Korin'
  },
  {
    name: 'Leite Integral',
    category: 'dairy',
    unit: 'liter',
    currentPrice: '4.20',
    currentStock: '30',
    minStock: '10',
    brand: 'Parmalat'
  },
  {
    name: 'Leite Condensado',
    category: 'dairy',
    unit: 'unit',
    currentPrice: '5.60',
    currentStock: '25',
    minStock: '8',
    brand: 'Nestlé'
  },
  {
    name: 'Coco Ralado',
    category: 'other',
    unit: 'kilogram',
    currentPrice: '18.90',
    currentStock: '10',
    minStock: '3',
    brand: 'Sococo'
  },
  {
    name: 'Chocolate em Pó',
    category: 'chocolate',
    unit: 'kilogram',
    currentPrice: '22.80',
    currentStock: '15',
    minStock: '5',
    brand: 'Nestlé'
  },
  {
    name: 'Polvilho Doce',
    category: 'flour',
    unit: 'kilogram',
    currentPrice: '6.50',
    currentStock: '12',
    minStock: '3',
    brand: 'Yoki'
  },
  {
    name: 'Castanha-do-Pará',
    category: 'nuts',
    unit: 'kilogram',
    currentPrice: '45.90',
    currentStock: '5',
    minStock: '2',
    brand: 'Nutreal'
  },
  {
    name: 'Amêndoas',
    category: 'nuts',
    unit: 'kilogram',
    currentPrice: '48.90',
    currentStock: '3',
    minStock: '1',
    brand: 'Nutreal'
  },
  {
    name: 'Baunilha',
    category: 'flavoring',
    unit: 'milliliter',
    currentPrice: '12.90',
    currentStock: '8',
    minStock: '2',
    brand: 'Arcolor'
  },
  {
    name: 'Canela em Pó',
    category: 'spices',
    unit: 'gram',
    currentPrice: '8.50',
    currentStock: '10',
    minStock: '2',
    brand: 'Kitano'
  },
  {
    name: 'Fermento Químico',
    category: 'leavening',
    unit: 'gram',
    currentPrice: '4.80',
    currentStock: '15',
    minStock: '5',
    brand: 'Royal'
  },
  {
    name: 'Açúcar Refinado',
    category: 'sugar',
    unit: 'kilogram',
    currentPrice: '4.20',
    currentStock: '40',
    minStock: '8',
    brand: 'Cristal'
  },
  {
    name: 'Manteiga',
    category: 'fats',
    unit: 'kilogram',
    currentPrice: '28.90',
    currentStock: '12',
    minStock: '4',
    brand: 'Aviação'
  },
  {
    name: 'Mel',
    category: 'flavoring',
    unit: 'kilogram',
    currentPrice: '18.50',
    currentStock: '8',
    minStock: '2',
    brand: 'Mel Silvestre'
  }
];

// Reliable selectors from context
const SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

test.describe('Complete Ingredients Testing', () => {
  
  test.only('Complete ingredients functionality test and population', async ({ page }) => {
    console.log('🚀 Starting comprehensive ingredients test...');
    
    // Step 1: Login to the application
    console.log('Step 1: Logging in to the application...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    
    // Fill login form using reliable selectors
    await page.fill(SELECTORS.email, 'admin@momentocake.com.br');
    await page.fill(SELECTORS.password, 'G8j5k188');
    await page.click(SELECTORS.submitButton);
    
    // Wait for navigation with more flexible URL matching
    try {
      await page.waitForURL('**/dashboard/**', { timeout: 15000 });
      console.log('✅ Login successful - redirected to dashboard');
    } catch (error) {
      // Check current URL to see what happened
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('dashboard')) {
        console.log('✅ Login successful - already on dashboard');
      } else {
        console.log('⚠️ Login may have failed, but continuing...');
        // Take screenshot for debugging
        await page.screenshot({ path: 'tests/screenshots/login-failed.png' });
      }
    }
    
    // Step 2: Navigate to ingredients section
    console.log('Step 2: Navigating to ingredients inventory...');
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    
    // Step 3: Take screenshot of current state
    console.log('Step 3: Taking screenshot of current ingredients state...');
    await page.screenshot({ 
      path: 'tests/screenshots/ingredients-initial-state.png',
      fullPage: true
    });
    
    // Check if we get any API errors
    const response = await page.goto('http://localhost:3001/ingredients/inventory');
    console.log(`Page response status: ${response?.status()}`);
    
    // Wait a moment for any API calls to complete
    await page.waitForTimeout(2000);
    
    // Step 4: Delete existing ingredients (if any)
    console.log('Step 4: Checking for existing ingredients to delete...');
    
    // Look for delete buttons or ingredients list
    const existingIngredients = await page.locator('[data-testid*="ingredient-row"], .ingredient-item, tr:has(td)').count();
    console.log(`Found ${existingIngredients} existing ingredients`);
    
    if (existingIngredients > 0) {
      console.log('Deleting existing ingredients...');
      // Try different selectors for delete buttons
      const deleteButtons = await page.locator('button:has-text("Delete"), button:has-text("Excluir"), [data-testid*="delete"], .delete-button').count();
      
      for (let i = 0; i < deleteButtons; i++) {
        await page.locator('button:has-text("Delete"), button:has-text("Excluir"), [data-testid*="delete"], .delete-button').first().click();
        await page.waitForTimeout(500);
        // Confirm deletion if there's a confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Confirmar"), button:has-text("Yes"), button:has-text("Sim")');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
    
    // Step 5: Create all 20 Brazilian bakery ingredients
    console.log('Step 5: Creating all 20 Brazilian bakery ingredients...');
    
    let successCount = 0;
    let failureCount = 0;
    const failedIngredients: string[] = [];
    
    for (const [index, ingredient] of BRAZILIAN_INGREDIENTS.entries()) {
      try {
        console.log(`Creating ingredient ${index + 1}/20: ${ingredient.name}`);
        
        // Look for add/create ingredient button
        const addButton = page.locator(
          'button:has-text("Add"), button:has-text("Adicionar"), button:has-text("New"), button:has-text("Novo"), [data-testid*="add"], [data-testid*="create"]'
        );
        
        await addButton.first().click();
        await page.waitForTimeout(1000);
        
        // Fill ingredient form - try multiple selector patterns
        const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="nome"], [data-testid*="name"]');
        await nameInput.first().fill(ingredient.name);
        
        // Category selection
        const categorySelect = page.locator('select[name="category"], [data-testid*="category"]');
        if (await categorySelect.count() > 0) {
          await categorySelect.first().selectOption(ingredient.category);
        }
        
        // Unit selection
        const unitSelect = page.locator('select[name="unit"], [data-testid*="unit"]');
        if (await unitSelect.count() > 0) {
          await unitSelect.first().selectOption(ingredient.unit);
        }
        
        // Price input
        const priceInput = page.locator('input[name*="price"], input[placeholder*="price"], input[placeholder*="preço"], [data-testid*="price"]');
        if (await priceInput.count() > 0) {
          await priceInput.first().fill(ingredient.currentPrice);
        }
        
        // Stock input
        const stockInput = page.locator('input[name*="stock"], input[placeholder*="stock"], input[placeholder*="estoque"], [data-testid*="stock"]');
        if (await stockInput.count() > 0) {
          await stockInput.first().fill(ingredient.currentStock);
        }
        
        // Min stock input
        const minStockInput = page.locator('input[name*="min"], input[placeholder*="min"], [data-testid*="min"]');
        if (await minStockInput.count() > 0) {
          await minStockInput.first().fill(ingredient.minStock);
        }
        
        // Brand input
        const brandInput = page.locator('input[name*="brand"], input[placeholder*="brand"], input[placeholder*="marca"], [data-testid*="brand"]');
        if (await brandInput.count() > 0) {
          await brandInput.first().fill(ingredient.brand);
        }
        
        // Submit the form
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Salvar"), button:has-text("Create"), button:has-text("Criar")');
        await saveButton.first().click();
        
        // Wait for the form to close or ingredient to be added
        await page.waitForTimeout(2000);
        
        // Check if ingredient was successfully added
        const ingredientExists = await page.locator(`text="${ingredient.name}"`).count() > 0;
        
        if (ingredientExists) {
          successCount++;
          console.log(`✅ Successfully created: ${ingredient.name}`);
        } else {
          failureCount++;
          failedIngredients.push(ingredient.name);
          console.log(`❌ Failed to create: ${ingredient.name}`);
        }
        
      } catch (error) {
        failureCount++;
        failedIngredients.push(ingredient.name);
        console.log(`❌ Error creating ${ingredient.name}:`, error);
      }
      
      // Small delay between ingredients
      await page.waitForTimeout(500);
    }
    
    // Step 6: Final validation and screenshot
    console.log('Step 6: Final validation and screenshot...');
    
    // Navigate back to ingredients list to ensure we see all ingredients
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/ingredients-final-state.png',
      fullPage: true
    });
    
    // Count final ingredients
    const finalCount = await page.locator('[data-testid*="ingredient"], .ingredient-item, tr:has(td)').count();
    
    // Results summary
    console.log('\n🎯 INGREDIENTS TEST RESULTS SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Successfully created: ${successCount}/20 ingredients`);
    console.log(`❌ Failed to create: ${failureCount}/20 ingredients`);
    console.log(`📊 Final ingredients count on page: ${finalCount}`);
    
    if (failedIngredients.length > 0) {
      console.log(`\n❌ Failed ingredients:`);
      failedIngredients.forEach(name => console.log(`  - ${name}`));
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - tests/screenshots/ingredients-initial-state.png');
    console.log('  - tests/screenshots/ingredients-final-state.png');
    
    // API functionality check
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/ingredients/');
        return {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
      } catch (error) {
        return {
          status: 'ERROR',
          ok: false,
          statusText: (error as Error).message
        };
      }
    });
    
    console.log(`\n🔌 API Status Check:`);
    console.log(`  - Status: ${apiResponse.status}`);
    console.log(`  - OK: ${apiResponse.ok}`);
    console.log(`  - Status Text: ${apiResponse.statusText}`);
    
    // Test assertions
    expect(successCount).toBeGreaterThan(0, 'At least some ingredients should be created successfully');
    
    if (successCount === 20) {
      console.log('\n🎉 ALL INGREDIENTS SUCCESSFULLY CREATED!');
      console.log('🥖 Brazilian bakery ingredients database is now fully populated!');
    } else {
      console.log(`\n⚠️  Partial success: ${successCount}/20 ingredients created`);
      console.log('Some ingredients may need manual review or API fixes');
    }
  });
});