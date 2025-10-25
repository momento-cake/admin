import { test, expect, Page } from '@playwright/test';

// Admin credentials from configuration
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const BASE_URL = 'http://localhost:3001';

// Ingredient prices to update
const INGREDIENT_PRICES = [
  { name: 'Farinha de Trigo', price: '5.50', brand: 'Dona Benta' },
  { name: 'Açúcar Refinado', price: '4.00', brand: 'União' },
  { name: 'Leite Integral', price: '4.50', brand: 'Nestlé' },
  { name: 'Margarina', price: '10.00', brand: 'Qualy' },
  { name: 'Chocolate em Pó', price: '20.00', brand: 'Nestlé' }
];

test.describe('Admin Setup and Ingredient Pricing', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout for this test
    test.setTimeout(120000); // 2 minutes
  });

  test('Complete initial setup and update ingredient prices', async ({ page }) => {
    console.log('🚀 Starting admin setup and ingredient pricing test...');

    // Step 1: Navigate to the application
    console.log('📍 Navigating to:', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'load' });
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/01-initial-page.png', 
      fullPage: true 
    });

    // Check if we're on setup page or login page
    const currentUrl = page.url();
    console.log('🔍 Current URL:', currentUrl);

    if (currentUrl.includes('/setup')) {
      console.log('✅ Found setup page - completing initial setup...');
      await completeInitialSetup(page);
    } else if (currentUrl.includes('/login')) {
      console.log('ℹ️ Found login page - checking for "Primeiro Acesso" option...');
      
      // Look for "Primeiro Acesso" link
      const firstAccessLink = page.locator('text=Primeiro Acesso');
      if (await firstAccessLink.isVisible()) {
        console.log('🔗 Clicking "Primeiro Acesso" link...');
        await firstAccessLink.click();
        await page.waitForLoadState('load');
        await completeInitialSetup(page);
      } else {
        console.log('🔑 No setup link found - attempting login...');
        await performLogin(page);
      }
    } else {
      console.log('🏠 Already on main page - checking authentication...');
      // Check if we need to login
      if (currentUrl.includes('/login') || page.url() === BASE_URL + '/') {
        await page.goto(BASE_URL + '/login', { waitUntil: 'load' });
        await performLogin(page);
      }
    }

    // Step 2: Ensure we're authenticated and navigate to dashboard
    console.log('🏗️ Ensuring we reach the dashboard...');
    await ensureDashboardAccess(page);

    // Step 3: Navigate to ingredients inventory
    console.log('🧪 Navigating to ingredients inventory...');
    await navigateToIngredients(page);

    // Step 4: Take screenshot of current ingredients
    await page.screenshot({ 
      path: 'test-results/02-ingredients-before.png', 
      fullPage: true 
    });

    // Step 5: Update ingredient prices
    console.log('💰 Starting ingredient price updates...');
    await updateIngredientPrices(page);

    // Step 6: Take final screenshot
    await page.screenshot({ 
      path: 'test-results/03-ingredients-after.png', 
      fullPage: true 
    });

    console.log('✅ Test completed successfully!');
  });
});

async function completeInitialSetup(page: Page) {
  console.log('🔧 Completing initial setup...');
  
  // Wait for setup form to be visible
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill admin details
  const nameInput = page.locator('input[name="name"], input[placeholder*="nome"], input[placeholder*="Nome"]').first();
  if (await nameInput.isVisible()) {
    await nameInput.fill('Admin Momento Cake');
    console.log('✍️ Filled admin name');
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(ADMIN_EMAIL);
    console.log('✍️ Filled admin email');
  }

  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(ADMIN_PASSWORD);
    console.log('✍️ Filled admin password');
  }

  const companyInput = page.locator('input[name="company"], input[placeholder*="empresa"], input[placeholder*="Empresa"]').first();
  if (await companyInput.isVisible()) {
    await companyInput.fill('Momento Cake Confeitaria');
    console.log('✍️ Filled company name');
  }

  // Submit the setup form
  const submitButton = page.locator('button[type="submit"], button:has-text("Configurar"), button:has-text("Salvar"), button:has-text("Continuar")').first();
  await submitButton.click();
  console.log('🚀 Submitted setup form');

  // Wait for redirect
  await page.waitForLoadState('load');
  
  // Take screenshot after setup
  await page.screenshot({ 
    path: 'test-results/setup-completed.png', 
    fullPage: true 
  });
}

async function performLogin(page: Page) {
  console.log('🔑 Performing login...');
  
  // Use the reliable selectors from the configuration
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  // Wait for login form to be ready
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  
  // Fill login credentials
  await emailInput.fill(ADMIN_EMAIL);
  console.log('✍️ Filled email');
  
  await passwordInput.fill(ADMIN_PASSWORD);
  console.log('✍️ Filled password');
  
  // Submit login form
  await submitButton.click();
  console.log('🚀 Submitted login form');
  
  // Wait for navigation
  await page.waitForLoadState('load');
  
  // Check if login was successful
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('⚠️ Still on login page - login may have failed');
    await page.screenshot({ 
      path: 'test-results/login-failed.png', 
      fullPage: true 
    });
  } else {
    console.log('✅ Login successful - redirected to:', currentUrl);
  }
}

async function ensureDashboardAccess(page: Page) {
  const currentUrl = page.url();
  
  if (!currentUrl.includes('/dashboard')) {
    console.log('🏠 Navigating to dashboard...');
    await page.goto(BASE_URL + '/dashboard', { waitUntil: 'load' });
  }
  
  // Wait for dashboard to load and check for authentication
  try {
    await page.waitForSelector('[data-testid="user-avatar"], .sidebar, nav', { timeout: 10000 });
    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.log('⚠️ Dashboard elements not found - checking current state...');
    await page.screenshot({ 
      path: 'test-results/dashboard-state.png', 
      fullPage: true 
    });
  }
}

async function navigateToIngredients(page: Page) {
  // Try different navigation methods
  const ingredientsUrl = BASE_URL + '/ingredients/inventory';
  
  // Method 1: Direct navigation
  console.log('🧭 Navigating directly to ingredients inventory...');
  await page.goto(ingredientsUrl, { waitUntil: 'load' });
  
  // Check if we're on the ingredients page
  if (page.url().includes('/ingredients/inventory')) {
    console.log('✅ Successfully navigated to ingredients inventory');
    return;
  }
  
  // Method 2: Try clicking navigation links
  console.log('🔍 Looking for ingredients navigation link...');
  const ingredientsLink = page.locator('text=Ingredientes, a[href*="ingredients"], nav *:has-text("Ingredientes")').first();
  
  if (await ingredientsLink.isVisible()) {
    await ingredientsLink.click();
    await page.waitForLoadState('load');
    
    // Click on inventory submenu if needed
    const inventoryLink = page.locator('text=Estoque, text=Inventory, a[href*="inventory"]').first();
    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      await page.waitForLoadState('load');
    }
  }
  
  console.log('📍 Current page after navigation:', page.url());
}

async function updateIngredientPrices(page: Page) {
  console.log('💰 Starting ingredient price updates...');
  
  // Wait for the ingredients list to load
  await page.waitForSelector('table, .ingredients-list, [data-testid*="ingredient"]', { timeout: 15000 });
  
  for (const ingredient of INGREDIENT_PRICES) {
    console.log(`🔄 Processing: ${ingredient.name}`);
    
    try {
      // Look for the ingredient by name and find the edit button
      const ingredientRow = page.locator(`tr:has-text("${ingredient.name}"), .ingredient-item:has-text("${ingredient.name}")`).first();
      
      if (await ingredientRow.isVisible()) {
        console.log(`✅ Found ingredient: ${ingredient.name}`);
        
        // Look for edit button (pencil icon, edit text, or button)
        const editButton = ingredientRow.locator('button:has-text("Editar"), button[title*="edit"], button[aria-label*="edit"], .edit-button, [data-testid*="edit"], button:has([data-lucide="pencil"])').first();
        
        if (await editButton.isVisible()) {
          await editButton.click();
          console.log(`🖊️ Clicked edit button for ${ingredient.name}`);
          
          // Wait for edit modal/form to appear
          await page.waitForSelector('input[name*="price"], input[placeholder*="preço"], input[placeholder*="Price"], .price-input', { timeout: 5000 });
          
          // Fill the price field
          const priceInput = page.locator('input[name*="price"], input[placeholder*="preço"], input[placeholder*="Price"], .price-input').first();
          await priceInput.clear();
          await priceInput.fill(ingredient.price);
          console.log(`💵 Set price to R$ ${ingredient.price}`);
          
          // Fill brand field if available
          const brandInput = page.locator('input[name*="brand"], input[placeholder*="marca"], input[placeholder*="Brand"], .brand-input').first();
          if (await brandInput.isVisible()) {
            await brandInput.clear();
            await brandInput.fill(ingredient.brand);
            console.log(`🏷️ Set brand to ${ingredient.brand}`);
          }
          
          // Save the changes
          const saveButton = page.locator('button:has-text("Salvar"), button:has-text("Save"), button[type="submit"], .save-button').first();
          await saveButton.click();
          console.log(`💾 Saved changes for ${ingredient.name}`);
          
          // Wait for save to complete
          await page.waitForTimeout(1000);
          
        } else {
          console.log(`⚠️ Edit button not found for ${ingredient.name}`);
        }
      } else {
        console.log(`⚠️ Ingredient not found: ${ingredient.name}`);
      }
    } catch (error) {
      console.log(`❌ Error updating ${ingredient.name}:`, error);
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: `test-results/error-${ingredient.name.replace(/\s+/g, '-')}.png`, 
        fullPage: true 
      });
    }
    
    // Small delay between updates
    await page.waitForTimeout(500);
  }
  
  console.log('✅ Completed ingredient price updates');
}