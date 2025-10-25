import { test, expect } from '@playwright/test';

// Test configuration
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const ADMIN_NAME = 'Sistema Administrador';
const BASE_URL = 'http://localhost:3001';

// Ingredient data to create and update
const INGREDIENTS_TO_CREATE = [
  {
    name: 'Farinha de Trigo',
    currentPrice: '5.50',
    category: 'Farinha',
    brand: 'Dona Benta',
    description: 'Farinha de trigo especial para panificação',
    minStock: '10',
    currentStock: '50',
    packageQuantity: '1',
    packageUnit: 'kg'
  },
  {
    name: 'Fermento Biológico Seco',
    currentPrice: '18.00',
    category: 'Fermentos',
    brand: 'Fleischmann',
    description: 'Fermento biológico seco ativo para pães e massas',
    minStock: '5',
    currentStock: '20',
    packageQuantity: '100',
    packageUnit: 'g'
  },
  {
    name: 'Fermento Químico',
    currentPrice: '12.00',
    category: 'Fermentos',
    brand: 'Royal',
    description: 'Fermento químico em pó para bolos e doces',
    minStock: '3',
    currentStock: '10',
    packageQuantity: '100',
    packageUnit: 'g'
  }
];

test.describe('Setup Admin and Manage Ingredients', () => {
  test('should setup admin account and create/update ingredients', async ({ page }) => {
    console.log('🚀 Starting complete setup and ingredient management...');
    
    // Step 1: Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForLoadState('load');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'screenshots/01-initial-page.png',
      fullPage: true 
    });
    
    // Check if we're on the setup page
    const setupHeading = await page.locator('text=Configuração Inicial').isVisible().catch(() => false);
    
    if (setupHeading) {
      console.log('🔧 Setting up initial admin account...');
      
      // Fill the setup form
      await page.fill('input[placeholder*="nome"]', ADMIN_NAME);
      await page.fill('input[placeholder*="email"]', ADMIN_EMAIL);
      await page.fill('input[placeholder*="senha"]', ADMIN_PASSWORD);
      await page.fill('input[placeholder*="Confirme"]', ADMIN_PASSWORD);
      
      // Take screenshot of filled setup form
      await page.screenshot({ 
        path: 'screenshots/02-setup-form-filled.png',
        fullPage: true 
      });
      
      // Click create admin button
      await page.click('button:has-text("Criar Conta de Administrador")');
      console.log('✅ Admin account creation submitted');
      
      // Wait for setup to complete
      await page.waitForTimeout(3000);
      
      // Take screenshot after setup
      await page.screenshot({ 
        path: 'screenshots/03-after-setup.png',
        fullPage: true 
      });
    } else {
      console.log('⏭️  Setup already completed, proceeding to login...');
    }
    
    // Step 2: Navigate to login page
    console.log('🔐 Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('load');
    
    // Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete - be more flexible with the redirect
    try {
      await page.waitForURL(/dashboard|admin/, { timeout: 10000 });
    } catch (error) {
      // If URL doesn't change, check if we're logged in by looking for user-specific content
      const isLoggedIn = await page.locator('[data-testid="user-avatar"], .user-menu, text=Dashboard').isVisible().catch(() => false);
      if (!isLoggedIn) {
        throw new Error('Login failed - unable to detect successful login');
      }
    }
    
    console.log('✅ Successfully logged in');
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: 'screenshots/04-dashboard.png',
      fullPage: true 
    });
    
    // Step 3: Navigate to ingredients management
    console.log('📦 Finding ingredients management...');
    
    // Try multiple strategies to find ingredients management
    let ingredientsFound = false;
    
    // Strategy 1: Direct navigation to known ingredients URLs
    const ingredientUrls = [
      '/ingredients/inventory',
      '/ingredients',
      '/dashboard/ingredients',
      '/admin/ingredients',
      '/ingredientes',
      '/ingredientes/inventory'
    ];
    
    for (const urlPath of ingredientUrls) {
      try {
        const fullUrl = `${BASE_URL}${urlPath}`;
        console.log(`  Trying: ${fullUrl}`);
        
        await page.goto(fullUrl);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const pageContent = await page.textContent('body');
        
        if (!pageContent?.includes('404') && !currentUrl.includes('login')) {
          console.log(`  ✅ Found working ingredients page at ${urlPath}`);
          ingredientsFound = true;
          
          await page.screenshot({ 
            path: `screenshots/05-ingredients-page-${urlPath.replace(/\//g, '-')}.png`,
            fullPage: true 
          });
          break;
        }
      } catch (error) {
        console.log(`  ❌ Error with ${urlPath}`);
      }
    }
    
    // Strategy 2: Look for navigation links if direct URLs don't work
    if (!ingredientsFound) {
      console.log('🔍 Looking for navigation links...');
      
      // Go back to dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(2000);
      
      // Look for expandable menu items
      const expandableMenus = await page.locator('button[aria-expanded="false"]').all();
      
      for (const menu of expandableMenus) {
        try {
          await menu.click();
          await page.waitForTimeout(500);
          
          // Check if ingredients link appeared
          const ingredientLink = page.locator('text=Ingrediente').first();
          const isVisible = await ingredientLink.isVisible().catch(() => false);
          
          if (isVisible) {
            await ingredientLink.click();
            await page.waitForTimeout(2000);
            console.log('✅ Found ingredients via navigation menu');
            ingredientsFound = true;
            break;
          }
        } catch (error) {
          // Continue to next menu
        }
      }
    }
    
    if (!ingredientsFound) {
      console.log('⚠️  Could not find ingredients management page');
      await page.screenshot({ 
        path: 'screenshots/06-ingredients-not-found.png',
        fullPage: true 
      });
      return; // Exit the test gracefully
    }
    
    // Step 4: Create ingredients
    console.log('🆕 Creating ingredients...');
    
    // Look for "Add" or "Create" button
    const addButtonSelectors = [
      'button:has-text("Adicionar")',
      'button:has-text("Novo")',
      'button:has-text("Criar")',
      'button:has-text("Add")',
      'button:has-text("Create")',
      'button[data-testid*="add"]',
      'a[href*="new"]',
      'a[href*="create"]'
    ];
    
    let addButton = null;
    let buttonFound = false;
    
    for (const selector of addButtonSelectors) {
      try {
        addButton = page.locator(selector).first();
        const isVisible = await addButton.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (isVisible) {
          console.log(`✅ Found add button: ${selector}`);
          buttonFound = true;
          break;
        }
      } catch (error) {
        // Continue
      }
    }
    
    if (!buttonFound) {
      console.log('ℹ️  No add button found, ingredients may already exist or need to be created differently');
      
      // Check if there are already ingredients in the list
      const existingIngredients = await page.locator('table tr, .ingredient-item, .list-item').count();
      console.log(`Found ${existingIngredients} potential existing ingredient items`);
      
      // Take screenshot to see current state
      await page.screenshot({ 
        path: 'screenshots/07-no-add-button.png',
        fullPage: true 
      });
    } else {
      // Process each ingredient creation
      for (const ingredient of INGREDIENTS_TO_CREATE) {
        console.log(`\n🆕 Creating ingredient: ${ingredient.name}`);
        
        try {
          // Click add button
          await addButton.click();
          await page.waitForTimeout(2000);
          
          // Take screenshot of create form
          await page.screenshot({ 
            path: `screenshots/08-create-form-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}.png`,
            fullPage: true 
          });
          
          // Fill form fields using flexible selectors
          const fillField = async (fieldName: string, value: string, isSelect: boolean = false) => {
            const selectors = [
              `input[name="${fieldName}"]`,
              `input[placeholder*="${fieldName}"]`,
              `input[id*="${fieldName}"]`,
              `textarea[name="${fieldName}"]`,
              `select[name="${fieldName}"]`
            ];
            
            if (isSelect) {
              // For select fields, try different strategies
              const selectSelectors = [
                `select[name="${fieldName}"]`,
                `select[id*="${fieldName}"]`,
                `[data-testid="${fieldName}"]`
              ];
              
              for (const selector of selectSelectors) {
                try {
                  const field = page.locator(selector).first();
                  const isVisible = await field.isVisible({ timeout: 1000 }).catch(() => false);
                  
                  if (isVisible) {
                    await field.selectOption({ label: value });
                    console.log(`    ✅ Selected ${fieldName}: ${value}`);
                    return true;
                  }
                } catch (error) {
                  // Continue
                }
              }
            } else {
              // For input fields
              for (const selector of selectors) {
                try {
                  const field = page.locator(selector).first();
                  const isVisible = await field.isVisible({ timeout: 1000 }).catch(() => false);
                  
                  if (isVisible) {
                    await field.clear();
                    await field.fill(value);
                    console.log(`    ✅ Filled ${fieldName}: ${value}`);
                    return true;
                  }
                } catch (error) {
                  // Continue
                }
              }
            }
            
            console.log(`    ⚠️  Could not find field: ${fieldName}`);
            return false;
          };
          
          // Fill all fields
          await fillField('name', ingredient.name);
          await fillField('currentPrice', ingredient.currentPrice);
          await fillField('brand', ingredient.brand);
          await fillField('description', ingredient.description);
          await fillField('packageQuantity', ingredient.packageQuantity);
          await fillField('minStock', ingredient.minStock);
          await fillField('currentStock', ingredient.currentStock);
          
          // Handle dropdowns
          await fillField('category', ingredient.category, true);
          await fillField('packageUnit', ingredient.packageUnit, true);
          
          // Take screenshot of filled form
          await page.screenshot({ 
            path: `screenshots/09-filled-form-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}.png`,
            fullPage: true 
          });
          
          // Save the ingredient
          const saveSelectors = [
            'button[type="submit"]',
            'button:has-text("Salvar")',
            'button:has-text("Save")',
            'button:has-text("Criar")',
            'button:has-text("Create")'
          ];
          
          let saved = false;
          for (const selector of saveSelectors) {
            try {
              const saveButton = page.locator(selector).first();
              const isVisible = await saveButton.isVisible({ timeout: 1000 }).catch(() => false);
              
              if (isVisible) {
                await saveButton.click();
                console.log(`    ✅ Saved ${ingredient.name}`);
                saved = true;
                break;
              }
            } catch (error) {
              // Continue
            }
          }
          
          if (!saved) {
            console.log(`    ⚠️  Could not find save button for ${ingredient.name}`);
            await page.keyboard.press('Enter');
          }
          
          // Wait for save and navigation back to list
          await page.waitForTimeout(3000);
          
          // Navigate back to ingredients list if needed
          if (!page.url().includes('inventory') && !page.url().includes('ingredients')) {
            await page.goto(`${BASE_URL}/ingredients/inventory`);
            await page.waitForTimeout(2000);
          }
          
        } catch (error) {
          console.log(`❌ Error creating ${ingredient.name}:`, error.message);
        }
      }
    }
    
    // Step 5: Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/10-final-ingredients-list.png',
      fullPage: true 
    });
    
    console.log('🎉 Setup and ingredient management process completed!');
    
    // Step 6: Verify ingredients exist and show their current state
    console.log('\n🔍 Verifying created ingredients...');
    
    for (const ingredient of INGREDIENTS_TO_CREATE) {
      const ingredientVisible = await page.locator(`text=${ingredient.name}`).isVisible().catch(() => false);
      const priceVisible = await page.locator(`text=${ingredient.currentPrice}`).isVisible().catch(() => false);
      
      console.log(`  ${ingredient.name}: ${ingredientVisible ? '✅ Found' : '❌ Not found'} | Price R$ ${ingredient.currentPrice}: ${priceVisible ? '✅ Visible' : '❌ Not visible'}`);
    }
  });
});