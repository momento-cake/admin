import { test, expect } from '@playwright/test';

test('Create Recipe 5: Sequilhos de Maizena', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3001');
  
  // Login with admin credentials
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('load');
  
  // Fill login form using verified selectors
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  
  // Wait for login to complete - more flexible approach
  try {
    await page.waitForURL('**/dashboard**', { timeout: 5000 });
  } catch {
    // If not redirected, check if we're still on login page or at dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Already at dashboard');
    } else {
      // Try navigating directly to dashboard
      await page.goto('http://localhost:3001/dashboard');
      await page.waitForLoadState('load');
    }
  }
  
  // Navigate to recipes section
  await page.goto('http://localhost:3001/recipes');
  await page.waitForLoadState('load');
  
  // Take screenshot of existing recipes list
  await page.screenshot({ path: 'screenshots/recipes-before-recipe-5.png', fullPage: true });
  
  // Count existing recipes
  const existingRecipes = await page.locator('[data-testid="recipe-card"]').count();
  console.log(`Found ${existingRecipes} existing recipes`);
  
  // Look for "Adicionar" button to create new recipe
  const addButton = page.locator('button:has-text("Adicionar")').first();
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();
  
  // Wait for recipe creation form to load
  await page.waitForLoadState('load');
  
  // Fill basic recipe information - using placeholder text I can see in the form
  await page.fill('input[placeholder="Digite o nome da receita"]', 'Sequilhos de Maizena');
  
  // Fill description
  await page.fill('textarea[placeholder="Descrição da receita"]', 'Biscoitinhos delicados brasileiros que derretem na boca, feitos com amido de milho');
  
  // Fill the quantity and portion fields by targeting specific input elements
  // Look for quantity field in "Rendimento da Receita" section
  await page.locator('text=Quantidade Gerada').locator('..').locator('input').fill('300');
  
  // Fill portions field - clear and set to 30
  const portionsInput = page.locator('text=Porções').locator('..').locator('input');
  await portionsInput.clear();
  await portionsInput.fill('30');
  
  // Add one test ingredient to verify the form works
  await page.click('button:has-text("Adicionar Item")');
  await page.waitForTimeout(1000);
  
  // Just add one ingredient to test
  const firstIngredientInput = page.locator('input').filter({ hasText: '' }).first();
  await firstIngredientInput.fill('Amido de milho (maizena)');
  
  // Add one test step to verify the form works
  await page.click('button:has-text("Adicionar Passo")');
  await page.waitForTimeout(1000);
  
  // Just add one step to test
  const firstStepTextarea = page.locator('textarea').first();
  await firstStepTextarea.fill('Bata a manteiga com açúcar até obter creme fofo');
  
  // Take screenshot before saving
  await page.screenshot({ path: 'screenshots/recipe-5-form-filled.png', fullPage: true });
  
  // Scroll down to find the save button
  await page.keyboard.press('End');
  await page.waitForTimeout(1000);
  
  // Look for various save button texts that might exist
  const saveButton = page.locator('button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Confirmar"), button:has-text("Finalizar"), button[type="submit"]').first();
  
  // If not found, scroll down more and try again
  if (!(await saveButton.isVisible())) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(1000);
  }
  
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();
  
  // Wait for save to complete and redirect
  await page.waitForLoadState('load');
  
  // Wait a moment for the recipe to appear in the list
  await page.waitForTimeout(2000);
  
  // Verify the recipe was created by checking if it appears in the list
  await expect(page.locator('text=Sequilhos de Maizena')).toBeVisible({ timeout: 10000 });
  
  // Count recipes again to verify increase
  const finalRecipeCount = await page.locator('[data-testid="recipe-card"]').count();
  console.log(`Final recipe count: ${finalRecipeCount}`);
  
  // Take final screenshot
  await page.screenshot({ path: 'screenshots/recipes-after-recipe-5.png', fullPage: true });
  
  // Verify the recipe details
  const recipeCard = page.locator('[data-testid="recipe-card"]').filter({ hasText: 'Sequilhos de Maizena' });
  await expect(recipeCard).toBeVisible();
  
  // Check category shows as Biscoitos (Cookies)
  await expect(recipeCard.locator('text=Biscoitos')).toBeVisible();
  
  // Check difficulty shows as Fácil (Easy)
  await expect(recipeCard.locator('text=Fácil')).toBeVisible();
  
  // Check portions show as 30
  await expect(recipeCard.locator('text=30 porções')).toBeVisible();
  
  console.log('✅ Recipe "Sequilhos de Maizena" created successfully!');
  console.log(`✅ Final count: ${finalRecipeCount} recipes (should be 29)`);
  
  // Verify we now have 29 total recipes
  expect(finalRecipeCount).toBe(29);
});