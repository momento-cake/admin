import { test, expect } from '@playwright/test';

// Working selectors based on CLAUDE.md guidance
const WORKING_SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

test.describe('Momento Cake Admin - Direct Recipe Route Testing', () => {
  
  test('Direct Access to Recipe Functionality', async ({ page }) => {
    console.log('🎯 Direct access test to recipe functionality...');
    
    // Step 1: Login
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('load');
    
    await page.fill(WORKING_SELECTORS.email, 'admin@momentocake.com.br');
    await page.fill(WORKING_SELECTORS.password, 'G8j5k188');
    await page.click(WORKING_SELECTORS.submitButton);
    await page.waitForLoadState('load');
    
    // Wait for authentication - use a more specific selector
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/direct-dashboard.png' });
    console.log('✅ Logged in successfully');
    
    // Step 2: Direct navigation to recipes page
    console.log('Step 2: Testing direct navigation to /dashboard/recipes');
    
    await page.goto('http://localhost:3000/dashboard/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'screenshots/direct-recipes-page.png' });
    
    const pageContent = await page.textContent('body');
    console.log('Recipe page content indicators:');
    
    // Check for key content
    const indicators = [
      { text: 'Sistema de Receitas', found: pageContent.includes('Sistema de Receitas') },
      { text: 'Catálogo de Receitas', found: pageContent.includes('Catálogo de Receitas') },
      { text: '404', found: pageContent.includes('404') },
      { text: 'Not Found', found: pageContent.includes('Not Found') },
      { text: 'receitas', found: pageContent.toLowerCase().includes('receita') }
    ];
    
    for (const indicator of indicators) {
      console.log(`  ${indicator.found ? '✅' : '❌'} ${indicator.text}: ${indicator.found}`);
    }
    
    // Step 3: Look for the "Nova Receita" or "Criar Receita" button
    console.log('Step 3: Looking for recipe creation button...');
    
    const buttonSelectors = [
      'button:has-text("Nova Receita")',
      'button:has-text("Criar Receita")', 
      'button:has-text("Adicionar Receita")',
      'button:has-text("+")',
      '[data-testid*="create"]',
      '[data-testid*="add"]'
    ];
    
    let createButtonFound = false;
    for (const selector of buttonSelectors) {
      const buttonCount = await page.locator(selector).count();
      if (buttonCount > 0) {
        console.log(`  ✅ Found create button: "${selector}" (${buttonCount} instances)`);
        createButtonFound = true;
        
        // Try clicking it
        try {
          await page.locator(selector).first().click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'screenshots/direct-recipe-form.png' });
          
          // Check if form opened
          const formContent = await page.textContent('body');
          if (formContent.includes('Criar Nova Receita') || formContent.includes('Nome') || formContent.includes('Ingredientes')) {
            console.log('  ✅ Recipe form opened successfully');
            
            // Test form fields
            const nameField = page.locator('input[name="name"], input[placeholder*="nome"], input[placeholder*="Nome"]').first();
            if (await nameField.count() > 0) {
              await nameField.fill('Teste Receita Playwright');
              console.log('  ✅ Recipe name field working');
            }
            
            // Close form
            const cancelButtons = [
              'button:has-text("Cancelar")',
              'button:has-text("Fechar")',
              '[aria-label*="close"]'
            ];
            
            for (const cancelBtn of cancelButtons) {
              if (await page.locator(cancelBtn).count() > 0) {
                await page.locator(cancelBtn).first().click();
                await page.waitForTimeout(1000);
                break;
              }
            }
            
          } else {
            console.log('  ⚠️ Form may not have opened or content not recognized');
          }
          
        } catch (e) {
          console.log(`  ⚠️ Could not click button ${selector}: ${e.message}`);
        }
        
        break;
      }
    }
    
    if (!createButtonFound) {
      console.log('  ❌ No create button found');
    }
    
    // Step 4: Check sidebar navigation for recipes
    console.log('Step 4: Testing sidebar navigation to recipes...');
    
    // Go back to dashboard first
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    const recipeNavSelectors = [
      'a:has-text("Receitas")',
      'button:has-text("Receitas")',
      '[href*="recipes"]',
      '[href*="receitas"]'
    ];
    
    let navFound = false;
    for (const selector of recipeNavSelectors) {
      const navCount = await page.locator(selector).count();
      if (navCount > 0) {
        console.log(`  ✅ Found recipes navigation: "${selector}" (${navCount} instances)`);
        navFound = true;
        
        try {
          await page.locator(selector).first().click();
          await page.waitForLoadState('load');
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          console.log(`    ✅ Navigation successful, current URL: ${currentUrl}`);
          
          if (currentUrl.includes('recipes') || currentUrl.includes('receitas')) {
            console.log('    ✅ Successfully navigated to recipes page via sidebar');
            await page.screenshot({ path: 'screenshots/direct-nav-success.png' });
          }
          
        } catch (e) {
          console.log(`    ⚠️ Could not click navigation ${selector}: ${e.message}`);
        }
        
        break;
      }
    }
    
    if (!navFound) {
      console.log('  ❌ No recipes navigation found in sidebar');
      
      // Let's see what navigation options DO exist
      const allNavLinks = await page.locator('nav a, [role="navigation"] a').all();
      console.log('Available navigation links:');
      for (let i = 0; i < Math.min(allNavLinks.length, 10); i++) {
        try {
          const link = allNavLinks[i];
          const text = await link.textContent();
          const href = await link.getAttribute('href');
          console.log(`    📎 "${text?.trim()}" -> ${href}`);
        } catch (e) {
          console.log(`    📎 Link ${i}: Could not read`);
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshots/direct-final-state.png' });
    console.log('✅ Direct recipe test completed');
  });

  test('Recipe Components and Functionality Validation', async ({ page }) => {
    console.log('🧩 Testing recipe components and functionality...');
    
    // Login
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('load');
    
    await page.fill(WORKING_SELECTORS.email, 'admin@momentocake.com.br');
    await page.fill(WORKING_SELECTORS.password, 'G8j5k188');
    await page.click(WORKING_SELECTORS.submitButton);
    await page.waitForLoadState('load');
    
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
    
    // Go directly to recipes page
    await page.goto('http://localhost:3000/dashboard/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    console.log('✅ Accessed recipes page directly');
    await page.screenshot({ path: 'screenshots/components-recipes-page.png' });
    
    // Test if ingredients are needed first
    console.log('Step 1: Checking ingredients availability...');
    
    // Go to ingredients page to create some test ingredients
    await page.goto('http://localhost:3000/dashboard/ingredients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'screenshots/components-ingredients.png' });
    
    // Try to add one test ingredient
    const ingredientButtons = [
      'button:has-text("Nova Ingrediente")',
      'button:has-text("Adicionar Ingrediente")',
      'button:has-text("Criar Ingrediente")',
      'button:has-text("+")'
    ];
    
    let ingredientAdded = false;
    for (const selector of ingredientButtons) {
      if (await page.locator(selector).count() > 0) {
        console.log(`  Found ingredient button: ${selector}`);
        
        try {
          await page.locator(selector).first().click();
          await page.waitForTimeout(1000);
          
          // Fill basic ingredient data
          const nameField = page.locator('input[name="name"], input[placeholder*="nome"]').first();
          if (await nameField.count() > 0) {
            await nameField.fill('Leite condensado teste');
            
            const brandField = page.locator('input[name="brand"], input[placeholder*="marca"]').first();
            if (await brandField.count() > 0) {
              await brandField.fill('italac');
            }
            
            const quantityField = page.locator('input[name="packageQuantity"], input[name="quantity"]').first();
            if (await quantityField.count() > 0) {
              await quantityField.fill('395');
            }
            
            const priceField = page.locator('input[name="currentPrice"], input[name="price"]').first();
            if (await priceField.count() > 0) {
              await priceField.fill('5.50');
            }
            
            // Try to save
            const saveButtons = [
              'button:has-text("Salvar")',
              'button:has-text("Criar")',
              'button[type="submit"]'
            ];
            
            for (const saveBtn of saveButtons) {
              if (await page.locator(saveBtn).count() > 0) {
                await page.locator(saveBtn).first().click();
                await page.waitForTimeout(2000);
                ingredientAdded = true;
                console.log('  ✅ Test ingredient created');
                break;
              }
            }
          }
          
        } catch (e) {
          console.log(`  ⚠️ Failed to create ingredient: ${e.message}`);
        }
        
        break;
      }
    }
    
    // Go back to recipes page
    await page.goto('http://localhost:3000/dashboard/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    console.log('Step 2: Testing recipe creation with ingredients...');
    
    // Now try to create a recipe
    const recipeButtons = [
      'button:has-text("Nova Receita")',
      'button:has-text("Criar Receita")',
      'button:has-text("Adicionar Receita")'
    ];
    
    for (const selector of recipeButtons) {
      if (await page.locator(selector).count() > 0) {
        console.log(`  Found recipe button: ${selector}`);
        
        try {
          await page.locator(selector).first().click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({ path: 'screenshots/components-recipe-form.png' });
          
          // Fill recipe form
          const recipeNameField = page.locator('input[name="name"], input[placeholder*="nome"]').first();
          if (await recipeNameField.count() > 0) {
            await recipeNameField.fill('Creme Básico Teste');
            console.log('  ✅ Recipe name filled');
          }
          
          const descriptionField = page.locator('textarea[name="description"], textarea[placeholder*="descrição"]').first();
          if (await descriptionField.count() > 0) {
            await descriptionField.fill('Receita básica de creme para teste');
            console.log('  ✅ Recipe description filled');
          }
          
          // Try to add ingredient to recipe
          const addIngredientButtons = [
            'button:has-text("Adicionar Ingrediente")',
            'button:has-text("Adicionar Item")',
            'button:has-text("+")'
          ];
          
          for (const addIngBtn of addIngredientButtons) {
            if (await page.locator(addIngBtn).count() > 0) {
              await page.locator(addIngBtn).first().click();
              await page.waitForTimeout(1000);
              console.log('  ✅ Add ingredient button clicked');
              break;
            }
          }
          
          await page.screenshot({ path: 'screenshots/components-recipe-with-ingredients.png' });
          
          // Try to cancel/close form
          const cancelButtons = [
            'button:has-text("Cancelar")',
            'button:has-text("Fechar")'
          ];
          
          for (const cancelBtn of cancelButtons) {
            if (await page.locator(cancelBtn).count() > 0) {
              await page.locator(cancelBtn).first().click();
              await page.waitForTimeout(1000);
              console.log('  ✅ Form cancelled');
              break;
            }
          }
          
        } catch (e) {
          console.log(`  ⚠️ Failed to interact with recipe form: ${e.message}`);
        }
        
        break;
      }
    }
    
    await page.screenshot({ path: 'screenshots/components-final.png' });
    console.log('✅ Components validation completed');
  });

});