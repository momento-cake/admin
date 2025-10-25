import { test, expect } from '@playwright/test';

// Test configuration
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const BASE_URL = 'http://localhost:3001';

// Ingredient data to update
const INGREDIENTS_TO_UPDATE = [
  {
    name: 'Farinha de Trigo',
    currentPrice: '5.50',
    category: 'Farinha',
    brand: 'Dona Benta',
    description: 'Farinha de trigo especial para panificação',
    minStock: '10',
    currentStock: '50'
  },
  {
    name: 'Fermento Biológico Seco',
    currentPrice: '18.00',
    category: 'Fermentos',
    brand: 'Fleischmann',
    description: 'Fermento biológico seco ativo para pães e massas',
    minStock: '5',
    currentStock: '20'
  },
  {
    name: 'Fermento Químico',
    currentPrice: '12.00',
    category: 'Fermentos',
    brand: 'Royal',
    description: 'Fermento químico em pó para bolos e doces',
    minStock: '3',
    currentStock: '10'
  }
];

test.describe('Update Ingredient Prices', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('load');
  });

  test('should login and update ingredient prices systematically', async ({ page }) => {
    console.log('🔐 Starting login process...');
    
    // Login using the verified selectors from configuration
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for successful login and dashboard redirect
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('✅ Successfully logged in');
    
    // Navigate to ingredients inventory
    console.log('📦 Navigating to ingredients inventory...');
    await page.goto(`${BASE_URL}/ingredients/inventory`);
    await page.waitForLoadState('load');
    
    // Take initial screenshot of the inventory page
    await page.screenshot({ 
      path: 'screenshots/ingredients-inventory-initial.png',
      fullPage: true 
    });
    console.log('📸 Initial inventory screenshot taken');
    
    // Process each ingredient systematically
    for (const ingredient of INGREDIENTS_TO_UPDATE) {
      console.log(`\n🔄 Processing ingredient: ${ingredient.name}`);
      
      // Look for the ingredient in the list using multiple strategies
      let ingredientRow = null;
      
      // Strategy 1: Look for exact text match
      ingredientRow = page.locator(`tr:has-text("${ingredient.name}")`).first();
      
      // Check if ingredient exists
      const isVisible = await ingredientRow.isVisible().catch(() => false);
      
      if (!isVisible) {
        console.log(`⚠️  Ingredient "${ingredient.name}" not found in current view. Checking for variations...`);
        
        // Strategy 2: Look for partial matches or variations
        const possibleVariations = [
          ingredient.name.toLowerCase(),
          ingredient.name.toUpperCase(),
          ingredient.name.replace(/\s+/g, ' ').trim()
        ];
        
        for (const variation of possibleVariations) {
          ingredientRow = page.locator(`tr`).filter({ hasText: variation }).first();
          const variationVisible = await ingredientRow.isVisible().catch(() => false);
          if (variationVisible) {
            console.log(`✅ Found ingredient with variation: "${variation}"`);
            break;
          }
        }
      }
      
      const finalCheck = await ingredientRow.isVisible().catch(() => false);
      
      if (!finalCheck) {
        console.log(`❌ Could not find ingredient "${ingredient.name}" in the inventory list`);
        continue;
      }
      
      console.log(`✅ Found ingredient: ${ingredient.name}`);
      
      // Find and click the edit button for this ingredient
      // Look for edit button within the same row
      const editButton = ingredientRow.locator('button[aria-label*="edit"], button[title*="edit"], button:has([data-testid="edit"]), button:has(.lucide-pencil), button:has(.lucide-edit)').first();
      
      const editButtonVisible = await editButton.isVisible().catch(() => false);
      
      if (!editButtonVisible) {
        console.log(`⚠️  Edit button not found for ${ingredient.name}. Looking for alternative selectors...`);
        
        // Alternative strategy: look for any clickable element with edit-like attributes
        const alternativeEdit = ingredientRow.locator('button, a').filter({ hasText: /edit|editar/i }).first();
        const altVisible = await alternativeEdit.isVisible().catch(() => false);
        
        if (altVisible) {
          await alternativeEdit.click();
          console.log(`✅ Clicked alternative edit button for ${ingredient.name}`);
        } else {
          console.log(`❌ No edit button found for ${ingredient.name}`);
          continue;
        }
      } else {
        await editButton.click();
        console.log(`✅ Clicked edit button for ${ingredient.name}`);
      }
      
      // Wait for edit modal/form to appear
      await page.waitForTimeout(1000);
      
      // Take screenshot of edit form
      await page.screenshot({ 
        path: `screenshots/edit-form-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      // Fill out the form fields systematically
      console.log(`📝 Filling form for ${ingredient.name}...`);
      
      // Common field selectors to try
      const fieldSelectors = {
        currentPrice: [
          'input[name="currentPrice"]',
          'input[label*="Preço"]',
          'input[placeholder*="preço"]',
          'input[placeholder*="price"]',
          'input[data-testid="current-price"]',
          'input[id*="price"]'
        ],
        category: [
          'select[name="category"]',
          'select[label*="Categoria"]',
          '[data-testid="category-select"]',
          'select[id*="category"]'
        ],
        brand: [
          'input[name="brand"]',
          'input[label*="Marca"]',
          'input[placeholder*="marca"]',
          'input[data-testid="brand"]',
          'input[id*="brand"]'
        ],
        description: [
          'textarea[name="description"]',
          'textarea[label*="Descrição"]',
          'textarea[placeholder*="descrição"]',
          'input[name="description"]',
          'textarea[data-testid="description"]',
          'textarea[id*="description"]'
        ],
        minStock: [
          'input[name="minStock"]',
          'input[label*="Estoque Mínimo"]',
          'input[placeholder*="mínimo"]',
          'input[data-testid="min-stock"]',
          'input[id*="min"]'
        ],
        currentStock: [
          'input[name="currentStock"]',
          'input[label*="Estoque Atual"]',
          'input[placeholder*="atual"]',
          'input[data-testid="current-stock"]',
          'input[id*="stock"]'
        ]
      };
      
      // Function to fill a field using multiple selector strategies
      const fillField = async (fieldType: keyof typeof fieldSelectors, value: string) => {
        const selectors = fieldSelectors[fieldType];
        
        for (const selector of selectors) {
          try {
            const field = page.locator(selector).first();
            const isVisible = await field.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (isVisible) {
              await field.clear();
              await field.fill(value);
              console.log(`  ✅ Filled ${fieldType}: ${value} using selector: ${selector}`);
              return true;
            }
          } catch (error) {
            // Continue to next selector
          }
        }
        
        console.log(`  ⚠️  Could not find field: ${fieldType}`);
        return false;
      };
      
      // Fill all fields
      await fillField('currentPrice', ingredient.currentPrice);
      await fillField('brand', ingredient.brand);
      await fillField('description', ingredient.description);
      await fillField('minStock', ingredient.minStock);
      await fillField('currentStock', ingredient.currentStock);
      
      // Handle category selection (dropdown)
      const categorySelectors = fieldSelectors.category;
      let categoryFilled = false;
      
      for (const selector of categorySelectors) {
        try {
          const categoryField = page.locator(selector).first();
          const isVisible = await categoryField.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (isVisible) {
            await categoryField.selectOption({ label: ingredient.category });
            console.log(`  ✅ Selected category: ${ingredient.category} using selector: ${selector}`);
            categoryFilled = true;
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }
      
      if (!categoryFilled) {
        console.log(`  ⚠️  Could not find or set category field`);
      }
      
      // Take screenshot of filled form
      await page.screenshot({ 
        path: `screenshots/filled-form-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      // Save the changes
      console.log(`💾 Saving changes for ${ingredient.name}...`);
      
      const saveSelectors = [
        'button[type="submit"]',
        'button:has-text("Salvar")',
        'button:has-text("Save")',
        'button:has-text("Atualizar")',
        'button[data-testid="save-button"]',
        'button[aria-label*="save"]'
      ];
      
      let saved = false;
      for (const selector of saveSelectors) {
        try {
          const saveButton = page.locator(selector).first();
          const isVisible = await saveButton.isVisible({ timeout: 1000 }).catch(() => false);
          
          if (isVisible) {
            await saveButton.click();
            console.log(`  ✅ Clicked save button using selector: ${selector}`);
            saved = true;
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }
      
      if (!saved) {
        console.log(`  ⚠️  Could not find save button, trying keyboard shortcut...`);
        await page.keyboard.press('Enter');
      }
      
      // Wait for save to complete
      await page.waitForTimeout(2000);
      
      // Take screenshot after save
      await page.screenshot({ 
        path: `screenshots/after-save-${ingredient.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      
      console.log(`✅ Completed processing ${ingredient.name}`);
    }
    
    // Final screenshot of the updated inventory
    await page.screenshot({ 
      path: 'screenshots/ingredients-inventory-final.png',
      fullPage: true 
    });
    
    console.log('🎉 All ingredient updates completed!');
    
    // Verify the updates by checking if the prices are visible in the list
    console.log('\n🔍 Verifying updated prices...');
    
    for (const ingredient of INGREDIENTS_TO_UPDATE) {
      const priceLocator = page.locator(`text=${ingredient.currentPrice}`);
      const priceVisible = await priceLocator.isVisible().catch(() => false);
      
      if (priceVisible) {
        console.log(`✅ Price R$ ${ingredient.currentPrice} visible for ${ingredient.name}`);
      } else {
        console.log(`⚠️  Price R$ ${ingredient.currentPrice} not immediately visible for ${ingredient.name}`);
      }
    }
  });
});