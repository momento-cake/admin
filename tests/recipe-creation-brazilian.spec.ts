import { test, expect, Page } from '@playwright/test';

// Brazilian recipes data
const brazilianRecipes = [
  {
    name: "Brigadeiro Tradicional",
    category: "cookies",
    description: "Doce tradicional brasileiro feito com leite condensado, manteiga e chocolate em pó, coberto com granulado.",
    difficulty: "easy",
    quantity: "500",
    unit: "g",
    portions: "30",
    notes: "Receita tradicional brasileira, perfeita para festas de aniversário."
  },
  {
    name: "Beijinho de Coco",
    category: "cookies", 
    description: "Doce brasileiro clássico feito com leite condensado, coco ralado e finalizado com cravinho.",
    difficulty: "easy",
    quantity: "500",
    unit: "g", 
    portions: "30",
    notes: "Tradicionalmente servido em festas juninas e aniversários."
  },
  {
    name: "Bolo de Cenoura com Cobertura de Chocolate",
    category: "cakes",
    description: "Bolo fofo e úmido de cenoura com irresistível cobertura de chocolate.",
    difficulty: "medium",
    quantity: "1200",
    unit: "g",
    portions: "12", 
    notes: "Um dos bolos mais populares do Brasil, perfeito para lanche da tarde."
  },
  {
    name: "Quindim",
    category: "other",
    description: "Sobremesa tradicional brasileira de origem baiana, feita com gemas, açúcar e coco.",
    difficulty: "hard",
    quantity: "600",
    unit: "g",
    portions: "12",
    notes: "Patrimônio cultural brasileiro, típico da Bahia."
  },
  {
    name: "Pudim de Leite Condensado", 
    category: "other",
    description: "Clássica sobremesa brasileira cremosa com calda de caramelo.",
    difficulty: "medium",
    quantity: "800",
    unit: "g",
    portions: "8",
    notes: "Sobremesa obrigatória em almoços de domingo brasileiro."
  },
  {
    name: "Pão de Açúcar",
    category: "breads",
    description: "Pão doce tradicional brasileiro, macio e levemente adocicado.",
    difficulty: "medium", 
    quantity: "800",
    unit: "g",
    portions: "16",
    notes: "Pão clássico das padarias brasileiras, perfeito para café da manhã."
  },
  {
    name: "Cocada Branca",
    category: "cookies",
    description: "Doce tradicional nordestino feito com coco ralado e açúcar cristal.",
    difficulty: "easy",
    quantity: "400",
    unit: "g", 
    portions: "20",
    notes: "Herança da culinária afro-brasileira, típica do Nordeste."
  },
  {
    name: "Bolo de Fubá Cremoso",
    category: "cakes",
    description: "Bolo tradicional mineiro feito com fubá, que fica cremoso por baixo e fofinho por cima.",
    difficulty: "medium",
    quantity: "1000", 
    unit: "g",
    portions: "10",
    notes: "Receita típica de Minas Gerais, tradicionalmente servida no café da tarde."
  },
  {
    name: "Paçoca de Amendoim",
    category: "cookies",
    description: "Doce brasileiro feito com amendoim torrado, açúcar e farinha de mandioca.",
    difficulty: "easy",
    quantity: "600",
    unit: "g",
    portions: "24",
    notes: "Doce típico das festas juninas, origem caipira."
  },
  {
    name: "Bem-Casado",
    category: "cookies",
    description: "Biscoito recheado com doce de leite, tradicionalmente servido em casamentos.",
    difficulty: "hard", 
    quantity: "800",
    unit: "g",
    portions: "40",
    notes: "Símbolo de boa sorte para os noivos, tradição centenária brasileira."
  },
  {
    name: "Bolo Gelado de Chocolate",
    category: "cakes",
    description: "Bolo de chocolate molhado com leite condensado e cobertura de chocolate granulado.",
    difficulty: "medium",
    quantity: "1200",
    unit: "g",
    portions: "12",
    notes: "Versão brasileira do bolo úmido, muito popular em aniversários."
  },
  {
    name: "Casadinho",
    category: "cookies", 
    description: "Biscoito amanteigado com metade coberta de chocolate ao leite e metade chocolate branco.",
    difficulty: "medium",
    quantity: "600",
    unit: "g", 
    portions: "30",
    notes: "Criação das confeitarias brasileiras, representa a união dos sabores."
  },
  {
    name: "Torta Holandesa",
    category: "cakes",
    description: "Torta gelada com base de biscoito, creme e cobertura de chocolate.",
    difficulty: "medium",
    quantity: "1000",
    unit: "g",
    portions: "8", 
    notes: "Sobremesa brasileira inspirada na culinária europeia, muito popular nos anos 80."
  },
  {
    name: "Sonho de Padaria",
    category: "breads",
    description: "Massa frita fofa recheada com creme e polvilhada com açúcar cristal.",
    difficulty: "hard",
    quantity: "600",
    unit: "g",
    portions: "12",
    notes: "Clássico das padarias brasileiras, tradicionalmente servido quente."
  },
  {
    name: "Bolo de Rolo",
    category: "cakes",
    description: "Bolo tradicional pernambucano em camadas finas com recheio de goiabada.",
    difficulty: "hard", 
    quantity: "800",
    unit: "g",
    portions: "16",
    notes: "Patrimônio cultural de Pernambuco, técnica centenária de preparo."
  },
  {
    name: "Cajuzinho",
    category: "cookies",
    description: "Doce brasileiro feito com amendoim e leite condensado, modelado em formato de caju.",
    difficulty: "easy",
    quantity: "500",
    unit: "g",
    portions: "25", 
    notes: "Doce típico das festas juninas, representa o fruto símbolo do Nordeste."
  },
  {
    name: "Pé de Moleque",
    category: "cookies",
    description: "Doce tradicional brasileiro feito com amendoim torrado e rapadura derretida.",
    difficulty: "medium",
    quantity: "600",
    unit: "g",
    portions: "20",
    notes: "Doce caipira tradicional, herança da culinária açucareira colonial."
  },
  {
    name: "Bolo Prestígio",
    category: "cakes",
    description: "Bolo de chocolate com recheio de coco e cobertura de chocolate.",
    difficulty: "medium", 
    quantity: "1200",
    unit: "g",
    portions: "12",
    notes: "Inspirado no chocolate Prestígio, versão brasileira criada por confeiteiros."
  },
  {
    name: "Quibebe de Abóbora",
    category: "other",
    description: "Doce cremoso feito com abóbora, leite condensado e especiarias.",
    difficulty: "easy",
    quantity: "800",
    unit: "g",
    portions: "8",
    notes: "Receita nordestina tradicional, aproveitamento da abóbora cabocla."
  },
  {
    name: "Bolo de Milho Cremoso",
    category: "cakes",
    description: "Bolo úmido feito com milho verde, leite condensado e queijo ralado.",
    difficulty: "medium",
    quantity: "1000",
    unit: "g", 
    portions: "10",
    notes: "Receita típica do interior brasileiro, combina doce e salgado harmoniosamente."
  }
];

// Working selectors based on previous testing
const SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  loginButton: 'button[type="submit"]',
  addRecipeButton: 'button:has-text("Adicionar")',
  nameInput: 'input[name="name"]',
  categorySelect: 'select[name="category"]',
  descriptionTextarea: 'textarea[name="description"]',
  difficultySelect: 'select[name="difficulty"]',
  quantityInput: 'input[name="quantity"]',
  unitSelect: 'select[name="unit"]',
  portionsInput: 'input[name="portions"]',
  notesTextarea: 'textarea[name="notes"]',
  saveButton: 'button[type="submit"]:has-text("Salvar")'
};

// Helper function to login
async function loginToAdmin(page: Page) {
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('load');
  
  await page.fill(SELECTORS.email, 'admin@momentocake.com.br');
  await page.fill(SELECTORS.password, 'G8j5k188');
  await page.click(SELECTORS.loginButton);
  
  // Wait for navigation to dashboard with longer timeout
  await page.waitForTimeout(3000);
  
  // Check if we're on dashboard page
  if (page.url().includes('/dashboard')) {
    console.log('✅ Login successful - on dashboard page');
  } else {
    console.log('⚠️ Login may have failed - current URL:', page.url());
    // Try to navigate manually
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('load');
  }
}

// Helper function to create a recipe
async function createRecipe(page: Page, recipe: any, index: number) {
  console.log(`Creating recipe ${index + 1}: ${recipe.name}`);
  
  // Navigate to recipes page
  await page.goto('http://localhost:3001/recipes');
  await page.waitForLoadState('load');
  
  // Take screenshot before clicking Add button
  await page.screenshot({ 
    path: `test-results/recipe-${index + 1}-before-add.png`,
    fullPage: true 
  });
  
  // Click Add Recipe button
  await page.click(SELECTORS.addRecipeButton);
  await page.waitForTimeout(1000); // Wait for form to load
  
  // Fill recipe form
  await page.fill(SELECTORS.nameInput, recipe.name);
  await page.selectOption(SELECTORS.categorySelect, recipe.category);
  await page.fill(SELECTORS.descriptionTextarea, recipe.description);
  await page.selectOption(SELECTORS.difficultySelect, recipe.difficulty);
  await page.fill(SELECTORS.quantityInput, recipe.quantity);
  await page.selectOption(SELECTORS.unitSelect, recipe.unit);
  await page.fill(SELECTORS.portionsInput, recipe.portions);
  await page.fill(SELECTORS.notesTextarea, recipe.notes);
  
  // Take screenshot of filled form
  await page.screenshot({ 
    path: `test-results/recipe-${index + 1}-form-filled.png`,
    fullPage: true 
  });
  
  // Save the recipe
  await page.click(SELECTORS.saveButton);
  await page.waitForTimeout(2000); // Wait for save operation
  
  // Verify we're back on the recipes list page
  await page.waitForURL('**/recipes**');
  
  // Verify the recipe appears in the list
  await expect(page.locator(`text=${recipe.name}`)).toBeVisible();
  
  // Take screenshot of success
  await page.screenshot({ 
    path: `test-results/recipe-${index + 1}-created-success.png`,
    fullPage: true 
  });
  
  console.log(`✅ Successfully created recipe ${index + 1}: ${recipe.name}`);
}

test.describe('Brazilian Recipe Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginToAdmin(page);
  });

  test('Create all 20 authentic Brazilian recipes systematically', async ({ page }) => {
    console.log('Starting systematic creation of 20 Brazilian recipes...');
    
    let successCount = 0;
    let failedRecipes = [];
    
    // Create each recipe one by one
    for (let i = 0; i < brazilianRecipes.length; i++) {
      try {
        await createRecipe(page, brazilianRecipes[i], i);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create recipe ${i + 1}: ${brazilianRecipes[i].name}`);
        console.error('Error:', error.message);
        failedRecipes.push({
          index: i + 1,
          name: brazilianRecipes[i].name,
          error: error.message
        });
        
        // Take screenshot of error
        await page.screenshot({ 
          path: `test-results/recipe-${i + 1}-error.png`,
          fullPage: true 
        });
      }
    }
    
    // Final verification - count total recipes
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    
    const recipeElements = page.locator('[data-testid*="recipe"]');
    const totalRecipes = await recipeElements.count();
    
    // Take final screenshot
    await page.screenshot({ 
      path: `test-results/final-recipes-list.png`,
      fullPage: true 
    });
    
    console.log(`\n📊 RECIPE CREATION SUMMARY:`);
    console.log(`✅ Successfully created: ${successCount} recipes`);
    console.log(`❌ Failed to create: ${failedRecipes.length} recipes`);
    console.log(`📋 Total recipes in system: ${totalRecipes}`);
    
    if (failedRecipes.length > 0) {
      console.log(`\n❌ FAILED RECIPES:`);
      failedRecipes.forEach(recipe => {
        console.log(`- Recipe ${recipe.index}: ${recipe.name} - ${recipe.error}`);
      });
    }
    
    // Assert that all recipes were created successfully
    expect(successCount).toBe(20);
    expect(failedRecipes.length).toBe(0);
  });
  
  test('Verify all Brazilian recipes are listed correctly', async ({ page }) => {
    // Navigate to recipes page
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    
    // Verify each Brazilian recipe is present
    for (const recipe of brazilianRecipes) {
      await expect(page.locator(`text=${recipe.name}`)).toBeVisible();
    }
    
    console.log('✅ All 20 Brazilian recipes verified as present in the system');
  });
});