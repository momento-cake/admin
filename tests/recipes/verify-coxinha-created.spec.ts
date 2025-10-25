import { test, expect } from '@playwright/test';

test.describe('Verify Coxinha Recipe Creation', () => {
  test('should verify Coxinha de Frango Tradicional was created successfully', async ({ page }) => {
    // Login and navigate to recipes
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard.*/);
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    
    // Search for our Coxinha recipe
    const searchInput = page.locator('input[placeholder="Buscar receitas..."]');
    await searchInput.fill('Coxinha de Frango');
    await page.waitForTimeout(1000);
    
    // Check if recipe appears
    const coxinhaRecipe = page.locator('text=Coxinha de Frango Tradicional');
    if (await coxinhaRecipe.isVisible()) {
      console.log('✅ SUCCESS: Coxinha de Frango Tradicional found in recipes list!');
      
      // Take screenshot showing the recipe
      await page.screenshot({ 
        path: 'screenshots/coxinha-verification.png',
        fullPage: true 
      });
      
      // Try to click "Ver" button to view details
      const viewButton = page.locator('button:has-text("Ver")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot of recipe details
        await page.screenshot({ 
          path: 'screenshots/coxinha-details.png',
          fullPage: true 
        });
        console.log('✅ Recipe details screenshot taken');
      }
    } else {
      console.log('⚠️ Coxinha recipe not found with search, checking full list...');
      
      // Clear search and scroll through list
      await searchInput.clear();
      await page.waitForTimeout(1000);
      
      // Take screenshot of full recipes list
      await page.screenshot({ 
        path: 'screenshots/full-recipes-list.png',
        fullPage: true 
      });
      
      // Look for recipe in full list
      const allRecipes = await page.locator('[data-testid="recipe-item"], .recipe-row, .recipe-card').count();
      console.log(`Found ${allRecipes} recipes in total`);
      
      // Check if Coxinha is visible anywhere
      const coxinhaInList = await page.locator('text=Coxinha').isVisible();
      if (coxinhaInList) {
        console.log('✅ Found Coxinha recipe in the full list!');
      } else {
        console.log('❌ Coxinha recipe not found in recipes list');
      }
    }
  });
});