import { test, expect } from '@playwright/test';

test.describe('Recipe Creation - Romeu e Julieta Tradicional', () => {
  test('should create Romeu e Julieta Tradicional recipe successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for successful login and dashboard to load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for authentication
    
    // Navigate to recipes section
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');

    // Take screenshot of recipes list before creation
    await page.screenshot({ 
      path: 'tests/screenshots/recipes-before-romeu-julieta.png',
      fullPage: true 
    });

    // Verify existing recipes are present
    await expect(page.locator('div.font-medium:has-text("Pão de Queijo Mineiro")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('div.font-medium:has-text("Coxinha de Frango Tradicional")').first()).toBeVisible({ timeout: 10000 });

    // Click "Adicionar" button to create new recipe
    await page.click('button:has-text("Adicionar")');
    await page.waitForLoadState('load');

    // Fill basic recipe information
    await page.fill('input[placeholder="Digite o nome da receita"]', 'Romeu e Julieta Tradicional');
    
    // Select category "other" - it's already set to "Outros" by default
    // await page.selectOption('select[name="category"]', 'other');
    
    // Fill description
    await page.fill('textarea[placeholder="Descrição da receita"]', 'Sobremesa clássica brasileira com queijo e goiabada, combinação perfeita doce e salgado');
    
    // Select difficulty "easy" - it's already set to "Fácil" by default
    // await page.selectOption('select[name="difficulty"]', 'easy');
    
    // Fill quantity and unit in the "Rendimento da Receita" section
    const quantityInput = page.locator('text=Quantidade Gerada').locator('..').locator('input');
    await quantityInput.fill('400');
    
    // Fill portions
    const portionsInput = page.locator('text=Porções').locator('..').locator('input');
    await portionsInput.fill('8');

    // Add first ingredient - need to click "Adicionar Item" first
    await page.click('button:has-text("Adicionar Item")');
    await page.waitForTimeout(1000);
    
    // Fill first ingredient
    await page.fill('input[placeholder="Selecione um ingrediente"]', 'Queijo minas fresco');
    await page.waitForTimeout(500);
    // Press Enter to confirm the ingredient
    await page.press('input[placeholder="Selecione um ingrediente"]', 'Enter');
    
    // Fill quantity for first ingredient (look for quantity input in ingredient row)
    const firstQuantityInput = page.locator('input').filter({ hasText: '' }).nth(0); // quantity field
    await firstQuantityInput.fill('200');

    // Add second ingredient - Goiabada
    await page.click('button:has-text("Adicionar Item")');
    await page.waitForTimeout(1000);
    
    // Fill second ingredient details  
    const secondIngredientField = page.locator('input[placeholder="Selecione um ingrediente"]').nth(1);
    await secondIngredientField.fill('Goiabada');
    await page.waitForTimeout(500);
    await secondIngredientField.press('Enter');
    
    // Fill quantity for second ingredient
    await page.locator('input[value="1"]').nth(1).fill('200');

    // Add preparation steps
    // Step 1 - click "Adicionar Primeiro Passo" button
    await page.click('button:has-text("Adicionar Primeiro Passo")');
    await page.waitForTimeout(1000);
    
    // Fill first step
    await page.fill('textarea[placeholder*="Descrição"]', 'Corte o queijo minas em fatias de 1cm de espessura');
    await page.fill('input[placeholder*="Duração"]', '5');

    // Step 2
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    // Fill second step
    const secondStepDescription = page.locator('textarea[placeholder*="Descrição"]').nth(1);
    const secondStepDuration = page.locator('input[placeholder*="Duração"]').nth(1);
    await secondStepDescription.fill('Corte a goiabada em fatias da mesma espessura do queijo');
    await secondStepDuration.fill('5');

    // Step 3
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    // Fill third step
    const thirdStepDescription = page.locator('textarea[placeholder*="Descrição"]').nth(2);
    const thirdStepDuration = page.locator('input[placeholder*="Duração"]').nth(2);
    await thirdStepDescription.fill('Monte alternando uma fatia de queijo e uma de goiabada');
    await thirdStepDuration.fill('5');

    // Step 4
    await page.click('button:has-text("Adicionar Passo")');
    await page.waitForTimeout(1000);
    
    // Fill fourth step
    const fourthStepDescription = page.locator('textarea[placeholder*="Descrição"]').nth(3);
    const fourthStepDuration = page.locator('input[placeholder*="Duração"]').nth(3);
    await fourthStepDescription.fill('Sirva em temperatura ambiente');
    await fourthStepDuration.fill('0');

    // Add notes (scroll down to find the notes section)
    await page.scrollIntoViewIfNeeded('text=Observações');
    await page.fill('textarea[placeholder*="observações"]', 'Combinação tradicional brasileira. Use queijo minas bem fresco e goiabada de boa qualidade. Pode ser servido como sobremesa ou lanche.');

    // Take screenshot before saving
    await page.screenshot({ 
      path: 'tests/screenshots/romeu-julieta-form-filled.png',
      fullPage: true 
    });

    // Save the recipe
    await page.click('button[type="submit"]:has-text("Salvar")');
    
    // Wait for success and redirect back to recipes list
    await page.waitForURL('**/recipes', { timeout: 15000 });
    await page.waitForLoadState('load');

    // Verify the new recipe appears in the list
    await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible({ timeout: 10000 });
    
    // Verify category and difficulty display
    const recipeCard = page.locator('div').filter({ hasText: 'Romeu e Julieta Tradicional' }).first();
    await expect(recipeCard.locator('text=Outros')).toBeVisible(); // Category "other" shows as "Outros"
    await expect(recipeCard.locator('text=Fácil')).toBeVisible(); // Difficulty "easy" shows as "Fácil"

    // Verify all three recipes are now present
    await expect(page.locator('div.font-medium:has-text("Pão de Queijo Mineiro")').first()).toBeVisible();
    await expect(page.locator('div.font-medium:has-text("Coxinha de Frango Tradicional")').first()).toBeVisible();
    await expect(page.locator('div.font-medium:has-text("Romeu e Julieta Tradicional")').first()).toBeVisible();

    // Take final screenshot showing all three recipes
    await page.screenshot({ 
      path: 'tests/screenshots/recipes-with-all-three.png',
      fullPage: true 
    });

    console.log('✅ Successfully created Romeu e Julieta Tradicional recipe');
    console.log('✅ All three Brazilian recipes are now present in the system');
  });
});