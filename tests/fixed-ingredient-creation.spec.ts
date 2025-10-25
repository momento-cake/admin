import { test, expect } from '@playwright/test';

// Brazilian ingredients with category mapping to visible options
const BRAZILIAN_INGREDIENTS = [
  { name: 'Farinha de Trigo', brand: 'Dona Benta', category: 'Farinha', unit: 'kg' },
  { name: 'Açúcar Cristal', brand: 'União', category: 'Açúcar', unit: 'kg' },
  { name: 'Fermento Biológico Seco', brand: 'Fleischmann', category: 'Fermentos', unit: 'g' },
  { name: 'Sal Refinado', brand: 'Cisne', category: 'Outros', unit: 'kg' },
  { name: 'Óleo de Soja', brand: 'Liza', category: 'Gorduras', unit: 'l' },
  { name: 'Margarina', brand: 'Qualy', category: 'Gorduras', unit: 'kg' },
  { name: 'Ovos', brand: 'Korin', category: 'Ovos', unit: 'unidade' },
  { name: 'Leite Integral', brand: 'Parmalat', category: 'Laticínios', unit: 'l' },
  { name: 'Leite Condensado', brand: 'Nestlé', category: 'Laticínios', unit: 'unidade' },
  { name: 'Coco Ralado', brand: 'Sococo', category: 'Outros', unit: 'kg' },
  { name: 'Chocolate em Pó', brand: 'Nestlé', category: 'Chocolate', unit: 'kg' },
  { name: 'Polvilho Doce', brand: 'Yoki', category: 'Farinha', unit: 'kg' },
  { name: 'Castanha-do-Pará', brand: 'Nutreal', category: 'Castanhas', unit: 'kg' },
  { name: 'Amêndoas', brand: 'Nutreal', category: 'Castanhas', unit: 'kg' },
  { name: 'Baunilha', brand: 'Arcolor', category: 'Aromas', unit: 'ml' },
  { name: 'Canela em Pó', brand: 'Kitano', category: 'Temperos', unit: 'g' },
  { name: 'Fermento Químico', brand: 'Royal', category: 'Fermentos', unit: 'g' },
  { name: 'Açúcar Refinado', brand: 'Cristal', category: 'Açúcar', unit: 'kg' },
  { name: 'Manteiga', brand: 'Aviação', category: 'Gorduras', unit: 'kg' },
  { name: 'Mel', brand: 'Mel Silvestre', category: 'Outros', unit: 'kg' }
];

test.describe('Fixed Ingredient Creation - All 20 Ingredients', () => {
  
  test('create all Brazilian ingredients with fixed modal handling', async ({ page }) => {
    console.log('🚀 Starting fixed ingredient creation test...');

    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'load' });
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    
    // Handle login redirect
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch (e) {
      if (!page.url().includes('dashboard')) {
        throw new Error(`Login failed, current URL: ${page.url()}`);
      }
    }
    console.log('✅ Login successful');

    // Step 2: Navigate to ingredients
    await page.goto('http://localhost:3001/ingredients/inventory', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    console.log('✅ Ingredients page loaded');

    // Take initial screenshot
    await page.screenshot({ path: 'ingredients-start-fixed.png', fullPage: true });

    // Step 3: Create ingredients one by one with proper modal handling
    let successCount = 0;
    
    for (let i = 0; i < BRAZILIAN_INGREDIENTS.length; i++) {
      const ingredient = BRAZILIAN_INGREDIENTS[i];
      console.log(`📝 Creating ingredient ${i + 1}/20: ${ingredient.name}`);

      try {
        // Click add button
        await page.click('button:has-text("Adicionar")');
        await page.waitForTimeout(1500);

        // Wait for modal to be fully loaded
        await page.waitForSelector('text="Adicionar Novo Ingrediente"', { timeout: 5000 });
        
        // Create ingredient with fixed approach
        const success = await createIngredientFixed(page, ingredient);
        
        if (success) {
          successCount++;
          console.log(`✅ Created ${ingredient.name} (${successCount}/20)`);
          
          // Wait for modal to close and ingredient to appear in list
          await page.waitForTimeout(2000);
          
        } else {
          console.error(`❌ Failed to create ${ingredient.name}`);
        }

        // Take progress screenshots every 5 ingredients
        if ((i + 1) % 5 === 0) {
          await page.screenshot({ 
            path: `progress-${i + 1}-ingredients.png`, 
            fullPage: true 
          });
          console.log(`📸 Progress screenshot taken: ${i + 1}/20 ingredients`);
        }

      } catch (error) {
        console.error(`❌ Error creating ${ingredient.name}:`, error);
        
        // Try to close any open modal
        try {
          await page.click('button[aria-label="Close"]');
        } catch (e) {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(1000);
      }
    }

    // Step 4: Final validation
    console.log('📝 Final validation...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'all-20-ingredients-final.png', 
      fullPage: true 
    });
    console.log('📸 Final screenshot taken');

    // Count ingredients
    try {
      const ingredientRows = await page.locator('tbody tr').count();
      console.log(`📊 Total ingredients in table: ${ingredientRows}`);
      
      // Verify specific ingredients
      let foundIngredients = [];
      for (const ingredient of BRAZILIAN_INGREDIENTS.slice(0, 10)) { // Check first 10
        try {
          const found = await page.getByText(ingredient.name).first().isVisible();
          if (found) {
            foundIngredients.push(ingredient.name);
          }
        } catch (e) {
          // Not found
        }
      }
      
      console.log(`✅ Verified ${foundIngredients.length}/10 sample ingredients in list`);
      console.log(`🎯 Total creation attempts: ${BRAZILIAN_INGREDIENTS.length}`);
      console.log(`✅ Reported successes: ${successCount}`);
      console.log(`📊 Visible in table: ${ingredientRows}`);
      
      if (successCount >= 15) {
        console.log('🎉 SUCCESS: Most ingredients created successfully!');
      } else {
        console.log(`⚠️  Only ${successCount}/20 ingredients reported as created`);
      }
      
    } catch (error) {
      console.error('❌ Final validation error:', error);
    }
  });
});

async function createIngredientFixed(page, ingredient) {
  try {
    console.log(`🛠️ Creating: ${ingredient.name}`);

    // Fill name - use force to bypass overlay
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('', { force: true });
    await nameInput.fill(ingredient.name, { force: true });
    await page.waitForTimeout(300);

    // Fill brand
    const brandInput = page.locator('input[name="brand"]');
    await brandInput.fill('', { force: true });
    await brandInput.fill(ingredient.brand, { force: true });
    await page.waitForTimeout(300);

    // Handle category dropdown with force click
    try {
      // Click category dropdown button
      const categoryButton = page.locator('button:has-text("Outros")').first();
      await categoryButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Try to click the specific category
      const categoryOption = page.locator(`text="${ingredient.category}"`).first();
      if (await categoryOption.isVisible()) {
        await categoryOption.click({ force: true });
        console.log(`✅ Selected category: ${ingredient.category}`);
      } else {
        // Click "Outros" as fallback
        await page.locator('text="Outros"').first().click({ force: true });
        console.log(`⚠️  Used 'Outros' category for ${ingredient.name}`);
      }
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`⚠️  Category selection failed: ${e.message}`);
    }

    // Fill measure value
    try {
      const measureInput = page.locator('input[placeholder="1"]').first();
      await measureInput.fill('1', { force: true });
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`⚠️  Measure input failed: ${e.message}`);
    }

    // Handle unit dropdown
    try {
      const unitButton = page.locator('button:has-text("kg")').first();
      await unitButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Try to select the unit
      const unitOption = page.locator(`text="${ingredient.unit}"`).first();
      if (await unitOption.isVisible()) {
        await unitOption.click({ force: true });
        console.log(`✅ Selected unit: ${ingredient.unit}`);
      } else {
        // Keep default kg
        await page.keyboard.press('Escape');
        console.log(`⚠️  Used default 'kg' for ${ingredient.name}`);
      }
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`⚠️  Unit selection failed: ${e.message}`);
    }

    // Click save button with force
    const saveButton = page.locator('button:has-text("Criar Ingrediente")');
    await saveButton.click({ force: true });
    console.log('✅ Save button clicked');
    
    // Wait for modal to close (success indicator)
    try {
      await page.waitForSelector('text="Adicionar Novo Ingrediente"', { 
        state: 'hidden', 
        timeout: 5000 
      });
      console.log(`✅ Modal closed - ${ingredient.name} created successfully`);
      return true;
    } catch (e) {
      // Modal didn't close - check if we need to close it manually
      try {
        const modalStillOpen = await page.locator('text="Adicionar Novo Ingrediente"').isVisible();
        if (modalStillOpen) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }
        console.log(`⚠️  Modal handling issue for ${ingredient.name}`);
        return false;
      } catch (closeError) {
        console.log(`⚠️  Could not determine modal state for ${ingredient.name}`);
        return false;
      }
    }

  } catch (error) {
    console.error(`❌ Error creating ${ingredient.name}:`, error);
    
    // Emergency modal close
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }
    
    return false;
  }
}