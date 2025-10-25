import { test, expect } from '@playwright/test';

// Brazilian recipes data
const brazilianRecipes = [
  {
    name: "Pão de Queijo Mineiro",
    category: "breads",
    description: "Tradicional pão de queijo mineiro, crocante por fora e macio por dentro",
    difficulty: "medium",
    quantity: "500",
    unit: "g",
    portions: "25",
    ingredients: [
      { name: "Polvilho doce", quantity: "250", unit: "g" },
      { name: "Polvilho azedo", quantity: "250", unit: "g" },
      { name: "Queijo minas", quantity: "200", unit: "g" },
      { name: "Leite", quantity: "200", unit: "ml" },
      { name: "Óleo", quantity: "100", unit: "ml" },
      { name: "Ovos", quantity: "3", unit: "unidades" },
      { name: "Sal", quantity: "10", unit: "g" }
    ],
    steps: [
      { description: "Ferva o leite com o óleo e o sal", duration: "5" },
      { description: "Escalde o polvilho com a mistura quente", duration: "10" },
      { description: "Adicione os ovos e o queijo ralado", duration: "5" },
      { description: "Sove até obter massa homogênea", duration: "10" },
      { description: "Modele bolinhas e asse a 180°C", duration: "25" }
    ]
  },
  {
    name: "Coxinha de Frango Tradicional",
    category: "other",
    description: "Salgado tradicional brasileiro com massa cremosa e recheio de frango",
    difficulty: "hard",
    quantity: "1000",
    unit: "g",
    portions: "20",
    ingredients: [
      { name: "Farinha de trigo", quantity: "500", unit: "g" },
      { name: "Frango desfiado", quantity: "400", unit: "g" },
      { name: "Caldo de galinha", quantity: "500", unit: "ml" },
      { name: "Manteiga", quantity: "50", unit: "g" },
      { name: "Cebola", quantity: "100", unit: "g" },
      { name: "Alho", quantity: "20", unit: "g" },
      { name: "Farinha de rosca", quantity: "200", unit: "g" }
    ],
    steps: [
      { description: "Refogue frango com cebola e alho", duration: "15" },
      { description: "Prepare a massa com caldo e farinha", duration: "20" },
      { description: "Modele as coxinhas com recheio", duration: "30" },
      { description: "Empane e frite em óleo quente", duration: "15" }
    ]
  },
  {
    name: "Romeu e Julieta Tradicional",
    category: "other",
    description: "Sobremesa clássica com queijo e goiabada",
    difficulty: "easy",
    quantity: "400",
    unit: "g",
    portions: "8",
    ingredients: [
      { name: "Queijo minas", quantity: "200", unit: "g" },
      { name: "Goiabada", quantity: "200", unit: "g" }
    ],
    steps: [
      { description: "Corte o queijo em fatias", duration: "5" },
      { description: "Corte a goiabada em fatias", duration: "5" },
      { description: "Monte alternando queijo e goiabada", duration: "5" }
    ]
  },
  {
    name: "Bolo de Aipim Cremoso",
    category: "cakes",
    description: "Bolo cremoso de mandioca típico do Nordeste",
    difficulty: "medium",
    quantity: "1200",
    unit: "g",
    portions: "12",
    ingredients: [
      { name: "Aipim ralado", quantity: "500", unit: "g" },
      { name: "Leite de coco", quantity: "200", unit: "ml" },
      { name: "Açúcar", quantity: "300", unit: "g" },
      { name: "Ovos", quantity: "3", unit: "unidades" },
      { name: "Manteiga", quantity: "100", unit: "g" },
      { name: "Coco ralado", quantity: "100", unit: "g" }
    ],
    steps: [
      { description: "Cozinhe e amasse o aipim", duration: "20" },
      { description: "Misture todos os ingredientes", duration: "10" },
      { description: "Despeje em forma untada", duration: "5" },
      { description: "Asse a 180°C até dourar", duration: "45" }
    ]
  },
  {
    name: "Sequilhos de Maizena",
    category: "cookies",
    description: "Biscoitinhos delicados que derretem na boca",
    difficulty: "easy",
    quantity: "300",
    unit: "g",
    portions: "30",
    ingredients: [
      { name: "Amido de milho", quantity: "200", unit: "g" },
      { name: "Açúcar", quantity: "100", unit: "g" },
      { name: "Manteiga", quantity: "100", unit: "g" },
      { name: "Ovos", quantity: "1", unit: "unidade" }
    ],
    steps: [
      { description: "Bata manteiga com açúcar", duration: "5" },
      { description: "Adicione ovo e amido", duration: "5" },
      { description: "Modele os biscoitos", duration: "15" },
      { description: "Asse a 160°C até clarear", duration: "20" }
    ]
  }
];

test.describe('Create Brazilian Recipes', () => {
  // Extend timeout for recipe creation
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('load');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01-initial-page.png', fullPage: true });

    // Navigate to login if not already authenticated
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Already on login page');
    } else {
      await page.goto('http://localhost:3001/login');
      await page.waitForLoadState('load');
    }

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    
    // Take screenshot before login
    await page.screenshot({ path: 'screenshots/02-before-login.png', fullPage: true });
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('load');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Take screenshot after login
    await page.screenshot({ path: 'screenshots/03-after-login.png', fullPage: true });
  });

  for (const [index, recipe] of brazilianRecipes.entries()) {
    test(`Create Recipe ${index + 1}: ${recipe.name}`, async ({ page }) => {
      console.log(`\n🍰 Creating Recipe ${index + 1}: ${recipe.name}`);
      
      // Navigate to recipes page
      await page.goto('http://localhost:3001/recipes');
      await page.waitForLoadState('load');
      
      // Take screenshot of recipes page
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-01-recipes-page.png`, 
        fullPage: true 
      });

      // Look for add/create button (try different possible selectors)
      const addButtonSelectors = [
        'button:has-text("Adicionar")',
        'button:has-text("Criar")',
        'button:has-text("Nova")',
        'button:has-text("New")',
        '[data-testid="add-recipe"]',
        'a[href*="/recipes/new"]',
        'a[href*="/recipes/create"]',
        'button[type="button"]:has-text("Adicionar")'
      ];

      let addButton = null;
      for (const selector of addButtonSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          addButton = element;
          console.log(`Found add button with selector: ${selector}`);
          break;
        }
      }

      if (!addButton) {
        console.log('No add button found, checking page content...');
        const pageContent = await page.content();
        console.log('Page content preview:', pageContent.substring(0, 500));
        
        // Take screenshot for debugging
        await page.screenshot({ 
          path: `screenshots/recipe-${index + 1}-debug-no-button.png`, 
          fullPage: true 
        });
        
        throw new Error('Could not find add/create recipe button');
      }

      // Click the add button
      await addButton.click();
      await page.waitForLoadState('load');
      
      // Take screenshot of form
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-02-form-opened.png`, 
        fullPage: true 
      });

      // Fill basic recipe information
      console.log('Filling basic recipe information...');
      
      // Try different selectors for name field
      const nameSelectors = [
        'input[name="name"]',
        'input[placeholder*="nome"]',
        'input[placeholder*="Name"]',
        '#name'
      ];
      
      let nameField = null;
      for (const selector of nameSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          nameField = element;
          break;
        }
      }
      
      if (!nameField) {
        throw new Error('Could not find recipe name field');
      }
      
      await nameField.fill(recipe.name);

      // Fill category
      const categorySelectors = [
        'select[name="category"]',
        '[data-testid="category-select"]',
        'select:has(option[value="breads"])'
      ];
      
      for (const selector of categorySelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.selectOption(recipe.category);
          break;
        }
      }

      // Fill description
      const descriptionSelectors = [
        'textarea[name="description"]',
        'input[name="description"]',
        'textarea[placeholder*="descrição"]'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.fill(recipe.description);
          break;
        }
      }

      // Fill difficulty
      const difficultySelectors = [
        'select[name="difficulty"]',
        '[data-testid="difficulty-select"]'
      ];
      
      for (const selector of difficultySelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.selectOption(recipe.difficulty);
          break;
        }
      }

      // Fill quantity, unit, and portions
      const quantityField = page.locator('input[name="quantity"]').first();
      if (await quantityField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quantityField.fill(recipe.quantity);
      }

      const unitField = page.locator('input[name="unit"]').first();
      if (await unitField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await unitField.fill(recipe.unit);
      }

      const portionsField = page.locator('input[name="portions"]').first();
      if (await portionsField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await portionsField.fill(recipe.portions);
      }

      // Take screenshot after filling basic info
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-03-basic-info-filled.png`, 
        fullPage: true 
      });

      // Add ingredients
      console.log('Adding ingredients...');
      for (const [ingredientIndex, ingredient] of recipe.ingredients.entries()) {
        console.log(`  Adding ingredient ${ingredientIndex + 1}: ${ingredient.name}`);
        
        // Look for add ingredient button
        const addIngredientSelectors = [
          'button:has-text("Adicionar Item")',
          'button:has-text("Adicionar Ingrediente")',
          '[data-testid="add-ingredient"]',
          'button:has-text("+")'
        ];
        
        let addIngredientButton = null;
        for (const selector of addIngredientSelectors) {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            addIngredientButton = element;
            break;
          }
        }
        
        if (addIngredientButton) {
          await addIngredientButton.click();
          await page.waitForTimeout(500); // Wait for form to appear
        }

        // Fill ingredient fields (look for the most recent/last fields)
        const ingredientNameField = page.locator('input[name*="ingredient"]').last();
        if (await ingredientNameField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ingredientNameField.fill(ingredient.name);
        }

        const ingredientQuantityField = page.locator('input[name*="quantity"]').last();
        if (await ingredientQuantityField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ingredientQuantityField.fill(ingredient.quantity);
        }

        const ingredientUnitField = page.locator('input[name*="unit"]').last();
        if (await ingredientUnitField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ingredientUnitField.fill(ingredient.unit);
        }
      }

      // Take screenshot after adding ingredients
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-04-ingredients-added.png`, 
        fullPage: true 
      });

      // Add preparation steps
      console.log('Adding preparation steps...');
      for (const [stepIndex, step] of recipe.steps.entries()) {
        console.log(`  Adding step ${stepIndex + 1}: ${step.description}`);
        
        // Look for add step button
        const addStepSelectors = [
          'button:has-text("Adicionar Passo")',
          'button:has-text("Adicionar Etapa")',
          '[data-testid="add-step"]',
          'button:has-text("+")'
        ];
        
        let addStepButton = null;
        for (const selector of addStepSelectors) {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            addStepButton = element;
            break;
          }
        }
        
        if (addStepButton) {
          await addStepButton.click();
          await page.waitForTimeout(500); // Wait for form to appear
        }

        // Fill step fields (look for the most recent/last fields)
        const stepDescriptionField = page.locator('textarea[name*="description"], input[name*="description"]').last();
        if (await stepDescriptionField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await stepDescriptionField.fill(step.description);
        }

        const stepDurationField = page.locator('input[name*="duration"], input[name*="time"]').last();
        if (await stepDurationField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await stepDurationField.fill(step.duration);
        }
      }

      // Take screenshot of completed form
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-05-form-completed.png`, 
        fullPage: true 
      });

      // Save the recipe
      console.log('Saving recipe...');
      const saveSelectors = [
        'button:has-text("Salvar")',
        'button:has-text("Save")',
        'button:has-text("Criar")',
        'button[type="submit"]',
        '[data-testid="save-recipe"]'
      ];
      
      let saveButton = null;
      for (const selector of saveSelectors) {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          saveButton = element;
          break;
        }
      }
      
      if (!saveButton) {
        throw new Error('Could not find save button');
      }

      await saveButton.click();
      await page.waitForLoadState('load');
      
      // Wait a moment for the save to complete
      await page.waitForTimeout(2000);

      // Take screenshot after saving
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-06-saved.png`, 
        fullPage: true 
      });

      // Verify recipe was created (should be back on recipes list)
      await page.goto('http://localhost:3001/recipes');
      await page.waitForLoadState('load');
      
      // Look for the recipe name in the list
      const recipeInList = page.locator(`text="${recipe.name}"`);
      await expect(recipeInList).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Recipe "${recipe.name}" created successfully!`);
      
      // Take screenshot of updated recipes list
      await page.screenshot({ 
        path: `screenshots/recipe-${index + 1}-07-in-list.png`, 
        fullPage: true 
      });
    });
  }

  test('Verify All Recipes Created', async ({ page }) => {
    console.log('\n🔍 Verifying all recipes were created...');
    
    // Navigate to recipes page
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/final-recipes-list.png', 
      fullPage: true 
    });

    // Verify all recipes are present
    for (const recipe of brazilianRecipes) {
      const recipeInList = page.locator(`text="${recipe.name}"`);
      await expect(recipeInList).toBeVisible({ timeout: 5000 });
      console.log(`✅ Verified: ${recipe.name} is in the list`);
    }

    // Try to view details of a couple recipes
    const viewButtonSelectors = [
      'button:has-text("Ver")',
      'button:has-text("View")',
      '[data-testid="view-recipe"]',
      'a[href*="/recipes/"]'
    ];

    // Try to view the first recipe details
    for (const selector of viewButtonSelectors) {
      const viewButton = page.locator(selector).first();
      if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await viewButton.click();
        await page.waitForLoadState('load');
        
        // Take screenshot of recipe details
        await page.screenshot({ 
          path: 'screenshots/recipe-details-view.png', 
          fullPage: true 
        });
        
        console.log('✅ Successfully viewed recipe details');
        break;
      }
    }

    console.log('🎉 All Brazilian recipes created and verified successfully!');
  });
});