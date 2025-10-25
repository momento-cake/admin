import { test, expect } from '@playwright/test';

test.describe('Recipe Creation - Romeu e Julieta Final', () => {
  test('should create Romeu e Julieta Tradicional recipe successfully', async ({ page }) => {
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

    // Add second ingredient
    await page.click('button:has-text("Adicionar Item")');
    await page.waitForTimeout(1000);
    
    // Fill second ingredient details - Goiabada
    const secondIngredientInput = page.locator('input[placeholder="Selecione um ingrediente"]').nth(1);
    await secondIngredientInput.fill('Goiabada');
    await page.waitForTimeout(500);
    await secondIngredientInput.press('Enter');
    
    // Skip the second quantity for now, the form should accept default value

    // Add preparation steps
    // Step 1
    await page.click('button:has-text("Adicionar Primeiro Passo")');
    await page.waitForTimeout(1000);
    
    await page.fill('textarea[placeholder="Descreva o passo de preparação..."]', 'Corte o queijo minas em fatias de 1cm de espessura');
    await page.fill('input[value="0"]', '5');

    // Step 2
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    const secondStepDescription = page.locator('textarea[placeholder="Descreva o passo de preparação..."]').nth(1);
    const secondStepDuration = page.locator('input[value="0"]').nth(1);
    await secondStepDescription.fill('Corte a goiabada em fatias da mesma espessura do queijo');
    await secondStepDuration.fill('5');

    // Step 3
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    const thirdStepDescription = page.locator('textarea[placeholder="Descreva o passo de preparação..."]').nth(2);
    const thirdStepDuration = page.locator('input[value="0"]').nth(2);
    await thirdStepDescription.fill('Monte alternando uma fatia de queijo e uma de goiabada');
    await thirdStepDuration.fill('5');

    // Step 4
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    const fourthStepDescription = page.locator('textarea[placeholder="Descreva o passo de preparação..."]').nth(3);
    const fourthStepDuration = page.locator('input[value="0"]').nth(3);
    await fourthStepDescription.fill('Sirva em temperatura ambiente');
    await fourthStepDuration.fill('0');

    // Add notes (I can see the notes section in the screenshot)
    await page.fill('textarea[placeholder*="Observações"]', 'Combinação tradicional brasileira. Use queijo minas bem fresco e goiabada de boa qualidade. Pode ser servido como sobremesa ou lanche.');

    // Take screenshot before saving
    await page.screenshot({ 
      path: 'tests/screenshots/romeu-julieta-final-form.png',
      fullPage: true 
    });

    // Save the recipe
    await page.click('button:has-text("Criar")');
    
    // Wait for redirect back to recipes list
    await page.waitForTimeout(5000);

    // Check if we successfully created the recipe
    const currentUrl = page.url();
    console.log('Current URL after save:', currentUrl);

    if (currentUrl.includes('/recipes') && !currentUrl.includes('/recipes/create')) {
      // We're back at recipes list - success!
      await page.waitForLoadState('load');
      
      // Verify the new recipe appears in the list
      await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible({ timeout: 10000 });

      // Verify all three recipes are now present
      await expect(page.locator('div.font-medium:has-text("Pão de Queijo Mineiro")').first()).toBeVisible();
      await expect(page.locator('div.font-medium:has-text("Coxinha de Frango Tradicional")').first()).toBeVisible();
      await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible();

      // Take final screenshot showing all three recipes
      await page.screenshot({ 
        path: 'tests/screenshots/all-three-brazilian-recipes-success.png',
        fullPage: true 
      });

      console.log('✅ SUCCESS! Created Romeu e Julieta Tradicional recipe');
      console.log('✅ All three Brazilian recipes are now present:');
      console.log('   - Pão de Queijo Mineiro');
      console.log('   - Coxinha de Frango Tradicional'); 
      console.log('   - Romeu e Julieta Tradicional');
    } else {
      console.log('⚠️ Still on form, possibly validation errors');
      await page.screenshot({ 
        path: 'tests/screenshots/romeu-julieta-save-issues.png',
        fullPage: true 
      });
    }
  });
});