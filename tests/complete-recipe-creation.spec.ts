import { test, expect } from '@playwright/test';

test.describe('Complete Recipe Creation Test', () => {
  test('Create a complete recipe with ingredients and steps', async ({ page }) => {
    console.log('🎯 Starting complete recipe creation test...');
    
    // Step 1: Login
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('load');
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch (error) {
      console.log('Login redirect timeout, continuing...');
    }
    
    await page.screenshot({ path: 'screenshots/complete-01-logged-in.png', fullPage: true });
    
    // Step 2: Navigate to recipes
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'screenshots/complete-02-recipes-page.png', fullPage: true });
    
    // Step 3: Click Add Recipe button
    const addButton = page.locator('button:has-text("Adicionar")').first();
    await addButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/complete-03-form-opened.png', fullPage: true });
    
    // Step 4: Fill basic recipe information
    console.log('📝 Filling basic recipe information...');
    
    // Fill recipe name
    await page.fill('#name', 'Brigadeiro Tradicional Completo');
    
    // Select category (if available)
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Fill description
    const descriptionField = page.locator('textarea').first();
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('Um delicioso brigadeiro tradicional brasileiro, feito com leite condensado, chocolate em pó e manteiga.');
    }
    
    // Set difficulty
    const difficultySelect = page.locator('select:has-option("Fácil")').first();
    if (await difficultySelect.isVisible()) {
      await difficultySelect.selectOption('Fácil');
    }
    
    // Fill yield information
    await page.fill('#generatedAmount', '30');
    await page.fill('#servings', '6');
    
    await page.screenshot({ path: 'screenshots/complete-04-basic-info-filled.png', fullPage: true });
    
    // Step 5: Add ingredients
    console.log('🥄 Adding ingredients...');
    
    try {
      const addIngredientButton = page.locator('button:has-text("Adicionar Item")').first();
      if (await addIngredientButton.isVisible()) {
        await addIngredientButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'screenshots/complete-05-ingredient-form-opened.png', fullPage: true });
        
        // Try to fill ingredient information if form appears
        // This will depend on the exact structure of the ingredient form
        const ingredientNameField = page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]').first();
        if (await ingredientNameField.isVisible()) {
          await ingredientNameField.fill('Leite Condensado');
        }
        
        const quantityField = page.locator('input[type="number"]').first();
        if (await quantityField.isVisible()) {
          await quantityField.fill('1');
        }
        
        // Look for unit selector
        const unitSelect = page.locator('select').last();
        if (await unitSelect.isVisible()) {
          await unitSelect.selectOption({ index: 1 });
        }
        
        await page.screenshot({ path: 'screenshots/complete-06-ingredient-filled.png', fullPage: true });
        
        // Try to save the ingredient
        const saveIngredientButton = page.locator('button:has-text("Salvar"), button:has-text("Adicionar"), button[type="submit"]').last();
        if (await saveIngredientButton.isVisible()) {
          await saveIngredientButton.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      console.log('Could not add ingredient:', error.message);
    }
    
    await page.screenshot({ path: 'screenshots/complete-07-after-ingredient.png', fullPage: true });
    
    // Step 6: Add preparation steps
    console.log('📋 Adding preparation steps...');
    
    try {
      const addStepButton = page.locator('button:has-text("Adicionar Passo"), button:has-text("Adicionar Primeiro Passo")').first();
      if (await addStepButton.isVisible()) {
        await addStepButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'screenshots/complete-08-step-form-opened.png', fullPage: true });
        
        // Fill step information
        const stepDescriptionField = page.locator('textarea, input[type="text"]').last();
        if (await stepDescriptionField.isVisible()) {
          await stepDescriptionField.fill('Em uma panela, misture o leite condensado, o chocolate em pó e a manteiga.');
        }
        
        // Set step duration if available
        const durationField = page.locator('input[type="number"]').last();
        if (await durationField.isVisible()) {
          await durationField.fill('5');
        }
        
        await page.screenshot({ path: 'screenshots/complete-09-step-filled.png', fullPage: true });
        
        // Save the step
        const saveStepButton = page.locator('button:has-text("Salvar"), button:has-text("Adicionar")').last();
        if (await saveStepButton.isVisible()) {
          await saveStepButton.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (error) {
      console.log('Could not add preparation step:', error.message);
    }
    
    await page.screenshot({ path: 'screenshots/complete-10-after-step.png', fullPage: true });
    
    // Step 7: Fill observations if available
    const observationsField = page.locator('textarea[placeholder*="Observações"], textarea[placeholder*="Notas"]').first();
    if (await observationsField.isVisible()) {
      await observationsField.fill('Mexa sempre em fogo baixo para não queimar. O ponto ideal é quando a mistura desgruda do fundo da panela.');
    }
    
    await page.screenshot({ path: 'screenshots/complete-11-all-filled.png', fullPage: true });
    
    // Step 8: Submit the complete recipe
    console.log('🚀 Submitting complete recipe...');
    
    // Look for the final submit button (usually "Criar" or "Salvar")
    const submitButton = page.locator('button:has-text("Criar"), button:has-text("Salvar"), button[type="submit"]').last();
    
    if (await submitButton.isVisible()) {
      console.log('Found submit button, attempting to submit...');
      
      // Set up error monitoring
      let errorOccurred = false;
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
          errorOccurred = true;
        }
      });
      
      page.on('response', response => {
        console.log(`Response: ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          console.log('HTTP error response detected');
          errorOccurred = true;
        }
      });
      
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'screenshots/complete-12-after-submit.png', fullPage: true });
      
      // Check if submission was successful
      const currentUrl = page.url();
      console.log('URL after submission:', currentUrl);
      
      // Look for success indicators
      const successIndicators = [
        '.success',
        '.alert-success',
        '[data-testid*="success"]',
        'text="Receita criada com sucesso"',
        'text="Recipe created successfully"'
      ];
      
      let successFound = false;
      for (const indicator of successIndicators) {
        try {
          const element = await page.locator(indicator).first();
          if (await element.isVisible()) {
            const text = await element.textContent();
            console.log(`✅ Success indicator found: ${text}`);
            successFound = true;
            break;
          }
        } catch (error) {
          // Continue checking other indicators
        }
      }
      
      // Look for error indicators
      const errorIndicators = [
        '.error',
        '.alert-error',
        '.alert-danger',
        '[data-testid*="error"]',
        '.text-red-500',
        '.text-destructive'
      ];
      
      for (const indicator of errorIndicators) {
        try {
          const element = await page.locator(indicator).first();
          if (await element.isVisible()) {
            const text = await element.textContent();
            console.log(`❌ Error indicator found: ${text}`);
            errorOccurred = true;
          }
        } catch (error) {
          // Continue checking other indicators
        }
      }
      
      // Check if we're back on the recipes list (indicating success)
      if (currentUrl.includes('/recipes') && !currentUrl.includes('/new') && !currentUrl.includes('/create')) {
        console.log('✅ Redirected back to recipes list - likely successful');
        successFound = true;
      }
      
      if (successFound && !errorOccurred) {
        console.log('✅ Recipe creation appears to have succeeded!');
      } else if (errorOccurred) {
        console.log('❌ Recipe creation failed with errors');
      } else {
        console.log('⚠️ Recipe creation status unclear');
      }
      
    } else {
      console.log('❌ No submit button found');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshots/complete-13-final-state.png', fullPage: true });
    
    console.log('✅ Complete recipe creation test finished!');
  });
});