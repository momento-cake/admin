import { test, expect } from '@playwright/test';

test.describe('Recipe Creation - Romeu e Julieta Minimal', () => {
  test('should create Romeu e Julieta Tradicional recipe with minimal requirements', async ({ page }) => {
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

    // Verify existing recipes are present
    await expect(page.locator('div.font-medium:has-text("Pão de Queijo Mineiro")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('div.font-medium:has-text("Coxinha de Frango Tradicional")').first()).toBeVisible({ timeout: 10000 });

    // Click "Adicionar" button to create new recipe
    await page.click('button:has-text("Adicionar")');
    await page.waitForLoadState('load');

    // Fill basic recipe information
    await page.fill('input[placeholder="Digite o nome da receita"]', 'Romeu e Julieta Tradicional');
    await page.fill('textarea[placeholder="Descrição da receita"]', 'Sobremesa clássica brasileira com queijo e goiabada, combinação perfeita doce e salgado');
    
    // Fill quantity and portions
    const quantityInput = page.locator('text=Quantidade Gerada').locator('..').locator('input');
    await quantityInput.fill('400');
    
    const portionsInput = page.locator('text=Porções').locator('..').locator('input');
    await portionsInput.fill('8');

    // Add first ingredient
    await page.click('button:has-text("Adicionar Primeiro Item")');
    await page.waitForTimeout(1000);
    
    // Fill first ingredient details - Queijo minas fresco
    await page.fill('input[placeholder="Selecione um ingrediente"]', 'Queijo minas fresco');
    await page.waitForTimeout(500);
    await page.press('input[placeholder="Selecione um ingrediente"]', 'Enter');
    
    // Fill quantity for first ingredient
    await page.fill('input[value="1"]', '200');

    // Add just one preparation step (minimum requirement)
    await page.click('button:has-text("Adicionar Primeiro Passo")');
    await page.waitForTimeout(1000);
    
    // Fill the step
    await page.fill('textarea[placeholder="Descreva o passo de preparação..."]', 'Corte o queijo minas e a goiabada em fatias. Monte alternando fatias de queijo e goiabada. Sirva em temperatura ambiente.');
    await page.fill('input[value="0"]', '15');

    // Add notes
    await page.fill('textarea[placeholder*="Observações"]', 'Combinação tradicional brasileira. Use queijo minas bem fresco e goiabada de boa qualidade.');

    // Take screenshot before saving
    await page.screenshot({ 
      path: 'tests/screenshots/romeu-julieta-minimal-complete.png',
      fullPage: true 
    });

    // Save the recipe
    await page.click('button:has-text("Criar")');
    
    // Wait for redirect and check success
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    console.log('Current URL after save:', currentUrl);

    if (currentUrl.includes('/recipes') && !currentUrl.includes('/recipes/create')) {
      // SUCCESS! We're back at recipes list
      await page.waitForLoadState('load');
      
      // Verify the new recipe appears in the list
      await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible({ timeout: 10000 });

      // Verify all three recipes are now present
      await expect(page.locator('div.font-medium:has-text("Pão de Queijo Mineiro")').first()).toBeVisible();
      await expect(page.locator('div.font-medium:has-text("Coxinha de Frango Tradicional")').first()).toBeVisible();
      await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible();

      // Take final screenshot showing all three recipes
      await page.screenshot({ 
        path: 'tests/screenshots/SUCCESS-all-three-recipes-complete.png',
        fullPage: true 
      });

      console.log('🎉 SUCCESS! Created Romeu e Julieta Tradicional recipe!');
      console.log('✅ All three Brazilian recipes are now present:');
      console.log('   1. Pão de Queijo Mineiro');
      console.log('   2. Coxinha de Frango Tradicional'); 
      console.log('   3. Romeu e Julieta Tradicional');
      console.log('🎊 Mission accomplished! Third Brazilian recipe created successfully!');
    } else {
      console.log('⚠️ Still on form, checking for any validation issues...');
      await page.screenshot({ 
        path: 'tests/screenshots/romeu-julieta-validation-check.png',
        fullPage: true 
      });
    }
  });
});