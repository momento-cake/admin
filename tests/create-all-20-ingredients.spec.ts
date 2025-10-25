import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@momentocake.com.br',
  password: 'G8j5k188'
};

// 20 Brazilian bakery ingredients with complete data
const BRAZILIAN_INGREDIENTS = [
  {
    name: 'Açúcar Cristal',
    brand: 'União',
    category: 'Açúcar',
    unit: 'kg',
    measurementValue: '1',
    description: 'Açúcar cristal refinado para doces e bolos',
    unitPrice: '3.80',
    initialStock: '30',
    minStock: '5'
  },
  {
    name: 'Fermento Biológico Seco',
    brand: 'Fleischmann',
    category: 'Fermentos',
    unit: 'g',
    measurementValue: '10',
    description: 'Fermento biológico seco para pães e massas',
    unitPrice: '15.90',
    initialStock: '20',
    minStock: '5'
  },
  {
    name: 'Sal Refinado',
    brand: 'Cisne',
    category: 'Outros',
    unit: 'kg',
    measurementValue: '1',
    description: 'Sal refinado especial para panificação',
    unitPrice: '2.50',
    initialStock: '25',
    minStock: '5'
  },
  {
    name: 'Óleo de Soja',
    brand: 'Liza',
    category: 'Outros',
    unit: 'L',
    measurementValue: '1',
    description: 'Óleo de soja refinado para frituras e massas',
    unitPrice: '8.90',
    initialStock: '15',
    minStock: '3'
  },
  {
    name: 'Margarina',
    brand: 'Qualy',
    category: 'Gorduras',
    unit: 'kg',
    measurementValue: '1',
    description: 'Margarina especial para panificação',
    unitPrice: '12.50',
    initialStock: '20',
    minStock: '5'
  },
  {
    name: 'Ovos',
    brand: 'Korin',
    category: 'Ovos',
    unit: 'unidade',
    measurementValue: '1',
    description: 'Ovos frescos para bolos e doces',
    unitPrice: '0.80',
    initialStock: '100',
    minStock: '20'
  },
  {
    name: 'Leite Integral',
    brand: 'Parmalat',
    category: 'Laticínios',
    unit: 'L',
    measurementValue: '1',
    description: 'Leite integral para receitas e bebidas',
    unitPrice: '4.20',
    initialStock: '30',
    minStock: '10'
  },
  {
    name: 'Leite Condensado',
    brand: 'Nestlé',
    category: 'Laticínios',
    unit: 'unidade',
    measurementValue: '1',
    description: 'Leite condensado para doces e sobremesas',
    unitPrice: '5.60',
    initialStock: '25',
    minStock: '8'
  },
  {
    name: 'Coco Ralado',
    brand: 'Sococo',
    category: 'Outros',
    unit: 'kg',
    measurementValue: '1',
    description: 'Coco ralado desidratado para bolos',
    unitPrice: '18.90',
    initialStock: '10',
    minStock: '3'
  },
  {
    name: 'Chocolate em Pó',
    brand: 'Nestlé',
    category: 'Chocolate',
    unit: 'kg',
    measurementValue: '1',
    description: 'Chocolate em pó solúvel para doces',
    unitPrice: '22.80',
    initialStock: '15',
    minStock: '5'
  },
  {
    name: 'Polvilho Doce',
    brand: 'Yoki',
    category: 'Farinha',
    unit: 'kg',
    measurementValue: '1',
    description: 'Polvilho doce para pães de queijo',
    unitPrice: '6.50',
    initialStock: '12',
    minStock: '3'
  },
  {
    name: 'Castanha-do-Pará',
    brand: 'Nutreal',
    category: 'Nozes',
    unit: 'kg',
    measurementValue: '1',
    description: 'Castanha-do-Pará para doces e bolos',
    unitPrice: '45.90',
    initialStock: '5',
    minStock: '2'
  },
  {
    name: 'Amêndoas',
    brand: 'Nutreal',
    category: 'Nozes',
    unit: 'kg',
    measurementValue: '1',
    description: 'Amêndoas laminadas para decoração',
    unitPrice: '48.90',
    initialStock: '3',
    minStock: '1'
  },
  {
    name: 'Essência de Baunilha',
    brand: 'Arcolor',
    category: 'Outros',
    unit: 'ml',
    measurementValue: '30',
    description: 'Essência de baunilha para doces',
    unitPrice: '12.90',
    initialStock: '8',
    minStock: '2'
  },
  {
    name: 'Canela em Pó',
    brand: 'Kitano',
    category: 'Outros',
    unit: 'g',
    measurementValue: '50',
    description: 'Canela em pó para doces e bolos',
    unitPrice: '8.50',
    initialStock: '10',
    minStock: '2'
  },
  {
    name: 'Fermento Químico',
    brand: 'Royal',
    category: 'Fermentos',
    unit: 'g',
    measurementValue: '100',
    description: 'Fermento químico em pó para bolos',
    unitPrice: '4.80',
    initialStock: '15',
    minStock: '5'
  },
  {
    name: 'Açúcar Refinado',
    brand: 'Cristal',
    category: 'Açúcar',
    unit: 'kg',
    measurementValue: '1',
    description: 'Açúcar refinado especial extra fino',
    unitPrice: '4.20',
    initialStock: '40',
    minStock: '8'
  },
  {
    name: 'Manteiga',
    brand: 'Aviação',
    category: 'Gorduras',
    unit: 'kg',
    measurementValue: '1',
    description: 'Manteiga sem sal para panificação',
    unitPrice: '28.90',
    initialStock: '12',
    minStock: '4'
  },
  {
    name: 'Mel',
    brand: 'Mel Silvestre',
    category: 'Outros',
    unit: 'kg',
    measurementValue: '1',
    description: 'Mel puro de flores silvestres',
    unitPrice: '18.50',
    initialStock: '8',
    minStock: '2'
  }
];

test.describe('Create All 19 Brazilian Bakery Ingredients', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
  });

  test('Create all remaining 19 Brazilian bakery ingredients systematically', async ({ page }) => {
    console.log('=== STARTING SYSTEMATIC CREATION OF ALL 19 REMAINING INGREDIENTS ===');
    
    // Login
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    console.log('✅ Login successful');
    
    // Navigate to ingredients inventory
    await page.goto('http://localhost:3001/ingredients/inventory');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    // Count initial ingredients
    const initialCount = await page.locator('table tr').count().catch(() => 0);
    console.log(`📊 Starting with ${initialCount} existing ingredients`);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/all-ingredients-start.png', fullPage: true });
    
    let successCount = 0;
    let failedIngredients = [];
    
    // Create each ingredient
    for (let i = 0; i < BRAZILIAN_INGREDIENTS.length; i++) {
      const ingredient = BRAZILIAN_INGREDIENTS[i];
      console.log(`\n=== CREATING INGREDIENT ${i + 1}/${BRAZILIAN_INGREDIENTS.length}: ${ingredient.name} ===`);
      
      try {
        // Click "Adicionar" button to open form
        const addButton = page.locator('button:has-text("Adicionar")').first();
        await addButton.click();
        
        // Wait for modal to fully open
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        await page.waitForTimeout(1000);
        console.log('✅ Modal opened');
        
        // Fill Name field
        const nameField = page.locator('input[placeholder*="Açúcar cristal"]');
        await nameField.fill(ingredient.name);
        console.log(`✅ Name: ${ingredient.name}`);
        
        // Fill Brand field
        const brandField = page.locator('input[placeholder*="União, Crystal, Nestlé"]');
        await brandField.fill(ingredient.brand);
        console.log(`✅ Brand: ${ingredient.brand}`);
        
        // Select Category
        const categoryButton = page.locator('button:has-text("Outros")').first();
        await categoryButton.click();
        await page.waitForTimeout(500);
        
        try {
          const categoryOption = page.locator(`[role="option"]:has-text("${ingredient.category}")`);
          if (await categoryOption.isVisible()) {
            await categoryOption.click();
            console.log(`✅ Category: ${ingredient.category}`);
          } else {
            await page.keyboard.press('Escape');
            console.log(`⚠️ Category "${ingredient.category}" not found, using Outros`);
          }
        } catch {
          await page.keyboard.press('Escape');
          console.log(`⚠️ Category selection failed, using Outros`);
        }
        
        // Fill Measurement Value
        const measurementField = page.locator('input[value="1"], input[placeholder*="1"]').first();
        await measurementField.clear();
        await measurementField.fill(ingredient.measurementValue);
        console.log(`✅ Measurement: ${ingredient.measurementValue}`);
        
        // Select Unit
        const unitButton = page.locator('button:has-text("kg")').first();
        await unitButton.click();
        await page.waitForTimeout(500);
        
        try {
          const unitOption = page.locator(`[role="option"]:has-text("${ingredient.unit}")`);
          if (await unitOption.isVisible()) {
            await unitOption.click();
            console.log(`✅ Unit: ${ingredient.unit}`);
          } else {
            await page.keyboard.press('Escape');
            console.log(`⚠️ Unit "${ingredient.unit}" not found, using kg`);
          }
        } catch {
          await page.keyboard.press('Escape');
          console.log(`⚠️ Unit selection failed, using kg`);
        }
        
        // Fill Description
        const descriptionField = page.locator('textarea[placeholder*="Descrição opcional"]');
        await descriptionField.fill(ingredient.description);
        console.log(`✅ Description filled`);
        
        // Wait for suppliers to load and select first one
        await page.waitForTimeout(2000);
        const supplierButton = page.locator('button').filter({ hasText: /Selecione um fornecedor|Carregando fornecedores/ }).first();
        
        // Wait for loading to complete if needed
        if ((await supplierButton.textContent()).includes('Carregando')) {
          await page.waitForSelector('button:has-text("Selecione um fornecedor")', { timeout: 10000 });
        }
        
        await supplierButton.click();
        await page.waitForTimeout(500);
        
        const firstSupplier = page.locator('[role="option"]').first();
        if (await firstSupplier.isVisible()) {
          await firstSupplier.click();
          console.log('✅ Supplier selected');
        } else {
          await page.keyboard.press('Escape');
          console.log('⚠️ No suppliers found');
        }
        
        // Scroll to bottom of modal to see all fields
        await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          if (modal) {
            modal.scrollTop = modal.scrollHeight;
          }
        });
        
        // Fill Unit Price
        const priceField = page.locator('text=Preço por Unidade').locator('..').locator('input');
        if (await priceField.isVisible()) {
          await priceField.clear();
          await priceField.fill(ingredient.unitPrice);
          console.log(`✅ Price: R$ ${ingredient.unitPrice}`);
        }
        
        // Fill Initial Stock (required)
        const initialStockField = page.locator('text=Estoque Inicial').locator('..').locator('input');
        if (await initialStockField.isVisible()) {
          await initialStockField.clear();
          await initialStockField.fill(ingredient.initialStock);
          console.log(`✅ Initial stock: ${ingredient.initialStock}`);
        }
        
        // Fill Minimum Stock
        const minStockField = page.locator('text=Estoque Mínimo').locator('..').locator('input');
        if (await minStockField.isVisible()) {
          await minStockField.clear();
          await minStockField.fill(ingredient.minStock);
          console.log(`✅ Min stock: ${ingredient.minStock}`);
        }
        
        // Take screenshot of completed form every 5 ingredients
        if ((i + 1) % 5 === 0) {
          await page.screenshot({ 
            path: `screenshots/form-${i + 1}-${ingredient.name.replace(/\s+/g, '-')}.png`,
            fullPage: true 
          });
        }
        
        // Submit the form
        const submitButton = page.locator('button:has-text("Criar Ingrediente")');
        await submitButton.click();
        console.log('✅ Form submitted');
        
        // Wait for submission to complete
        await page.waitForTimeout(3000);
        
        // Check if modal closed (success)
        const modalClosed = !await page.locator('[role="dialog"]').isVisible();
        if (modalClosed) {
          successCount++;
          console.log(`🎉 SUCCESS: ${ingredient.name} created! (${successCount}/${BRAZILIAN_INGREDIENTS.length})`);
          
          // Take progress screenshot every 5 ingredients
          if ((i + 1) % 5 === 0) {
            await page.screenshot({ 
              path: `screenshots/progress-${i + 1}-ingredients.png`,
              fullPage: true 
            });
            console.log(`📸 Progress screenshot: ${successCount} ingredients created`);
          }
        } else {
          failedIngredients.push(ingredient.name);
          console.log(`❌ FAILED: ${ingredient.name} - modal still open`);
          
          // Take error screenshot
          await page.screenshot({ 
            path: `screenshots/error-${ingredient.name.replace(/\s+/g, '-')}.png`,
            fullPage: true 
          });
          
          // Close modal and continue
          await page.keyboard.press('Escape');
          await page.waitForTimeout(1000);
        }
        
      } catch (error) {
        failedIngredients.push(ingredient.name);
        console.log(`❌ ERROR creating ${ingredient.name}: ${error}`);
        
        // Try to close any open modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
      
      // Small delay between ingredients
      await page.waitForTimeout(1000);
    }
    
    console.log('\n=== FINAL RESULTS SUMMARY ===');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/all-ingredients-final.png',
      fullPage: true 
    });
    
    // Count final ingredients
    const finalCount = await page.locator('table tr').count().catch(() => 0);
    const actualAdded = finalCount - initialCount;
    
    console.log(`📊 FINAL STATISTICS:`);
    console.log(`   Initial ingredients: ${initialCount}`);
    console.log(`   Final ingredients: ${finalCount}`);
    console.log(`   Actually added: ${actualAdded}`);
    console.log(`   Expected to add: ${BRAZILIAN_INGREDIENTS.length}`);
    console.log(`   Success rate: ${successCount}/${BRAZILIAN_INGREDIENTS.length} (${Math.round(successCount/BRAZILIAN_INGREDIENTS.length*100)}%)`);
    
    if (failedIngredients.length > 0) {
      console.log(`\n❌ FAILED INGREDIENTS:`);
      failedIngredients.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
    }
    
    console.log(`\n✅ SUCCESSFUL INGREDIENTS: ${successCount}`);
    BRAZILIAN_INGREDIENTS.forEach((ing, i) => {
      if (!failedIngredients.includes(ing.name)) {
        console.log(`   ✅ ${ing.name} (${ing.brand})`);
      }
    });
    
    console.log('\n🎉 INGREDIENT CREATION PROCESS COMPLETED!');
    console.log(`🏆 TOTAL INGREDIENTS IN SYSTEM: ${finalCount} (including Farinha de Trigo from previous test)`);
  });
});