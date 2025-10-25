import { test, expect } from '@playwright/test';

// Complete Brazilian ingredients with all required data
const BRAZILIAN_INGREDIENTS = [
  { name: 'Farinha de Trigo', brand: 'Dona Benta', category: 'Farinhas', unit: 'kg', quantity: '5', price: '4.50', stock: '50', minStock: '10' },
  { name: 'Açúcar Cristal', brand: 'União', category: 'Açúcares', unit: 'kg', quantity: '1', price: '3.80', stock: '30', minStock: '5' },
  { name: 'Fermento Biológico Seco', brand: 'Fleischmann', category: 'Fermentos', unit: 'g', quantity: '125', price: '15.90', stock: '20', minStock: '5' },
  { name: 'Sal Refinado', brand: 'Cisne', category: 'Outros', unit: 'kg', quantity: '1', price: '2.50', stock: '25', minStock: '5' },
  { name: 'Óleo de Soja', brand: 'Liza', category: 'Óleos e Gorduras', unit: 'l', quantity: '1', price: '8.90', stock: '15', minStock: '3' },
  { name: 'Margarina', brand: 'Qualy', category: 'Óleos e Gorduras', unit: 'kg', quantity: '1', price: '12.50', stock: '20', minStock: '5' },
  { name: 'Ovos', brand: 'Korin', category: 'Laticínios e Ovos', unit: 'unidade', quantity: '1', price: '0.80', stock: '100', minStock: '20' },
  { name: 'Leite Integral', brand: 'Parmalat', category: 'Laticínios e Ovos', unit: 'l', quantity: '1', price: '4.20', stock: '30', minStock: '10' },
  { name: 'Leite Condensado', brand: 'Nestlé', category: 'Laticínios e Ovos', unit: 'unidade', quantity: '1', price: '5.60', stock: '25', minStock: '8' },
  { name: 'Coco Ralado', brand: 'Sococo', category: 'Outros', unit: 'kg', quantity: '1', price: '18.90', stock: '10', minStock: '3' },
  { name: 'Chocolate em Pó', brand: 'Nestlé', category: 'Chocolates', unit: 'kg', quantity: '1', price: '22.80', stock: '15', minStock: '5' },
  { name: 'Polvilho Doce', brand: 'Yoki', category: 'Farinhas', unit: 'kg', quantity: '1', price: '6.50', stock: '12', minStock: '3' },
  { name: 'Castanha-do-Pará', brand: 'Nutreal', category: 'Castanhas e Nozes', unit: 'kg', quantity: '1', price: '45.90', stock: '5', minStock: '2' },
  { name: 'Amêndoas', brand: 'Nutreal', category: 'Castanhas e Nozes', unit: 'kg', quantity: '1', price: '48.90', stock: '3', minStock: '1' },
  { name: 'Baunilha', brand: 'Arcolor', category: 'Aromas e Essências', unit: 'ml', quantity: '30', price: '12.90', stock: '8', minStock: '2' },
  { name: 'Canela em Pó', brand: 'Kitano', category: 'Temperos e Especiarias', unit: 'g', quantity: '30', price: '8.50', stock: '10', minStock: '2' },
  { name: 'Fermento Químico', brand: 'Royal', category: 'Fermentos', unit: 'g', quantity: '100', price: '4.80', stock: '15', minStock: '5' },
  { name: 'Açúcar Refinado', brand: 'Cristal', category: 'Açúcares', unit: 'kg', quantity: '1', price: '4.20', stock: '40', minStock: '8' },
  { name: 'Manteiga', brand: 'Aviação', category: 'Óleos e Gorduras', unit: 'kg', quantity: '1', price: '28.90', stock: '12', minStock: '4' },
  { name: 'Mel', brand: 'Mel Silvestre', category: 'Adoçantes', unit: 'kg', quantity: '1', price: '18.50', stock: '8', minStock: '2' }
];

test.describe('Complete Brazilian Ingredients Creation', () => {
  
  test('create all 20 Brazilian ingredients systematically', async ({ page }) => {
    console.log('🚀 Starting complete Brazilian ingredients creation...');

    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'load' });
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    
    // Wait with timeout handling
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch (e) {
      const currentUrl = page.url();
      if (!currentUrl.includes('dashboard')) {
        throw new Error(`Login failed, current URL: ${currentUrl}`);
      }
    }
    console.log('✅ Login successful');

    // Step 2: Navigate to ingredients
    await page.goto('http://localhost:3001/ingredients/inventory', { waitUntil: 'load' });
    await page.waitForTimeout(3000); // Wait for data to load
    console.log('✅ Ingredients page loaded');

    // Step 3: Take initial screenshot
    await page.screenshot({ path: 'ingredients-initial-complete.png', fullPage: true });
    console.log('📸 Initial state screenshot taken');

    // Step 4: Create all ingredients
    let createdCount = 0;
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < BRAZILIAN_INGREDIENTS.length; i++) {
      const ingredient = BRAZILIAN_INGREDIENTS[i];
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const positionInBatch = (i % BATCH_SIZE) + 1;
      
      console.log(`📝 Creating ingredient ${i + 1}/20 (Batch ${batchNumber}, Item ${positionInBatch}): ${ingredient.name}`);

      try {
        // Click add button
        await page.click('button:has-text("Adicionar")');
        await page.waitForTimeout(1000);

        // Fill form with comprehensive error handling
        const success = await fillIngredientForm(page, ingredient, i + 1);
        
        if (success) {
          createdCount++;
          console.log(`✅ Successfully created: ${ingredient.name} (${createdCount}/20)`);
        } else {
          console.error(`❌ Failed to create: ${ingredient.name}`);
          await page.screenshot({ path: `error-ingredient-${i + 1}-${ingredient.name.replace(/[^a-zA-Z0-9]/g, '-')}.png` });
        }

        // Take progress screenshots after every batch of 5
        if ((i + 1) % BATCH_SIZE === 0) {
          await page.reload({ waitUntil: 'load' });
          await page.waitForTimeout(3000);
          await page.screenshot({ 
            path: `batch-${batchNumber}-complete.png`, 
            fullPage: true 
          });
          console.log(`📸 Batch ${batchNumber} completion screenshot taken (${createdCount} ingredients created)`);
        }

      } catch (error) {
        console.error(`❌ Error processing ingredient ${ingredient.name}:`, error);
        await page.screenshot({ 
          path: `error-processing-${i + 1}-${ingredient.name.replace(/[^a-zA-Z0-9]/g, '-')}.png` 
        });
      }
    }

    // Step 5: Final validation
    console.log('📝 Final validation...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5000); // Extra time for all data to load
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'ingredients-final-all-20-complete.png', 
      fullPage: true 
    });
    console.log('📸 Final validation screenshot taken');

    // Count ingredients in the table
    try {
      const rows = await page.locator('tbody tr').count();
      console.log(`📊 Total ingredient rows found: ${rows}`);
      
      // Check for specific ingredient names
      let foundIngredients = [];
      for (const ingredient of BRAZILIAN_INGREDIENTS) {
        try {
          const found = await page.getByText(ingredient.name, { exact: false }).isVisible();
          if (found) {
            foundIngredients.push(ingredient.name);
          }
        } catch (e) {
          // Ingredient not found
        }
      }
      
      console.log(`✅ Found ${foundIngredients.length}/20 ingredients in the list:`);
      foundIngredients.forEach(name => console.log(`  - ${name}`));
      
      if (foundIngredients.length >= 18) {
        console.log('🎉 SUCCESS: Most ingredients created successfully!');
      } else {
        console.log(`⚠️  Only ${foundIngredients.length}/20 ingredients found. Some may need retry.`);
      }
      
    } catch (error) {
      console.error('❌ Error during final validation:', error);
    }

    console.log(`🏁 Process completed. Created ${createdCount}/20 ingredients`);
  });
});

async function fillIngredientForm(page, ingredient, ingredientNumber) {
  try {
    console.log(`🛠️ Filling form for: ${ingredient.name}`);

    // Wait for form to be visible
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });

    // Fill basic information
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="name"]', ingredient.name);
    await page.waitForTimeout(200);

    await page.fill('input[name="brand"]', '');
    await page.fill('input[name="brand"]', ingredient.brand);
    await page.waitForTimeout(200);

    // Handle category dropdown - try different approaches
    try {
      // Look for category dropdown
      const categoryDropdown = page.locator('button:has-text("Outros"), button:has-text("Selecione")').first();
      if (await categoryDropdown.isVisible()) {
        await categoryDropdown.click();
        await page.waitForTimeout(500);
        
        // Try to find and click the category option
        const categoryOption = page.locator(`text="${ingredient.category}"`).first();
        if (await categoryOption.isVisible()) {
          await categoryOption.click();
          console.log(`✅ Category selected: ${ingredient.category}`);
        } else {
          // Fallback to "Outros" if specific category not found
          await page.locator('text="Outros"').first().click();
          console.log(`⚠️  Using 'Outros' category for: ${ingredient.name}`);
        }
        await page.waitForTimeout(200);
      }
    } catch (e) {
      console.log(`⚠️  Category selection issue for ${ingredient.name}: ${e.message}`);
    }

    // Fill quantity/measure value
    try {
      const measureInput = page.locator('input[placeholder="1"]').first();
      if (await measureInput.isVisible()) {
        await measureInput.fill('');
        await measureInput.fill(ingredient.quantity);
        await page.waitForTimeout(200);
      }
    } catch (e) {
      console.log(`⚠️  Measure input issue: ${e.message}`);
    }

    // Handle unit dropdown
    try {
      const unitDropdown = page.locator('button:has-text("kg"), button:has-text("unidade")').first();
      if (await unitDropdown.isVisible()) {
        await unitDropdown.click();
        await page.waitForTimeout(500);
        
        const unitOption = page.locator(`text="${ingredient.unit}"`).first();
        if (await unitOption.isVisible()) {
          await unitOption.click();
          console.log(`✅ Unit selected: ${ingredient.unit}`);
        } else {
          // Close dropdown if option not found
          await page.keyboard.press('Escape');
          console.log(`⚠️  Unit '${ingredient.unit}' not found, keeping default`);
        }
        await page.waitForTimeout(200);
      }
    } catch (e) {
      console.log(`⚠️  Unit selection issue: ${e.message}`);
    }

    // Take screenshot before saving
    await page.screenshot({ 
      path: `form-filled-${ingredientNumber}-${ingredient.name.replace(/[^a-zA-Z0-9]/g, '-')}.png` 
    });

    // Click save button
    const saveButton = page.locator('button:has-text("Criar Ingrediente")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      console.log('✅ Save button clicked');
      
      // Wait for form to close or success message
      await page.waitForTimeout(2000);
      
      // Check if form closed (success indicator)
      const formStillVisible = await page.locator('text="Adicionar Novo Ingrediente"').isVisible();
      if (!formStillVisible) {
        console.log(`✅ Form closed - ${ingredient.name} likely created successfully`);
        return true;
      } else {
        console.log(`⚠️  Form still visible after save - ${ingredient.name} may have validation issues`);
        
        // Try to close the form
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancelar")').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
        return false;
      }
    } else {
      console.error('❌ Save button not found');
      return false;
    }

  } catch (error) {
    console.error(`❌ Error filling form for ${ingredient.name}:`, error);
    
    // Try to close any open modal
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      // Ignore escape errors
    }
    
    return false;
  }
}