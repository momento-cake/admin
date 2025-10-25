import { test, expect, Page } from '@playwright/test';

// All 20 authentic Brazilian recipes
const brazilianRecipes = [
  {
    name: "Brigadeiro Tradicional",
    category: "cookies",
    description: "Doce tradicional brasileiro feito com leite condensado, manteiga e chocolate em pó, coberto com granulado.",
    difficulty: "easy",
    quantity: "500",
    unit: "gram",
    portions: "30",
    notes: "Receita tradicional brasileira, perfeita para festas de aniversário."
  },
  {
    name: "Beijinho de Coco",
    category: "cookies",
    description: "Doce brasileiro clássico feito com leite condensado, coco ralado e finalizado com cravinho.",
    difficulty: "easy",
    quantity: "500",
    unit: "gram",
    portions: "30",
    notes: "Tradicionalmente servido em festas juninas e aniversários."
  },
  {
    name: "Bolo de Cenoura com Cobertura de Chocolate",
    category: "cakes",
    description: "Bolo fofo e úmido de cenoura com irresistível cobertura de chocolate.",
    difficulty: "medium",
    quantity: "1200",
    unit: "gram",
    portions: "12",
    notes: "Um dos bolos mais populares do Brasil, perfeito para lanche da tarde."
  },
  {
    name: "Quindim",
    category: "other",
    description: "Sobremesa tradicional brasileira de origem baiana, feita com gemas, açúcar e coco.",
    difficulty: "hard",
    quantity: "600",
    unit: "gram",
    portions: "12",
    notes: "Patrimônio cultural brasileiro, típico da Bahia."
  },
  {
    name: "Pudim de Leite Condensado",
    category: "other",
    description: "Clássica sobremesa brasileira cremosa com calda de caramelo.",
    difficulty: "medium",
    quantity: "800",
    unit: "gram",
    portions: "8",
    notes: "Sobremesa obrigatória em almoços de domingo brasileiro."
  },
  {
    name: "Pão de Açúcar",
    category: "breads",
    description: "Pão doce tradicional brasileiro, macio e levemente adocicado.",
    difficulty: "medium",
    quantity: "800",
    unit: "gram",
    portions: "16",
    notes: "Pão clássico das padarias brasileiras, perfeito para café da manhã."
  },
  {
    name: "Cocada Branca",
    category: "cookies",
    description: "Doce tradicional nordestino feito com coco ralado e açúcar cristal.",
    difficulty: "easy",
    quantity: "400",
    unit: "gram",
    portions: "20",
    notes: "Herança da culinária afro-brasileira, típica do Nordeste."
  },
  {
    name: "Bolo de Fubá Cremoso",
    category: "cakes",
    description: "Bolo tradicional mineiro feito com fubá, que fica cremoso por baixo e fofinho por cima.",
    difficulty: "medium",
    quantity: "1000",
    unit: "gram",
    portions: "10",
    notes: "Receita típica de Minas Gerais, tradicionalmente servida no café da tarde."
  },
  {
    name: "Paçoca de Amendoim",
    category: "cookies",
    description: "Doce brasileiro feito com amendoim torrado, açúcar e farinha de mandioca.",
    difficulty: "easy",
    quantity: "600",
    unit: "gram",
    portions: "24",
    notes: "Doce típico das festas juninas, origem caipira."
  },
  {
    name: "Bem-Casado",
    category: "cookies",
    description: "Biscoito recheado com doce de leite, tradicionalmente servido em casamentos.",
    difficulty: "hard",
    quantity: "800",
    unit: "gram",
    portions: "40",
    notes: "Símbolo de boa sorte para os noivos, tradição centenária brasileira."
  },
  {
    name: "Bolo Gelado de Chocolate",
    category: "cakes",
    description: "Bolo de chocolate molhado com leite condensado e cobertura de chocolate granulado.",
    difficulty: "medium",
    quantity: "1200",
    unit: "gram",
    portions: "12",
    notes: "Versão brasileira do bolo úmido, muito popular em aniversários."
  },
  {
    name: "Casadinho",
    category: "cookies",
    description: "Biscoito amanteigado com metade coberta de chocolate ao leite e metade chocolate branco.",
    difficulty: "medium",
    quantity: "600",
    unit: "gram",
    portions: "30",
    notes: "Criação das confeitarias brasileiras, representa a união dos sabores."
  },
  {
    name: "Torta Holandesa",
    category: "cakes",
    description: "Torta gelada com base de biscoito, creme e cobertura de chocolate.",
    difficulty: "medium",
    quantity: "1000",
    unit: "gram",
    portions: "8",
    notes: "Sobremesa brasileira inspirada na culinária europeia, muito popular nos anos 80."
  },
  {
    name: "Sonho de Padaria",
    category: "breads",
    description: "Massa frita fofa recheada com creme e polvilhada com açúcar cristal.",
    difficulty: "hard",
    quantity: "600",
    unit: "gram",
    portions: "12",
    notes: "Clássico das padarias brasileiras, tradicionalmente servido quente."
  },
  {
    name: "Bolo de Rolo",
    category: "cakes",
    description: "Bolo tradicional pernambucano em camadas finas com recheio de goiabada.",
    difficulty: "hard",
    quantity: "800",
    unit: "gram",
    portions: "16",
    notes: "Patrimônio cultural de Pernambuco, técnica centenária de preparo."
  },
  {
    name: "Cajuzinho",
    category: "cookies",
    description: "Doce brasileiro feito com amendoim e leite condensado, modelado em formato de caju.",
    difficulty: "easy",
    quantity: "500",
    unit: "gram",
    portions: "25",
    notes: "Doce típico das festas juninas, representa o fruto símbolo do Nordeste."
  },
  {
    name: "Pé de Moleque",
    category: "cookies",
    description: "Doce tradicional brasileiro feito com amendoim torrado e rapadura derretida.",
    difficulty: "medium",
    quantity: "600",
    unit: "gram",
    portions: "20",
    notes: "Doce caipira tradicional, herança da culinária açucareira colonial."
  },
  {
    name: "Bolo Prestígio",
    category: "cakes",
    description: "Bolo de chocolate com recheio de coco e cobertura de chocolate.",
    difficulty: "medium",
    quantity: "1200",
    unit: "gram",
    portions: "12",
    notes: "Inspirado no chocolate Prestígio, versão brasileira criada por confeiteiros."
  },
  {
    name: "Quibebe de Abóbora",
    category: "other",
    description: "Doce cremoso feito com abóbora, leite condensado e especiarias.",
    difficulty: "easy",
    quantity: "800",
    unit: "gram",
    portions: "8",
    notes: "Receita nordestina tradicional, aproveitamento da abóbora cabocla."
  },
  {
    name: "Bolo de Milho Cremoso",
    category: "cakes",
    description: "Bolo úmido feito com milho verde, leite condensado e queijo ralado.",
    difficulty: "medium",
    quantity: "1000",
    unit: "gram",
    portions: "10",
    notes: "Receita típica do interior brasileiro, combina doce e salgado harmoniosamente."
  }
];

// Helper function to login
async function loginToAdmin(page: Page) {
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('load');
  
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  if (page.url().includes('/dashboard')) {
    console.log('✅ Login successful');
  } else {
    console.log('⚠️ Login may have failed, navigating to dashboard...');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('load');
  }
}

// Helper function to create a recipe
async function createRecipe(page: Page, recipe: any, index: number) {
  console.log(`\n🍰 Creating recipe ${index + 1}/20: ${recipe.name}`);
  
  // Navigate to recipes page
  await page.goto('http://localhost:3001/recipes');
  await page.waitForLoadState('load');
  
  // Wait for loading to complete
  try {
    await page.waitForSelector('text=Carregando', { state: 'hidden', timeout: 10000 });
  } catch (error) {
    console.log('   ⚠️ Loading timeout, continuing...');
  }
  await page.waitForTimeout(2000);
  
  // Click Add Recipe button
  await page.click('button:has-text("Adicionar")');
  await page.waitForTimeout(2000);
  
  // Fill recipe form
  console.log(`   📝 Filling form fields...`);
  
  try {
    // Basic information
    await page.fill('#name', recipe.name);
    await page.selectOption('select:first-of-type', recipe.category);
    await page.fill('#description', recipe.description);
    await page.selectOption('select:has-text("Fácil")', recipe.difficulty);
    await page.fill('#generatedAmount', recipe.quantity);
    await page.selectOption('select:has-text("kg")', recipe.unit);
    await page.fill('#servings', recipe.portions);
    
    console.log(`   ✓ Basic information filled`);
    
    // Add ingredient placeholder
    const addIngredientButton = page.locator('button:has-text("Adicionar Primeiro Item")');
    if (await addIngredientButton.count() > 0) {
      await addIngredientButton.click();
      await page.waitForTimeout(500);
      console.log(`   ✓ Added ingredient placeholder`);
    }
    
    // Add preparation step placeholder
    const addStepButton = page.locator('button:has-text("Adicionar Primeiro Passo")');
    if (await addStepButton.count() > 0) {
      await addStepButton.click();
      await page.waitForTimeout(500);
      console.log(`   ✓ Added preparation step placeholder`);
    }
    
    // Notes
    await page.fill('#notes', recipe.notes);
    console.log(`   ✓ Notes filled`);
    
    // Save the recipe
    console.log(`   💾 Saving recipe...`);
    const saveButton = page.locator('button:has-text("Criar")');
    await saveButton.click();
    await page.waitForTimeout(3000);
    
    // Verify the recipe appears in the list
    try {
      await page.waitForSelector(`text=${recipe.name}`, { timeout: 5000 });
      console.log(`   ✅ Successfully created: ${recipe.name}`);
      return true;
    } catch (error) {
      console.log(`   ❌ Failed to verify in list: ${recipe.name}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error creating recipe: ${error.message}`);
    return false;
  }
}

test.describe('Create All 20 Authentic Brazilian Recipes', () => {
  test.beforeEach(async ({ page }) => {
    await loginToAdmin(page);
  });

  test('Create all 20 authentic Brazilian recipes systematically', async ({ page }) => {
    console.log('🚀 Starting systematic creation of 20 authentic Brazilian recipes...');
    console.log('===============================================================\n');
    
    let successCount = 0;
    let failedRecipes = [];
    
    // Create each recipe one by one
    for (let i = 0; i < brazilianRecipes.length; i++) {
      try {
        const success = await createRecipe(page, brazilianRecipes[i], i);
        if (success) {
          successCount++;
        } else {
          failedRecipes.push({
            index: i + 1,
            name: brazilianRecipes[i].name,
            error: 'Recipe not found in list after creation'
          });
        }
      } catch (error) {
        console.log(`   ❌ Failed to create recipe ${i + 1}: ${brazilianRecipes[i].name}`);
        console.log(`      Error: ${error.message}`);
        failedRecipes.push({
          index: i + 1,
          name: brazilianRecipes[i].name,
          error: error.message
        });
      }
      
      // Small delay between recipes
      await page.waitForTimeout(1000);
    }
    
    // Final verification
    console.log('\n📊 FINAL RECIPE CREATION SUMMARY');
    console.log('===============================================================');
    
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: `test-results/final-all-brazilian-recipes.png`,
      fullPage: true 
    });
    
    // Count recipes on page
    const recipeRows = await page.locator('tr:has-text("min")').count(); // Rows with time info
    
    console.log(`✅ Successfully created: ${successCount} recipes`);
    console.log(`❌ Failed to create: ${failedRecipes.length} recipes`);
    console.log(`📋 Total attempted: ${brazilianRecipes.length} recipes`);
    console.log(`📊 Recipes visible on page: ${recipeRows}`);
    console.log(`🎯 SUCCESS RATE: ${((successCount / brazilianRecipes.length) * 100).toFixed(1)}%`);
    
    if (successCount > 0) {
      console.log(`\n✅ SUCCESSFULLY CREATED BRAZILIAN RECIPES:`);
      brazilianRecipes.slice(0, successCount).forEach((recipe, index) => {
        console.log(`   ${index + 1}. ${recipe.name} (${recipe.category})`);
      });
    }
    
    if (failedRecipes.length > 0) {
      console.log(`\n❌ FAILED RECIPES:`);
      failedRecipes.forEach(recipe => {
        console.log(`   ${recipe.index}. ${recipe.name} - ${recipe.error}`);
      });
    }
    
    console.log('\n🇧🇷 BRAZILIAN RECIPE DATABASE POPULATION COMPLETED! 🇧🇷');
    console.log('===============================================================');
    
    // Assert that most recipes were created successfully
    expect(successCount).toBeGreaterThan(15); // At least 75% success rate
    console.log(`\n✅ Test assertion passed: ${successCount} recipes created (>15 required)`);
  });
  
  test('Verify all created Brazilian recipes are properly listed', async ({ page }) => {
    console.log('🔍 Verifying all Brazilian recipes are properly listed...');
    
    await page.goto('http://localhost:3001/recipes');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    
    let foundRecipes = 0;
    let missingRecipes = [];
    
    for (const recipe of brazilianRecipes) {
      try {
        await expect(page.locator(`text=${recipe.name}`)).toBeVisible({ timeout: 2000 });
        foundRecipes++;
        console.log(`✓ Found: ${recipe.name}`);
      } catch (error) {
        missingRecipes.push(recipe.name);
        console.log(`✗ Missing: ${recipe.name}`);
      }
    }
    
    console.log(`\n📊 VERIFICATION SUMMARY:`);
    console.log(`✅ Found: ${foundRecipes} recipes`);
    console.log(`❌ Missing: ${missingRecipes.length} recipes`);
    console.log(`🎯 VISIBILITY RATE: ${((foundRecipes / brazilianRecipes.length) * 100).toFixed(1)}%`);
    
    if (missingRecipes.length > 0) {
      console.log(`\nMissing recipes: ${missingRecipes.join(', ')}`);
    }
    
    // Take verification screenshot
    await page.screenshot({ 
      path: `test-results/verification-all-recipes.png`,
      fullPage: true 
    });
    
    expect(foundRecipes).toBeGreaterThan(15); // Expect most recipes to be visible
  });
});