import { test, expect } from '@playwright/test';

test.describe('Verify Current Recipes', () => {
  test('should show all current recipes in the system', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for authentication
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    // Navigate to recipes section
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');

    // Take screenshot of current recipes
    await page.screenshot({ 
      path: 'tests/screenshots/current-recipes-verification.png',
      fullPage: true 
    });

    // Check what recipes are present
    const allRecipeNames = await page.locator('div.font-medium').allTextContents();
    console.log('All recipes found:', allRecipeNames);

    // Look specifically for our Brazilian recipes
    const targetRecipes = [
      'Pão de Queijo Mineiro',
      'Coxinha de Frango Tradicional', 
      'Romeu e Julieta Tradicional'
    ];

    let foundCount = 0;
    for (const recipeName of targetRecipes) {
      const recipeExists = await page.locator(`div.font-medium:has-text("${recipeName}")`).isVisible().catch(() => false);
      if (recipeExists) {
        console.log(`✅ Found: ${recipeName}`);
        foundCount++;
      } else {
        console.log(`❌ Missing: ${recipeName}`);
      }
    }

    console.log(`\n📊 Results: ${foundCount}/${targetRecipes.length} Brazilian recipes found`);
    
    if (foundCount === 3) {
      console.log('🎉 SUCCESS! All three Brazilian recipes are present!');
    } else {
      console.log(`⚠️  Only ${foundCount} out of 3 Brazilian recipes found. May need to create the missing ones.`);
    }

    // Also check the total recipe count
    const totalCount = await page.locator('text=receitas encontradas').textContent();
    console.log('Total recipes in system:', totalCount);
  });
});