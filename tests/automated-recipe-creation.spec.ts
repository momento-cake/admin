import { test, expect } from '@playwright/test';

test.describe('Automated Brazilian Recipe Creation', () => {
  test.setTimeout(180000); // 3 minutes per test

  test.beforeEach(async ({ page }) => {
    // Login process
    await page.goto('http://localhost:3001/login');
    await page.waitForTimeout(1000);
    
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to recipes page
    await page.goto('http://localhost:3001/recipes');
    await page.waitForTimeout(2000);
  });

  test('Create Recipe 1: Pão de Queijo Mineiro', async ({ page }) => {
    console.log('🍰 Creating Recipe 1: Pão de Queijo Mineiro');
    
    // Take screenshot of recipes page
    await page.screenshot({ 
      path: 'screenshots/auto-01-recipes-page.png', 
      fullPage: true 
    });

    // Click the "Adicionar" button
    await page.click('button:has-text("Adicionar")');
    await page.waitForTimeout(2000);
    
    // Take screenshot of form
    await page.screenshot({ 
      path: 'screenshots/auto-01-form-opened.png', 
      fullPage: true 
    });

    // Fill basic recipe information
    await page.fill('input[name="name"]', 'Pão de Queijo Mineiro');
    
    // Select category
    await page.selectOption('select[name="category"]', 'breads');
    
    // Fill description
    await page.fill('textarea[name="description"]', 'Tradicional pão de queijo mineiro, crocante por fora e macio por dentro');
    
    // Select difficulty
    await page.selectOption('select[name="difficulty"]', 'medium');
    
    // Fill quantity, unit, and portions
    await page.fill('input[name="quantity"]', '500');
    await page.fill('input[name="unit"]', 'g');
    await page.fill('input[name="portions"]', '25');

    // Take screenshot after basic info
    await page.screenshot({ 
      path: 'screenshots/auto-01-basic-filled.png', 
      fullPage: true 
    });

    // Add ingredients
    const ingredients = [
      { name: 'Polvilho doce', quantity: '250', unit: 'g' },
      { name: 'Polvilho azedo', quantity: '250', unit: 'g' },
      { name: 'Queijo minas', quantity: '200', unit: 'g' },
      { name: 'Leite', quantity: '200', unit: 'ml' },
      { name: 'Óleo', quantity: '100', unit: 'ml' },
      { name: 'Ovos', quantity: '3', unit: 'unidades' },
      { name: 'Sal', quantity: '10', unit: 'g' }
    ];

    for (const ingredient of ingredients) {
      console.log(`  Adding ingredient: ${ingredient.name}`);
      
      // Click "Adicionar Item" button
      await page.click('button:has-text("Adicionar Item")');
      await page.waitForTimeout(500);
      
      // Fill ingredient fields - target the last/newest fields
      const ingredientFields = await page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]');
      const quantityFields = await page.locator('input[placeholder*="quantidade"], input[name*="quantity"]');
      const unitFields = await page.locator('input[placeholder*="unidade"], input[name*="unit"]');
      
      await ingredientFields.last().fill(ingredient.name);
      await quantityFields.last().fill(ingredient.quantity);
      await unitFields.last().fill(ingredient.unit);
    }

    // Take screenshot after ingredients
    await page.screenshot({ 
      path: 'screenshots/auto-01-ingredients-added.png', 
      fullPage: true 
    });

    // Add preparation steps
    const steps = [
      { description: 'Ferva o leite com o óleo e o sal', duration: '5' },
      { description: 'Escalde o polvilho com a mistura quente', duration: '10' },
      { description: 'Adicione os ovos e o queijo ralado', duration: '5' },
      { description: 'Sove até obter massa homogênea', duration: '10' },
      { description: 'Modele bolinhas e asse a 180°C', duration: '25' }
    ];

    for (const step of steps) {
      console.log(`  Adding step: ${step.description}`);
      
      // Click "Adicionar Passo" button
      await page.click('button:has-text("Adicionar Passo")');
      await page.waitForTimeout(500);
      
      // Fill step fields - target the last/newest fields
      const descriptionFields = await page.locator('textarea[placeholder*="descrição"], textarea[name*="description"], input[name*="description"]');
      const durationFields = await page.locator('input[placeholder*="tempo"], input[name*="duration"], input[name*="time"]');
      
      await descriptionFields.last().fill(step.description);
      await durationFields.last().fill(step.duration);
    }

    // Take screenshot of completed form
    await page.screenshot({ 
      path: 'screenshots/auto-01-form-completed.png', 
      fullPage: true 
    });

    // Save the recipe
    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(3000);
    
    // Take screenshot after save
    await page.screenshot({ 
      path: 'screenshots/auto-01-saved.png', 
      fullPage: true 
    });

    console.log('✅ Recipe 1: Pão de Queijo Mineiro created successfully!');
  });

  test('Create Recipe 2: Coxinha de Frango Tradicional', async ({ page }) => {
    console.log('🍰 Creating Recipe 2: Coxinha de Frango Tradicional');
    
    // Click the "Adicionar" button
    await page.click('button:has-text("Adicionar")');
    await page.waitForTimeout(2000);

    // Fill basic recipe information
    await page.fill('input[name="name"]', 'Coxinha de Frango Tradicional');
    await page.selectOption('select[name="category"]', 'other');
    await page.fill('textarea[name="description"]', 'Salgado tradicional brasileiro com massa cremosa e recheio de frango');
    await page.selectOption('select[name="difficulty"]', 'hard');
    await page.fill('input[name="quantity"]', '1000');
    await page.fill('input[name="unit"]', 'g');
    await page.fill('input[name="portions"]', '20');

    // Add ingredients
    const ingredients = [
      { name: 'Farinha de trigo', quantity: '500', unit: 'g' },
      { name: 'Frango desfiado', quantity: '400', unit: 'g' },
      { name: 'Caldo de galinha', quantity: '500', unit: 'ml' },
      { name: 'Manteiga', quantity: '50', unit: 'g' },
      { name: 'Cebola', quantity: '100', unit: 'g' },
      { name: 'Alho', quantity: '20', unit: 'g' },
      { name: 'Farinha de rosca', quantity: '200', unit: 'g' }
    ];

    for (const ingredient of ingredients) {
      await page.click('button:has-text("Adicionar Item")');
      await page.waitForTimeout(500);
      
      const ingredientFields = await page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]');
      const quantityFields = await page.locator('input[placeholder*="quantidade"], input[name*="quantity"]');
      const unitFields = await page.locator('input[placeholder*="unidade"], input[name*="unit"]');
      
      await ingredientFields.last().fill(ingredient.name);
      await quantityFields.last().fill(ingredient.quantity);
      await unitFields.last().fill(ingredient.unit);
    }

    // Add preparation steps
    const steps = [
      { description: 'Refogue frango com cebola e alho', duration: '15' },
      { description: 'Prepare a massa com caldo e farinha', duration: '20' },
      { description: 'Modele as coxinhas com recheio', duration: '30' },
      { description: 'Empane e frite em óleo quente', duration: '15' }
    ];

    for (const step of steps) {
      await page.click('button:has-text("Adicionar Passo")');
      await page.waitForTimeout(500);
      
      const descriptionFields = await page.locator('textarea[placeholder*="descrição"], textarea[name*="description"], input[name*="description"]');
      const durationFields = await page.locator('input[placeholder*="tempo"], input[name*="duration"], input[name*="time"]');
      
      await descriptionFields.last().fill(step.description);
      await durationFields.last().fill(step.duration);
    }

    // Take screenshot and save
    await page.screenshot({ 
      path: 'screenshots/auto-02-form-completed.png', 
      fullPage: true 
    });

    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(3000);

    console.log('✅ Recipe 2: Coxinha de Frango Tradicional created successfully!');
  });

  test('Create Recipe 3: Romeu e Julieta Tradicional', async ({ page }) => {
    console.log('🍰 Creating Recipe 3: Romeu e Julieta Tradicional');
    
    await page.click('button:has-text("Adicionar")');
    await page.waitForTimeout(2000);

    // Fill basic recipe information
    await page.fill('input[name="name"]', 'Romeu e Julieta Tradicional');
    await page.selectOption('select[name="category"]', 'other');
    await page.fill('textarea[name="description"]', 'Sobremesa clássica com queijo e goiabada');
    await page.selectOption('select[name="difficulty"]', 'easy');
    await page.fill('input[name="quantity"]', '400');
    await page.fill('input[name="unit"]', 'g');
    await page.fill('input[name="portions"]', '8');

    // Add ingredients
    const ingredients = [
      { name: 'Queijo minas', quantity: '200', unit: 'g' },
      { name: 'Goiabada', quantity: '200', unit: 'g' }
    ];

    for (const ingredient of ingredients) {
      await page.click('button:has-text("Adicionar Item")');
      await page.waitForTimeout(500);
      
      const ingredientFields = await page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]');
      const quantityFields = await page.locator('input[placeholder*="quantidade"], input[name*="quantity"]');
      const unitFields = await page.locator('input[placeholder*="unidade"], input[name*="unit"]');
      
      await ingredientFields.last().fill(ingredient.name);
      await quantityFields.last().fill(ingredient.quantity);
      await unitFields.last().fill(ingredient.unit);
    }

    // Add preparation steps
    const steps = [
      { description: 'Corte o queijo em fatias', duration: '5' },
      { description: 'Corte a goiabada em fatias', duration: '5' },
      { description: 'Monte alternando queijo e goiabada', duration: '5' }
    ];

    for (const step of steps) {
      await page.click('button:has-text("Adicionar Passo")');
      await page.waitForTimeout(500);
      
      const descriptionFields = await page.locator('textarea[placeholder*="descrição"], textarea[name*="description"], input[name*="description"]');
      const durationFields = await page.locator('input[placeholder*="tempo"], input[name*="duration"], input[name*="time"]');
      
      await descriptionFields.last().fill(step.description);
      await durationFields.last().fill(step.duration);
    }

    await page.screenshot({ 
      path: 'screenshots/auto-03-form-completed.png', 
      fullPage: true 
    });

    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(3000);

    console.log('✅ Recipe 3: Romeu e Julieta Tradicional created successfully!');
  });

  test('Create Recipe 4: Bolo de Aipim Cremoso', async ({ page }) => {
    console.log('🍰 Creating Recipe 4: Bolo de Aipim Cremoso');
    
    await page.click('button:has-text("Adicionar")');
    await page.waitForTimeout(2000);

    // Fill basic recipe information
    await page.fill('input[name="name"]', 'Bolo de Aipim Cremoso');
    await page.selectOption('select[name="category"]', 'cakes');
    await page.fill('textarea[name="description"]', 'Bolo cremoso de mandioca típico do Nordeste');
    await page.selectOption('select[name="difficulty"]', 'medium');
    await page.fill('input[name="quantity"]', '1200');
    await page.fill('input[name="unit"]', 'g');
    await page.fill('input[name="portions"]', '12');

    // Add ingredients
    const ingredients = [
      { name: 'Aipim ralado', quantity: '500', unit: 'g' },
      { name: 'Leite de coco', quantity: '200', unit: 'ml' },
      { name: 'Açúcar', quantity: '300', unit: 'g' },
      { name: 'Ovos', quantity: '3', unit: 'unidades' },
      { name: 'Manteiga', quantity: '100', unit: 'g' },
      { name: 'Coco ralado', quantity: '100', unit: 'g' }
    ];

    for (const ingredient of ingredients) {
      await page.click('button:has-text("Adicionar Item")');
      await page.waitForTimeout(500);
      
      const ingredientFields = await page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]');
      const quantityFields = await page.locator('input[placeholder*="quantidade"], input[name*="quantity"]');
      const unitFields = await page.locator('input[placeholder*="unidade"], input[name*="unit"]');
      
      await ingredientFields.last().fill(ingredient.name);
      await quantityFields.last().fill(ingredient.quantity);
      await unitFields.last().fill(ingredient.unit);
    }

    // Add preparation steps
    const steps = [
      { description: 'Cozinhe e amasse o aipim', duration: '20' },
      { description: 'Misture todos os ingredientes', duration: '10' },
      { description: 'Despeje em forma untada', duration: '5' },
      { description: 'Asse a 180°C até dourar', duration: '45' }
    ];

    for (const step of steps) {
      await page.click('button:has-text("Adicionar Passo")');
      await page.waitForTimeout(500);
      
      const descriptionFields = await page.locator('textarea[placeholder*="descrição"], textarea[name*="description"], input[name*="description"]');
      const durationFields = await page.locator('input[placeholder*="tempo"], input[name*="duration"], input[name*="time"]');
      
      await descriptionFields.last().fill(step.description);
      await durationFields.last().fill(step.duration);
    }

    await page.screenshot({ 
      path: 'screenshots/auto-04-form-completed.png', 
      fullPage: true 
    });

    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(3000);

    console.log('✅ Recipe 4: Bolo de Aipim Cremoso created successfully!');
  });

  test('Create Recipe 5: Sequilhos de Maizena', async ({ page }) => {
    console.log('🍰 Creating Recipe 5: Sequilhos de Maizena');
    
    await page.click('button:has-text("Adicionar")');
    await page.waitForTimeout(2000);

    // Fill basic recipe information
    await page.fill('input[name="name"]', 'Sequilhos de Maizena');
    await page.selectOption('select[name="category"]', 'cookies');
    await page.fill('textarea[name="description"]', 'Biscoitinhos delicados que derretem na boca');
    await page.selectOption('select[name="difficulty"]', 'easy');
    await page.fill('input[name="quantity"]', '300');
    await page.fill('input[name="unit"]', 'g');
    await page.fill('input[name="portions"]', '30');

    // Add ingredients
    const ingredients = [
      { name: 'Amido de milho', quantity: '200', unit: 'g' },
      { name: 'Açúcar', quantity: '100', unit: 'g' },
      { name: 'Manteiga', quantity: '100', unit: 'g' },
      { name: 'Ovos', quantity: '1', unit: 'unidade' }
    ];

    for (const ingredient of ingredients) {
      await page.click('button:has-text("Adicionar Item")');
      await page.waitForTimeout(500);
      
      const ingredientFields = await page.locator('input[placeholder*="ingrediente"], input[name*="ingredient"]');
      const quantityFields = await page.locator('input[placeholder*="quantidade"], input[name*="quantity"]');
      const unitFields = await page.locator('input[placeholder*="unidade"], input[name*="unit"]');
      
      await ingredientFields.last().fill(ingredient.name);
      await quantityFields.last().fill(ingredient.quantity);
      await unitFields.last().fill(ingredient.unit);
    }

    // Add preparation steps
    const steps = [
      { description: 'Bata manteiga com açúcar', duration: '5' },
      { description: 'Adicione ovo e amido', duration: '5' },
      { description: 'Modele os biscoitos', duration: '15' },
      { description: 'Asse a 160°C até clarear', duration: '20' }
    ];

    for (const step of steps) {
      await page.click('button:has-text("Adicionar Passo")');
      await page.waitForTimeout(500);
      
      const descriptionFields = await page.locator('textarea[placeholder*="descrição"], textarea[name*="description"], input[name*="description"]');
      const durationFields = await page.locator('input[placeholder*="tempo"], input[name*="duration"], input[name*="time"]');
      
      await descriptionFields.last().fill(step.description);
      await durationFields.last().fill(step.duration);
    }

    await page.screenshot({ 
      path: 'screenshots/auto-05-form-completed.png', 
      fullPage: true 
    });

    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(3000);

    console.log('✅ Recipe 5: Sequilhos de Maizena created successfully!');
  });

  test('Verify All Brazilian Recipes Created', async ({ page }) => {
    console.log('🔍 Verifying all Brazilian recipes were created...');
    
    // Navigate to recipes page
    await page.goto('http://localhost:3001/recipes');
    await page.waitForTimeout(2000);
    
    // Take screenshot of final recipes list
    await page.screenshot({ 
      path: 'screenshots/auto-final-recipes-list.png', 
      fullPage: true 
    });

    // Check for each recipe in the list
    const recipeNames = [
      'Pão de Queijo Mineiro',
      'Coxinha de Frango Tradicional', 
      'Romeu e Julieta Tradicional',
      'Bolo de Aipim Cremoso',
      'Sequilhos de Maizena'
    ];

    for (const recipeName of recipeNames) {
      const recipeElement = page.locator(`text="${recipeName}"`);
      await expect(recipeElement).toBeVisible({ timeout: 5000 });
      console.log(`✅ Verified: ${recipeName} is in the list`);
    }

    console.log('🎉 All 5 Brazilian recipes created and verified successfully!');
  });
});