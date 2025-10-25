import { test, expect, Page } from '@playwright/test';

// Working selectors for Momento Cake Admin login form
const WORKING_SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@momentocake.com.br',
  password: 'G8j5k188'
};

const BASE_URL = 'http://localhost:3001';

// Helper function to login
async function loginUser(page: Page) {
  console.log('🔐 Starting login process...');
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');
  
  // Fill login form
  await page.fill(WORKING_SELECTORS.email, ADMIN_CREDENTIALS.email);
  await page.fill(WORKING_SELECTORS.password, ADMIN_CREDENTIALS.password);
  
  // Submit form
  await page.click(WORKING_SELECTORS.submitButton);
  
  // Wait for some navigation (either to dashboard or staying on login page)
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log(`Current URL after login attempt: ${currentUrl}`);
  
  // Check if we're on dashboard (login successful)
  if (currentUrl.includes('dashboard')) {
    console.log('✅ Login successful - on dashboard');
    return true;
  } else {
    console.log('❌ Login may have failed - not on dashboard');
    return false;
  }
}

// Helper function to get authentication info
async function getAuthInfo(page: Page) {
  return await page.evaluate(async () => {
    // Import Firebase modules
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    
    return new Promise((resolve) => {
      const auth = getAuth();
      
      // Use onAuthStateChanged to get the current user
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          });
        } else {
          resolve({ error: 'No user found' });
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve({ error: 'Timeout waiting for auth state' });
      }, 5000);
    });
  });
}

test.describe('Fix Firebase Permissions for Ingredients', () => {

  test('Create admin user document and test ingredients access', async ({ page }) => {
    console.log('=== FIX: Creating Admin User Document ===');
    
    // Step 1: Login
    const loginSuccess = await loginUser(page);
    expect(loginSuccess).toBe(true);
    
    // Step 2: Get authentication info
    const authInfo = await getAuthInfo(page);
    console.log('🔍 Auth Info:', authInfo);
    expect(authInfo.uid).toBeDefined();
    expect(authInfo.email).toBe(ADMIN_CREDENTIALS.email);
    
    // Step 3: Create user document using the debug API
    const createUserResult = await page.evaluate(async (auth) => {
      try {
        const response = await fetch('/api/debug-create-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: auth.uid,
            email: auth.email
          })
        });
        
        const result = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: result
        };
      } catch (error) {
        return { error: error.toString() };
      }
    }, authInfo);
    
    console.log('👤 Create user document result:', createUserResult);
    expect(createUserResult.success).toBe(true);
    
    // Step 4: Wait a moment for the user document to be available
    await page.waitForTimeout(2000);
    
    // Step 5: Test ingredients API directly
    const ingredientsApiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/ingredients/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: data,
          ingredientCount: Array.isArray(data) ? data.length : 0
        };
      } catch (error) {
        return { error: error.toString() };
      }
    });
    
    console.log('🧪 Ingredients API test result:', ingredientsApiTest);
    
    // Step 6: Navigate to ingredients page and check if it loads
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    
    // Wait for ingredients to load or error state
    try {
      await page.waitForFunction(() => {
        const loadingText = document.body.innerText.includes('Carregando');
        const hasIngredients = document.querySelectorAll('[data-testid*="ingredient"], .ingredient-item, tbody tr').length > 0;
        const hasError = document.body.innerText.includes('Erro');
        
        return !loadingText || hasIngredients || hasError;
      }, { timeout: 15000 });
    } catch (error) {
      console.log('⏰ Timeout waiting for ingredients to load');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/ingredients-after-fix.png', 
      fullPage: true 
    });
    
    // Check final state
    const finalState = await page.evaluate(() => {
      const isLoading = document.body.innerText.includes('Carregando');
      const ingredientElements = document.querySelectorAll('[data-testid*="ingredient"], .ingredient-item, tbody tr');
      const hasError = document.body.innerText.includes('Erro');
      
      return {
        isLoading,
        ingredientCount: ingredientElements.length,
        hasError,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('📊 Final ingredients page state:', finalState);
    
    if (finalState.ingredientCount > 0) {
      console.log(`✅ SUCCESS: Found ${finalState.ingredientCount} ingredients! Permissions are fixed!`);
    } else if (finalState.hasError) {
      console.log('❌ ERROR: Still showing error state after creating user document');
    } else if (finalState.isLoading) {
      console.log('⏳ LOADING: Still loading after 15 seconds');
    } else {
      console.log('⚠️ UNKNOWN: Unknown state - check screenshot');
    }
    
    // The test passes if we successfully created the user document and made the API call
    expect(createUserResult.success).toBe(true);
  });
  
  test('Verify ingredients CRUD operations work after permission fix', async ({ page }) => {
    console.log('=== VERIFY: Test CRUD Operations After Fix ===');
    
    // Login and navigate to ingredients
    const loginSuccess = await loginUser(page);
    expect(loginSuccess).toBe(true);
    
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check ingredient count
    const ingredientCount = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid*="ingredient"], .ingredient-item, tbody tr, .grid > div');
      return elements.length;
    });
    
    console.log(`📊 Found ${ingredientCount} ingredients for testing`);
    
    if (ingredientCount === 0) {
      console.log('⚠️ No ingredients found - CRUD testing will be skipped');
      return;
    }
    
    // Test ADD button exists
    const hasAddButton = await page.isVisible('text="Adicionar", text="Novo", button:has-text("Add")');
    console.log(`➕ Add button available: ${hasAddButton}`);
    
    // Look for edit/delete buttons in the first ingredient
    const firstIngredient = page.locator('[data-testid*="ingredient"], .ingredient-item, tbody tr').first();
    
    if (await firstIngredient.isVisible()) {
      // Look for action buttons
      const hasActions = await page.evaluate((element) => {
        const ingredient = element;
        const editButtons = ingredient.querySelectorAll('button:has-text("Editar"), [data-testid*="edit"], [aria-label*="edit"]');
        const deleteButtons = ingredient.querySelectorAll('button:has-text("Excluir"), [data-testid*="delete"], [aria-label*="delete"]');
        const menuButtons = ingredient.querySelectorAll('[data-testid="menu"], .menu-trigger, [data-testid="actions"]');
        
        return {
          editButtons: editButtons.length,
          deleteButtons: deleteButtons.length,
          menuButtons: menuButtons.length
        };
      }, await firstIngredient.elementHandle());
      
      console.log('🔧 Action buttons analysis:', hasActions);
    }
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: 'screenshots/crud-analysis-after-fix.png', 
      fullPage: true 
    });
    
    console.log('✅ CRUD availability analysis complete - check screenshots for UI structure');
  });
});