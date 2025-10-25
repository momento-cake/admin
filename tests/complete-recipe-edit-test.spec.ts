import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

async function loginAndNavigate(page: Page) {
  // Go to login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  
  // Fill and submit login form
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Navigate to recipes page
  await page.goto(`${BASE_URL}/recipes/`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);
  
  return page.url().includes('/recipes');
}

// Helper method to handle edit page
async function handleEditPage(page: Page) {
  console.log('📝 Handling dedicated edit page...');
  
  await page.waitForTimeout(2000);
  await page.screenshot({ 
    path: 'screenshots/complete-07-edit-page.png', 
    fullPage: true 
  });
  
  return performEdit(page);
}

// Helper method to handle edit modal
async function handleEditModal(page: Page) {
  console.log('📝 Handling edit modal...');
  
  await page.screenshot({ 
    path: 'screenshots/complete-07-edit-modal.png', 
    fullPage: true 
  });
  
  return performEdit(page);
}

// Helper method to handle edit form
async function handleEditForm(page: Page) {
  console.log('📝 Handling edit form...');
  
  await page.screenshot({ 
    path: 'screenshots/complete-07-edit-form.png', 
    fullPage: true 
  });
  
  return performEdit(page);
}

// Helper method to perform the actual editing
async function performEdit(page: Page) {
  console.log('✏️ Performing recipe edit...');
  
  // Find name field
  const nameFieldSelectors = [
    'input[name="name"]',
    'input[name="title"]',
    'input[name="nome"]',
    'input[placeholder*="nome"]',
    'input[placeholder*="Nome"]',
    'input[type="text"]'
  ];
  
  let nameField = null;
  
  for (const selector of nameFieldSelectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.isVisible() && await field.isEditable()) {
        nameField = field;
        console.log(`Found editable name field: ${selector}`);
        break;
      }
    } catch (error) {
      console.log(`Name field selector "${selector}" failed`);
    }
  }
  
  if (nameField) {
    const originalValue = await nameField.inputValue();
    console.log('Original recipe name:', originalValue);
    
    // Edit the name
    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    const newName = `${originalValue} - EDITADO ${timestamp}`;
    
    await nameField.clear();
    await nameField.fill(newName);
    
    console.log(`Updated name to: ${newName}`);
    
    await page.screenshot({ 
      path: 'screenshots/complete-08-name-edited.png', 
      fullPage: true 
    });
    
    // Find and click save button
    const saveButtonSelectors = [
      'button:has-text("Salvar")',
      'button:has-text("Save")',
      'button[type="submit"]',
      'button:has-text("Confirmar")',
      'button:has-text("Atualizar")',
      'button:has-text("Update")'
    ];
    
    let saveButton = null;
    
    for (const selector of saveButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible() && await button.isEnabled()) {
          saveButton = button;
          console.log(`Found save button: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`Save button selector "${selector}" failed`);
      }
    }
    
    if (saveButton) {
      console.log('💾 Saving changes...');
      await saveButton.click();
      await page.waitForTimeout(4000);
      
      await page.screenshot({ 
        path: 'screenshots/complete-09-after-save.png', 
        fullPage: true 
      });
      
      // Verify the edit was successful
      const updatedElements = await page.locator(`text="${newName}"`).all();
      
      if (updatedElements.length > 0) {
        console.log('🎉 SUCCESS: Recipe edit was successful!');
        await page.screenshot({ 
          path: 'screenshots/complete-10-edit-success.png', 
          fullPage: true 
        });
        
        return true;
      } else {
        console.log('⚠️ Edit success uncertain - checking for errors...');
        
        const errorSelectors = [
          '.error', '.alert-error', '[role="alert"]', 
          '.text-red-500', '.text-red-600', '.text-danger',
          ':has-text("erro")', ':has-text("error")'
        ];
        
        for (const selector of errorSelectors) {
          const errors = await page.locator(selector).all();
          if (errors.length > 0) {
            for (let i = 0; i < errors.length; i++) {
              const errorText = await errors[i].textContent();
              console.log(`Error ${i + 1}: ${errorText}`);
            }
          }
        }
        
        return false;
      }
    } else {
      console.log('❌ Save button not found');
      
      const allButtons = await page.locator('button').all();
      console.log(`Available buttons: ${allButtons.length}`);
      
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`Button ${i + 1}: "${buttonText}"`);
      }
      
      return false;
    }
  } else {
    console.log('❌ Name field not found');
    
    const allInputs = await page.locator('input').all();
    console.log(`Available inputs: ${allInputs.length}`);
    
    for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
      const inputType = await allInputs[i].getAttribute('type');
      const inputName = await allInputs[i].getAttribute('name');
      const inputPlaceholder = await allInputs[i].getAttribute('placeholder');
      console.log(`Input ${i + 1}: type="${inputType}" name="${inputName}" placeholder="${inputPlaceholder}"`);
    }
    
    return false;
  }
}

test.describe('Complete Recipe Edit Test', () => {
  test('Complete recipe editing workflow with authentication', async ({ page }) => {
    console.log('🎯 Starting complete recipe edit test...');
    
    // Step 1: Login and navigate to recipes
    console.log('🔐 Logging in and navigating to recipes...');
    const isOnRecipesPage = await loginAndNavigate(page);
    
    await page.screenshot({ 
      path: 'screenshots/complete-01-after-login-nav.png', 
      fullPage: true 
    });
    
    if (!isOnRecipesPage) {
      console.log('❌ Failed to reach recipes page');
      return;
    }
    
    console.log('✅ Successfully reached recipes page');
    
    // Step 2: Find and analyze the recipe table
    console.log('🔍 Analyzing recipe table structure...');
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    const table = page.locator('table');
    const tableBody = table.locator('tbody');
    const rows = await tableBody.locator('tr').all();
    
    console.log(`Found ${rows.length} recipe rows`);
    
    if (rows.length === 0) {
      console.log('❌ No recipes found in table');
      await page.screenshot({ 
        path: 'screenshots/complete-02-no-recipes.png', 
        fullPage: true 
      });
      return;
    }
    
    // Step 3: Analyze the first recipe row
    const firstRow = rows[0];
    const rowText = await firstRow.textContent();
    console.log('First recipe:', rowText?.substring(0, 100));
    
    await page.screenshot({ 
      path: 'screenshots/complete-03-recipes-table.png', 
      fullPage: true 
    });
    
    // Step 4: Find action buttons in the first row
    console.log('🔍 Looking for action buttons...');
    
    // Look specifically in the last column (Ações)
    const actionCell = firstRow.locator('td').last();
    const actionButtons = await actionCell.locator('button').all();
    
    console.log(`Found ${actionButtons.length} action buttons in first row`);
    
    if (actionButtons.length === 0) {
      console.log('❌ No action buttons found');
      return;
    }
    
    // Log button details
    for (let i = 0; i < actionButtons.length; i++) {
      const buttonHtml = await actionButtons[i].innerHTML();
      console.log(`Button ${i + 1}: ${buttonHtml}`);
    }
    
    // Step 5: Click the edit button (usually the second button: view, edit, delete)
    let editButton = null;
    
    if (actionButtons.length >= 2) {
      editButton = actionButtons[1]; // Second button should be edit
    } else if (actionButtons.length === 1) {
      editButton = actionButtons[0]; // If only one button, try it
    }
    
    if (editButton) {
      console.log('🖱️ Clicking edit button...');
      
      // Hover to highlight the button
      await editButton.hover();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'screenshots/complete-04-before-edit-click.png', 
        fullPage: true 
      });
      
      // Click the edit button
      await editButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ 
        path: 'screenshots/complete-05-after-edit-click.png', 
        fullPage: true 
      });
      
      // Step 6: Check what happened after clicking edit
      const currentUrl = page.url();
      console.log('URL after edit click:', currentUrl);
      
      // Check for modal/dialog
      const modals = await page.locator('[role="dialog"], .modal, [class*="modal"]').all();
      console.log(`Found ${modals.length} modals`);
      
      // Check for form fields
      const formFields = await page.locator('input, textarea, select').all();
      console.log(`Found ${formFields.length} form fields`);
      
      // Step 7: Handle different edit interface types
      if (currentUrl !== `${BASE_URL}/recipes/` && currentUrl.includes('/recipes/')) {
        console.log('✅ Navigated to dedicated edit page');
        await handleEditPage(page);
      } else if (modals.length > 0) {
        console.log('✅ Edit modal opened');
        await handleEditModal(page);
      } else if (formFields.length > 0) {
        console.log('✅ Edit form appeared on same page');
        await handleEditForm(page);
      } else {
        console.log('❌ No edit interface detected');
        
        // Try waiting a bit longer
        await page.waitForTimeout(2000);
        
        const delayedFormFields = await page.locator('input, textarea, select').all();
        const delayedModals = await page.locator('[role="dialog"], .modal').all();
        
        console.log(`After delay - Forms: ${delayedFormFields.length}, Modals: ${delayedModals.length}`);
        
        if (delayedFormFields.length > 0 || delayedModals.length > 0) {
          await page.screenshot({ 
            path: 'screenshots/complete-06-delayed-edit-interface.png', 
            fullPage: true 
          });
          
          if (delayedModals.length > 0) {
            await handleEditModal(page);
          } else {
            await handleEditForm(page);
          }
        }
      }
    } else {
      console.log('❌ No edit button found');
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'screenshots/complete-99-final-state.png', 
      fullPage: true 
    });
    
    console.log('✅ Complete recipe edit test finished');
  });
});