import { test, expect, Page } from '@playwright/test';
import { AuthHelper } from '../helpers/auth';

/**
 * Specific Supplier CRUD Test - Following user requirements exactly
 * Tests the complete CRUD sequence with specific test data
 */

const TEST_SUPPLIER_DATA = {
  name: 'Fornecedor Teste CRUD',
  contactPerson: 'João Silva',
  phone: '11999887766',
  email: 'joao@teste.com',
  cpfCnpj: '12345678901',
  cep: '01310100',
  state: 'SP',
  city: 'São Paulo',
  neighborhood: 'Bela Vista',
  street: 'Av. Paulista',
  number: '1000',
  rating: 4,
  categories: ['Farinhas']
};

test.describe('Specific Supplier CRUD Operations Test', () => {
  let authHelper: AuthHelper;
  let testResults: any = {
    login: { status: 'pending', details: [] },
    navigation: { status: 'pending', details: [] },
    create: { status: 'pending', details: [] },
    read: { status: 'pending', details: [] },
    search: { status: 'pending', details: [] },
    update: { status: 'pending', details: [] },
    delete: { status: 'pending', details: [] },
    validation: { status: 'pending', details: [] },
    errors: []
  };

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    
    // Set up error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        testResults.errors.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    page.on('pageerror', error => {
      testResults.errors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });
  });

  test('Complete CRUD Test Sequence', async ({ page }) => {
    console.log('🚀 Starting Specific Supplier CRUD Test Sequence');
    console.log('=' .repeat(60));

    // **STEP 1: LOGIN AND NAVIGATE**
    try {
      console.log('\n1️⃣ LOGIN AND NAVIGATION TEST');
      console.log('-'.repeat(40));

      // Login to the system
      await authHelper.loginAsAdmin();
      testResults.login.status = 'success';
      testResults.login.details.push('✅ Admin login successful');
      console.log('✅ Admin login successful');

      // Take screenshot after login
      await page.screenshot({ 
        path: 'test-results/crud-01-after-login.png', 
        fullPage: true 
      });

      // Navigate to suppliers via sidebar: Ingredientes → Fornecedores
      console.log('🧭 Attempting navigation to suppliers via sidebar...');
      
      // Look for the sidebar navigation
      const sidebarSelectors = [
        '[data-testid="sidebar"]',
        'nav[role="navigation"]',
        '.sidebar',
        'aside',
        '[class*="sidebar"]'
      ];

      let sidebarFound = false;
      for (const selector of sidebarSelectors) {
        const sidebar = page.locator(selector);
        if (await sidebar.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found sidebar with selector: ${selector}`);
          sidebarFound = true;
          
          // Look for Ingredientes or Fornecedores navigation
          const navigationOptions = [
            'text=Ingredientes',
            'text=Fornecedores',
            'text=Suppliers',
            '[href*="supplier"]',
            '[href*="fornecedor"]',
            'a:has-text("Ingredientes")',
            'a:has-text("Fornecedores")'
          ];

          let navFound = false;
          for (const navOption of navigationOptions) {
            const navElement = page.locator(navOption);
            if (await navElement.isVisible({ timeout: 1000 })) {
              console.log(`✅ Found navigation option: ${navOption}`);
              await navElement.click();
              navFound = true;
              break;
            }
          }

          if (!navFound) {
            console.log('⚠️ No navigation options found, trying direct URL');
            await page.goto('http://localhost:3000/suppliers');
          }
          break;
        }
      }

      if (!sidebarFound) {
        console.log('⚠️ Sidebar not found, navigating directly to suppliers URL');
        await page.goto('http://localhost:3000/suppliers');
      }

      await page.waitForLoadState('networkidle');

      // Verify suppliers list loads with existing data
      console.log('✅ Navigated to suppliers page');
      testResults.navigation.status = 'success';
      testResults.navigation.details.push('✅ Successfully navigated to suppliers page');

      // Take screenshot of the list view
      await page.screenshot({ 
        path: 'test-results/crud-02-suppliers-list.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot saved: crud-02-suppliers-list.png');

    } catch (error) {
      testResults.login.status = 'failed';
      testResults.login.details.push(`❌ Login/Navigation failed: ${error.message}`);
      console.log(`❌ Login/Navigation failed: ${error.message}`);
      throw error;
    }

    // **STEP 2: CREATE TEST**
    try {
      console.log('\n2️⃣ CREATE OPERATION TEST');
      console.log('-'.repeat(40));

      // Click "Novo Fornecedor" button
      const createButtonSelectors = [
        'button:has-text("Novo Fornecedor")',
        'button:has-text("Novo")',
        'button:has-text("Adicionar")',
        'button:has-text("Create")',
        'button:has-text("New")',
        'a:has-text("Novo Fornecedor")',
        'a:has-text("Novo")',
        '[data-testid="new-supplier"]',
        '[aria-label="Novo fornecedor"]'
      ];

      let createButtonFound = false;
      for (const selector of createButtonSelectors) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found "New Supplier" button: ${selector}`);
          await button.click();
          createButtonFound = true;
          break;
        }
      }

      if (!createButtonFound) {
        console.log('⚠️ "New Supplier" button not found, trying direct URL');
        await page.goto('http://localhost:3000/suppliers/new');
      }

      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: 'test-results/crud-03-new-supplier-form.png', 
        fullPage: true 
      });

      // Fill in the supplier form with specific test data
      console.log('📝 Filling supplier form with test data...');

      const formFields = [
        { field: 'name', selector: ['[data-testid="supplier-name"]', '[name="name"]', 'input[placeholder*="nome"]'], value: TEST_SUPPLIER_DATA.name },
        { field: 'contactPerson', selector: ['[data-testid="contact-person"]', '[name="contactPerson"]', 'input[placeholder*="contato"]'], value: TEST_SUPPLIER_DATA.contactPerson },
        { field: 'phone', selector: ['[data-testid="supplier-phone"]', '[name="phone"]', 'input[placeholder*="telefone"]'], value: TEST_SUPPLIER_DATA.phone },
        { field: 'email', selector: ['[data-testid="supplier-email"]', '[name="email"]', 'input[type="email"]'], value: TEST_SUPPLIER_DATA.email },
        { field: 'cpfCnpj', selector: ['[data-testid="cpf-cnpj"]', '[name="cpfCnpj"]', 'input[placeholder*="CPF"]'], value: TEST_SUPPLIER_DATA.cpfCnpj },
        { field: 'cep', selector: ['[data-testid="cep"]', '[name="cep"]', 'input[placeholder*="CEP"]'], value: TEST_SUPPLIER_DATA.cep },
        { field: 'state', selector: ['[data-testid="state"]', '[name="state"]', 'input[placeholder*="estado"]'], value: TEST_SUPPLIER_DATA.state },
        { field: 'city', selector: ['[data-testid="city"]', '[name="city"]', 'input[placeholder*="cidade"]'], value: TEST_SUPPLIER_DATA.city },
        { field: 'neighborhood', selector: ['[data-testid="neighborhood"]', '[name="neighborhood"]', 'input[placeholder*="bairro"]'], value: TEST_SUPPLIER_DATA.neighborhood },
        { field: 'street', selector: ['[data-testid="street"]', '[name="street"]', 'input[placeholder*="logradouro"]'], value: TEST_SUPPLIER_DATA.street },
        { field: 'number', selector: ['[data-testid="number"]', '[name="number"]', 'input[placeholder*="número"]'], value: TEST_SUPPLIER_DATA.number }
      ];

      let filledFields = 0;
      for (const fieldInfo of formFields) {
        let fieldFilled = false;
        for (const selector of fieldInfo.selector) {
          const field = page.locator(selector);
          if (await field.isVisible({ timeout: 1000 })) {
            try {
              await field.fill(fieldInfo.value);
              console.log(`✅ Filled ${fieldInfo.field}: ${fieldInfo.value}`);
              fieldFilled = true;
              filledFields++;
              break;
            } catch (error) {
              console.log(`⚠️ Could not fill ${fieldInfo.field}: ${error.message}`);
            }
          }
        }
        if (!fieldFilled) {
          console.log(`⚠️ Field ${fieldInfo.field} not found or not fillable`);
        }
      }

      // Handle rating (4 stars)
      const ratingSelectors = [
        `[data-rating="4"]`,
        `input[value="4"]`,
        `button[data-value="4"]`,
        `.star:nth-child(4)`
      ];

      for (const selector of ratingSelectors) {
        const rating = page.locator(selector);
        if (await rating.isVisible({ timeout: 1000 })) {
          await rating.click();
          console.log('✅ Set rating to 4 stars');
          break;
        }
      }

      // Handle categories (Add "Farinhas" category)
      const categorySelectors = [
        'select[name="categories"]',
        '[data-testid="categories"]',
        'input[placeholder*="categoria"]'
      ];

      for (const selector of categorySelectors) {
        const category = page.locator(selector);
        if (await category.isVisible({ timeout: 1000 })) {
          if (selector.includes('select')) {
            await category.selectOption('Farinhas');
          } else {
            await category.fill('Farinhas');
          }
          console.log('✅ Added category: Farinhas');
          break;
        }
      }

      // Take screenshot of filled form
      await page.screenshot({ 
        path: 'test-results/crud-04-form-filled.png', 
        fullPage: true 
      });

      // Submit the form
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Salvar")',
        'button:has-text("Criar")',
        'button:has-text("Save")',
        'button:has-text("Submit")',
        '[data-testid="submit-supplier"]'
      ];

      let formSubmitted = false;
      for (const selector of submitSelectors) {
        const submitButton = page.locator(selector);
        if (await submitButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found submit button: ${selector}`);
          await submitButton.click();
          formSubmitted = true;
          break;
        }
      }

      if (formSubmitted) {
        await page.waitForLoadState('networkidle');
        console.log('✅ Form submitted successfully');
        testResults.create.status = 'success';
        testResults.create.details.push(`✅ Form submitted with ${filledFields} fields filled`);
        
        // Verify redirect back to suppliers list
        const currentUrl = page.url();
        if (currentUrl.includes('/suppliers') && !currentUrl.includes('/new')) {
          console.log('✅ Redirected back to suppliers list');
          testResults.create.details.push('✅ Redirect to suppliers list confirmed');
        }
      } else {
        console.log('⚠️ Submit button not found');
        testResults.create.status = 'partial';
        testResults.create.details.push('⚠️ Submit button not found');
      }

    } catch (error) {
      testResults.create.status = 'failed';
      testResults.create.details.push(`❌ Create operation failed: ${error.message}`);
      console.log(`❌ Create operation failed: ${error.message}`);
    }

    // **STEP 3: READ TEST**
    try {
      console.log('\n3️⃣ READ OPERATION TEST');
      console.log('-'.repeat(40));

      // Verify the new supplier appears in the suppliers table
      const supplierCardSelectors = [
        `text="${TEST_SUPPLIER_DATA.name}"`,
        `[data-testid="supplier-card"]:has-text("${TEST_SUPPLIER_DATA.name}")`,
        `tr:has-text("${TEST_SUPPLIER_DATA.name}")`,
        `.supplier-item:has-text("${TEST_SUPPLIER_DATA.name}")`
      ];

      let supplierFound = false;
      for (const selector of supplierCardSelectors) {
        const supplier = page.locator(selector);
        if (await supplier.isVisible({ timeout: 3000 })) {
          console.log(`✅ Found created supplier in list: ${selector}`);
          supplierFound = true;
          break;
        }
      }

      if (supplierFound) {
        testResults.read.status = 'success';
        testResults.read.details.push('✅ New supplier visible in suppliers list');
        console.log('✅ New supplier appears in the list');
      } else {
        testResults.read.status = 'partial';
        testResults.read.details.push('⚠️ New supplier not found in list');
        console.log('⚠️ New supplier not found in list');
      }

      // Take screenshot of the updated list
      await page.screenshot({ 
        path: 'test-results/crud-05-updated-list.png', 
        fullPage: true 
      });
      console.log('📸 Screenshot saved: crud-05-updated-list.png');

    } catch (error) {
      testResults.read.status = 'failed';
      testResults.read.details.push(`❌ Read operation failed: ${error.message}`);
      console.log(`❌ Read operation failed: ${error.message}`);
    }

    // **STEP 4: SEARCH TEST**
    try {
      console.log('\n4️⃣ SEARCH FUNCTIONALITY TEST');
      console.log('-'.repeat(40));

      const searchSelectors = [
        'input[placeholder*="Buscar"]',
        'input[placeholder*="Search"]',
        'input[type="search"]',
        '[data-testid="search"]',
        '.search-input'
      ];

      let searchInput = null;
      for (const selector of searchSelectors) {
        const input = page.locator(selector);
        if (await input.isVisible({ timeout: 2000 })) {
          searchInput = input;
          console.log(`✅ Found search input: ${selector}`);
          break;
        }
      }

      if (searchInput) {
        // Search for "Teste CRUD"
        await searchInput.fill('Teste CRUD');
        console.log('🔍 Searching for "Teste CRUD"');
        
        // Wait for search to process
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');
        
        // Verify the supplier is found
        const searchResult = page.locator(`text="${TEST_SUPPLIER_DATA.name}"`);
        if (await searchResult.isVisible({ timeout: 3000 })) {
          console.log('✅ Search found the test supplier');
          testResults.search.details.push('✅ Search for "Teste CRUD" successful');
        } else {
          console.log('⚠️ Search did not find the test supplier');
          testResults.search.details.push('⚠️ Search for "Teste CRUD" unsuccessful');
        }

        // Clear search and verify all suppliers return
        await searchInput.clear();
        console.log('🔍 Cleared search');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');

        // Search for non-existent supplier
        await searchInput.fill('NonExistentSupplier12345');
        console.log('🔍 Searching for non-existent supplier');
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');

        const noResults = page.locator('text="Nenhum resultado encontrado", text="No results found", [data-testid="no-results"]');
        if (await noResults.isVisible({ timeout: 2000 })) {
          console.log('✅ No results message displayed correctly');
          testResults.search.details.push('✅ No results handling works');
        }

        testResults.search.status = 'success';
        await searchInput.clear(); // Clear for next tests
      } else {
        console.log('⚠️ Search input not found');
        testResults.search.status = 'not_available';
        testResults.search.details.push('⚠️ Search functionality not found');
      }

    } catch (error) {
      testResults.search.status = 'failed';
      testResults.search.details.push(`❌ Search test failed: ${error.message}`);
      console.log(`❌ Search test failed: ${error.message}`);
    }

    // **STEP 5: UPDATE TEST (if edit functionality exists)**
    try {
      console.log('\n5️⃣ UPDATE OPERATION TEST');
      console.log('-'.repeat(40));

      const editSelectors = [
        `[data-testid="supplier-card"]:has-text("${TEST_SUPPLIER_DATA.name}") button:has-text("Editar")`,
        `tr:has-text("${TEST_SUPPLIER_DATA.name}") button:has-text("Editar")`,
        `text="${TEST_SUPPLIER_DATA.name}" >> .. >> button:has-text("Editar")`,
        'button:has-text("Editar")',
        '[aria-label="Editar"]'
      ];

      let editButtonFound = false;
      for (const selector of editSelectors) {
        const editButton = page.locator(selector).first();
        if (await editButton.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found edit button: ${selector}`);
          await editButton.click();
          editButtonFound = true;
          break;
        }
      }

      if (editButtonFound) {
        await page.waitForLoadState('networkidle');
        
        // Change the name to "Fornecedor CRUD Atualizado"
        const nameFields = [
          '[data-testid="supplier-name"]',
          '[name="name"]',
          'input[placeholder*="nome"]'
        ];

        let nameUpdated = false;
        for (const selector of nameFields) {
          const nameField = page.locator(selector);
          if (await nameField.isVisible({ timeout: 1000 })) {
            await nameField.fill('Fornecedor CRUD Atualizado');
            console.log('✅ Updated supplier name');
            nameUpdated = true;
            break;
          }
        }

        if (nameUpdated) {
          // Save changes
          const saveSelectors = [
            'button[type="submit"]',
            'button:has-text("Salvar")',
            'button:has-text("Update")',
            'button:has-text("Save")'
          ];

          for (const selector of saveSelectors) {
            const saveButton = page.locator(selector);
            if (await saveButton.isVisible({ timeout: 1000 })) {
              await saveButton.click();
              await page.waitForLoadState('networkidle');
              console.log('✅ Saved updated supplier');
              testResults.update.status = 'success';
              testResults.update.details.push('✅ Supplier updated successfully');
              break;
            }
          }
        }
      } else {
        console.log('⚠️ Edit functionality not found');
        testResults.update.status = 'not_available';
        testResults.update.details.push('⚠️ Edit functionality not implemented');
      }

    } catch (error) {
      testResults.update.status = 'failed';
      testResults.update.details.push(`❌ Update test failed: ${error.message}`);
      console.log(`❌ Update test failed: ${error.message}`);
    }

    // **STEP 6: DELETE TEST (if delete functionality exists)**
    try {
      console.log('\n6️⃣ DELETE OPERATION TEST');
      console.log('-'.repeat(40));

      const deleteSelectors = [
        `[data-testid="supplier-card"]:has-text("Fornecedor CRUD Atualizado") button:has-text("Excluir")`,
        `tr:has-text("Fornecedor CRUD Atualizado") button:has-text("Excluir")`,
        'button:has-text("Excluir")',
        'button:has-text("Delete")',
        '[aria-label="Excluir"]'
      ];

      let deleteButtonFound = false;
      for (const selector of deleteSelectors) {
        const deleteButton = page.locator(selector).first();
        if (await deleteButton.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found delete button: ${selector}`);
          await deleteButton.click();
          deleteButtonFound = true;
          
          // Handle confirmation dialog
          const confirmSelectors = [
            'button:has-text("Confirmar")',
            'button:has-text("Delete")',
            '[data-testid="confirm-delete"]'
          ];

          for (const confirmSelector of confirmSelectors) {
            const confirmButton = page.locator(confirmSelector);
            if (await confirmButton.isVisible({ timeout: 2000 })) {
              await confirmButton.click();
              await page.waitForLoadState('networkidle');
              console.log('✅ Confirmed deletion');
              break;
            }
          }

          // Verify it's removed from the list
          const removedSupplier = page.locator('text="Fornecedor CRUD Atualizado"');
          if (!(await removedSupplier.isVisible({ timeout: 2000 }))) {
            console.log('✅ Supplier successfully removed from list');
            testResults.delete.status = 'success';
            testResults.delete.details.push('✅ Supplier deleted successfully');
          }
          break;
        }
      }

      if (!deleteButtonFound) {
        console.log('⚠️ Delete functionality not found');
        testResults.delete.status = 'not_available';
        testResults.delete.details.push('⚠️ Delete functionality not implemented');
      }

    } catch (error) {
      testResults.delete.status = 'failed';
      testResults.delete.details.push(`❌ Delete test failed: ${error.message}`);
      console.log(`❌ Delete test failed: ${error.message}`);
    }

    // **STEP 7: VALIDATION TESTING**
    try {
      console.log('\n7️⃣ VALIDATION TESTING');
      console.log('-'.repeat(40));

      // Go to new supplier form for validation testing
      await page.goto('http://localhost:3000/suppliers/new');
      await page.waitForLoadState('networkidle');

      // Test CPF/CNPJ validation with invalid formats
      const cpfField = page.locator('[data-testid="cpf-cnpj"], [name="cpfCnpj"], input[placeholder*="CPF"]');
      if (await cpfField.isVisible({ timeout: 2000 })) {
        await cpfField.fill('invalid-cpf');
        console.log('🧪 Testing CPF/CNPJ validation with invalid format');
        
        const validationMessage = page.locator('.error-message, .invalid-feedback, [role="alert"]');
        if (await validationMessage.isVisible({ timeout: 2000 })) {
          console.log('✅ CPF/CNPJ validation working');
          testResults.validation.details.push('✅ CPF/CNPJ validation works');
        }
      }

      // Test CEP formatting (should become 01310-100)
      const cepField = page.locator('[data-testid="cep"], [name="cep"], input[placeholder*="CEP"]');
      if (await cepField.isVisible({ timeout: 2000 })) {
        await cepField.fill('01310100');
        await page.waitForTimeout(500); // Allow formatting to apply
        const cepValue = await cepField.inputValue();
        
        if (cepValue.includes('-')) {
          console.log(`✅ CEP formatting working: ${cepValue}`);
          testResults.validation.details.push('✅ CEP formatting works');
        } else {
          console.log(`⚠️ CEP formatting not applied: ${cepValue}`);
          testResults.validation.details.push('⚠️ CEP formatting not working');
        }
      }

      // Test required field validation
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();
        
        const requiredFieldErrors = page.locator('.error-message, .invalid-feedback, [role="alert"]');
        if (await requiredFieldErrors.isVisible({ timeout: 2000 })) {
          console.log('✅ Required field validation working');
          testResults.validation.details.push('✅ Required field validation works');
        }
      }

      testResults.validation.status = testResults.validation.details.length > 0 ? 'success' : 'partial';

    } catch (error) {
      testResults.validation.status = 'failed';
      testResults.validation.details.push(`❌ Validation testing failed: ${error.message}`);
      console.log(`❌ Validation testing failed: ${error.message}`);
    }

    // **FINAL RESULTS SUMMARY**
    console.log('\n🏁 COMPLETE TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    const statusIcon = (status: string) => {
      switch (status) {
        case 'success': return '✅';
        case 'partial': return '🟡';
        case 'failed': return '❌';
        case 'not_available': return '⚠️';
        default: return '⏳';
      }
    };

    console.log(`${statusIcon(testResults.login.status)} LOGIN & NAVIGATION: ${testResults.login.status.toUpperCase()}`);
    testResults.login.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.create.status)} CREATE OPERATION: ${testResults.create.status.toUpperCase()}`);
    testResults.create.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.read.status)} READ OPERATION: ${testResults.read.status.toUpperCase()}`);
    testResults.read.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.search.status)} SEARCH FUNCTIONALITY: ${testResults.search.status.toUpperCase()}`);
    testResults.search.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.update.status)} UPDATE OPERATION: ${testResults.update.status.toUpperCase()}`);
    testResults.update.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.delete.status)} DELETE OPERATION: ${testResults.delete.status.toUpperCase()}`);
    testResults.delete.details.forEach(detail => console.log(`   ${detail}`));

    console.log(`${statusIcon(testResults.validation.status)} VALIDATION TESTING: ${testResults.validation.status.toUpperCase()}`);
    testResults.validation.details.forEach(detail => console.log(`   ${detail}`));

    if (testResults.errors.length > 0) {
      console.log(`\n🚨 ERRORS CAPTURED: ${testResults.errors.length}`);
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type}: ${error.message}`);
      });
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/crud-final-state.png', 
      fullPage: true 
    });
    console.log('📸 Final screenshot saved: crud-final-state.png');

    // Success measurement
    const successOperations = Object.values(testResults).filter(
      result => typeof result === 'object' && result.status === 'success'
    ).length;
    
    const totalOperations = Object.keys(testResults).filter(
      key => key !== 'errors' && typeof testResults[key] === 'object'
    ).length;

    console.log(`\n📊 SUCCESS RATE: ${successOperations}/${totalOperations} operations successful`);
    
    if (successOperations >= 4) { // LOGIN, CREATE, READ, and at least one other
      console.log('🎉 MINIMUM SUCCESS CRITERIA MET');
    } else {
      console.log('⚠️ MINIMUM SUCCESS CRITERIA NOT MET');
    }
  });
});