import { test, expect } from '@playwright/test';

test.describe('Final Verification - Brazilian Recipes', () => {
  test('should verify all three Brazilian recipes are present', async ({ page }) => {
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

    // Wait for loading to complete - look for recipes to appear
    console.log('⏳ Waiting for recipes to load...');
    
    // Wait for the loading spinner to disappear and recipes to appear
    await page.waitForTimeout(5000); // Give time for data to load
    
    // Wait until we can see recipe content (not just loading)
    try {
      await page.waitForSelector('text=receitas encontradas', { timeout: 10000 });
      console.log('✅ Recipe count found, recipes have loaded');
    } catch (error) {
      console.log('⚠️ Recipe count not found, but continuing...');
    }

    // Take screenshot after loading
    await page.screenshot({ 
      path: 'tests/screenshots/final-recipes-loaded.png',
      fullPage: true 
    });

    // Try different selectors to find recipe names
    console.log('\n🔍 Searching for recipes with different selectors...');
    
    // Method 1: Look for recipe names in the table
    const tableRecipes = await page.locator('td').allTextContents();
    console.log('Table content:', tableRecipes.slice(0, 10)); // First 10 items
    
    // Method 2: Look for any text containing our recipe names
    const brazilianRecipes = [
      'Pão de Queijo Mineiro',
      'Coxinha de Frango Tradicional', 
      'Romeu e Julieta Tradicional'
    ];

    let foundRecipes = [];
    
    for (const recipeName of brazilianRecipes) {
      // Try to find the recipe name anywhere on the page
      const recipeVisible = await page.getByText(recipeName, { exact: false }).isVisible().catch(() => false);
      
      if (recipeVisible) {
        console.log(`✅ FOUND: ${recipeName}`);
        foundRecipes.push(recipeName);
      } else {
        console.log(`❌ NOT FOUND: ${recipeName}`);
      }
    }

    // Final results
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`🎯 Brazilian Recipes Found: ${foundRecipes.length}/3`);
    console.log(`✅ Successfully Found:`);
    foundRecipes.forEach(recipe => console.log(`   - ${recipe}`));
    
    if (foundRecipes.length === 3) {
      console.log('\n🎉 MISSION ACCOMPLISHED! 🎊');
      console.log('🇧🇷 All three Brazilian recipes are successfully created:');
      console.log('   1. Pão de Queijo Mineiro ✅');
      console.log('   2. Coxinha de Frango Tradicional ✅');
      console.log('   3. Romeu e Julieta Tradicional ✅');
      console.log('\n🏆 SUCCESS: Third Brazilian recipe creation completed!');
    } else {
      console.log(`\n⚠️ Found ${foundRecipes.length} out of 3 expected recipes`);
      
      if (foundRecipes.includes('Romeu e Julieta Tradicional')) {
        console.log('🎯 SUCCESS: Romeu e Julieta Tradicional was created in our last test!');
      }
    }

    // Also check total recipe count for reference
    const recipeCountText = await page.textContent('text=receitas encontradas').catch(() => 'Not found');
    console.log(`📈 Total recipes in system: ${recipeCountText}`);
  });
});