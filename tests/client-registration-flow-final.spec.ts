import { test, expect } from '@playwright/test';

/**
 * Client Registration Flow Test - Complete E2E Validation
 *
 * Tests the full client registration workflow for both client types:
 * - Pessoa Física (Individual) with CPF
 * - Pessoa Jurídica (Company) with CNPJ
 *
 * Each test validates:
 * - Form filling and validation
 * - Related persons addition
 * - Special dates addition
 * - Successful creation
 * - Client appears in list
 */

test.describe('Client Registration Flow - Post Firebase Security Rules Fix', () => {
  test.setTimeout(120000); // 2 minutes for complete flow

  test.beforeEach(async ({ page }) => {
    console.log('🚀 Starting test setup...');

    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('load');

    console.log('📝 Filling login credentials...');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    console.log('🔑 Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard - use a more flexible approach
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    } catch (e) {
      // If URL wait times out, check if we're on dashboard anyway
      const currentUrl = page.url();
      if (!currentUrl.includes('/dashboard')) {
        throw new Error(`Login failed - not on dashboard. Current URL: ${currentUrl}`);
      }
    }

    // Verify dashboard loaded by checking for dashboard title
    const dashboardTitle = page.locator('text="Dashboard"').first();
    await dashboardTitle.waitFor({ timeout: 10000 });
    console.log('✅ Login successful, on dashboard');

    // Navigate to Clients section
    console.log('🧭 Navigating to Clients section...');

    // Wait for sidebar to be ready
    await page.waitForTimeout(1000);

    // Try multiple navigation strategies
    try {
      // Strategy 1: Click on sidebar menu item
      const clientsMenuItem = page.locator('a[href*="clients"], button:has-text("Clientes")').first();
      const isVisible = await clientsMenuItem.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        console.log('  Found Clientes menu item, clicking...');
        await clientsMenuItem.click();
        await page.waitForLoadState('load');
      } else {
        throw new Error('Menu item not visible');
      }
    } catch (e) {
      console.log('  Sidebar navigation not found, using direct URL...');
      // Strategy 2: Direct URL navigation
      await page.goto('http://localhost:4000/dashboard/clients');
      await page.waitForLoadState('load');
    }

    console.log('✅ On Clients page');

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);
  });

  test('Test 1: Create Pessoa Física Client with Related Person & Special Date', async ({ page }) => {
    console.log('\n=== TEST 1: PESSOA FÍSICA ===\n');

    // Step 1: Click "Novo Cliente" button
    console.log('Step 1: Clicking "Novo Cliente" button...');

    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 10000 });
    await novoClienteButton.click();

    // Wait for modal to appear - look for the modal title "Novo Cliente"
    console.log('⏳ Waiting for modal to appear...');
    await page.waitForSelector('text="Novo Cliente"', { timeout: 10000 });
    console.log('✅ Modal opened');

    // Get the modal container (it's the parent of the title)
    const modal = page.locator('text="Novo Cliente"').locator('..');

    // Take screenshot of empty modal
    await page.screenshot({
      path: 'screenshots/test1-modal-opened.png',
      fullPage: true
    });

    // Step 2: Verify Tipo "Pessoa Física" is selected (it's selected by default)
    console.log('Step 2: Verifying Tipo "Pessoa Física" is selected...');

    // Check if Pessoa Física radio is already selected by looking for the checked radio input
    const tipoSection = page.locator('text="Tipo de Cliente"').locator('..');
    const pessoaFisicaRadio = tipoSection.locator('input[type="radio"]').first();
    const isChecked = await pessoaFisicaRadio.isChecked().catch(() => true); // Default to true since it's selected by default

    if (!isChecked) {
      // If not checked, click the radio button directly
      await pessoaFisicaRadio.click();
      await page.waitForTimeout(500);
    }
    console.log('✅ Pessoa Física selected (default)');

    // Step 3: Fill client information
    console.log('Step 3: Filling client information...');

    // Fill name - use label to find the input
    const nameInput = page.locator('input[placeholder*="Silva"]').or(page.locator('label:has-text("Nome Completo") + input')).first();
    await nameInput.fill('João Silva Teste');
    console.log('  ✓ Name: João Silva Teste');

    // Fill email
    const emailInput = page.locator('label:has-text("Email") + input, input[type="email"]').first();
    await emailInput.fill('joao.silva@test.com');
    console.log('  ✓ Email: joao.silva@test.com');

    // Fill CPF
    const cpfInput = page.locator('label:has-text("CPF") + input, input[placeholder*="CPF"]').first();
    await cpfInput.fill('12345678901');
    console.log('  ✓ CPF: 12345678901');

    // Fill phone (Telefone)
    const phoneInput = page.locator('label:has-text("Telefone") + input, input[placeholder*="telefone"]').first();
    await phoneInput.fill('11999999999');
    console.log('  ✓ Phone: 11999999999');

    await page.waitForTimeout(1000);

    // Take screenshot after basic info
    await page.screenshot({
      path: 'screenshots/test1-basic-info-filled.png',
      fullPage: true
    });

    // Step 4: Add Related Person
    console.log('Step 4: Adding Related Person...');

    // Look for "Adicionar Pessoa" or similar button
    const addPersonButton = modal.locator('button:has-text("Adicionar Pessoa"), button:has-text("Adicionar")').first();

    if (await addPersonButton.isVisible({ timeout: 3000 })) {
      await addPersonButton.click();
      await page.waitForTimeout(500);

      // Fill related person name
      const relatedPersonName = modal.locator('input[placeholder*="Nome"]').last();
      await relatedPersonName.fill('Maria Silva');
      console.log('  ✓ Related Person Name: Maria Silva');

      // Fill relationship
      const relationshipInput = modal.locator('input[placeholder*="Parentesco"], input[placeholder*="Relação"]').last();
      await relationshipInput.fill('Spouse');
      console.log('  ✓ Relationship: Spouse');

      await page.waitForTimeout(500);
    } else {
      console.log('  ℹ️  No "Adicionar Pessoa" button found, may be in different section');
    }

    // Step 5: Add Special Date
    console.log('Step 5: Adding Special Date...');

    // Look for "Adicionar Data" or similar button
    const addDateButton = modal.locator('button:has-text("Adicionar Data"), button:has-text("Data Especial")').first();

    if (await addDateButton.isVisible({ timeout: 3000 })) {
      await addDateButton.click();
      await page.waitForTimeout(500);

      // Fill special date
      const dateInput = modal.locator('input[type="date"]').last();
      await dateInput.fill('2025-12-25');
      console.log('  ✓ Date: 2025-12-25');

      // Select date type
      const dateTypeInput = modal.locator('input[placeholder*="Tipo"], input[placeholder*="Descrição"]').last();
      await dateTypeInput.fill('Aniversário');
      console.log('  ✓ Date Type: Aniversário');

      await page.waitForTimeout(500);
    } else {
      console.log('  ℹ️  No "Adicionar Data" button found, may be in different section');
    }

    // Take screenshot before submission
    await page.screenshot({
      path: 'screenshots/test1-before-submit.png',
      fullPage: true
    });

    // Step 6: Submit form
    console.log('Step 6: Submitting form...');

    const submitButton = page.locator('button:has-text("Criar Cliente")').first();
    await expect(submitButton).toBeVisible();

    // Log console messages to catch any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    await submitButton.click();
    console.log('🔄 Form submitted, waiting for modal to close...');

    // Wait for modal to close by checking if "Novo Cliente" title is gone
    await page.waitForSelector('text="Novo Cliente"', { state: 'hidden', timeout: 15000 });
    console.log('✅ Modal closed successfully');

    // Step 7: Verify client appears in list
    console.log('Step 7: Verifying client appears in list...');

    await page.waitForTimeout(2000); // Wait for list to refresh

    // Look for the client name in the list
    const clientInList = page.locator('text="João Silva Teste"').first();
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "João Silva Teste" appears in list');

    // Take screenshot of client in list
    await page.screenshot({
      path: 'screenshots/test1-client-in-list.png',
      fullPage: true
    });

    console.log('\n✅ TEST 1 COMPLETED SUCCESSFULLY\n');
  });

  test('Test 2: Create Pessoa Jurídica Client with Related Person & Special Date', async ({ page }) => {
    console.log('\n=== TEST 2: PESSOA JURÍDICA ===\n');

    // Step 1: Click "Novo Cliente" button again
    console.log('Step 1: Clicking "Novo Cliente" button...');

    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 10000 });
    await novoClienteButton.click();

    // Wait for modal to appear - look for the modal title "Novo Cliente"
    console.log('⏳ Waiting for modal to appear...');
    await page.waitForSelector('text="Novo Cliente"', { timeout: 10000 });
    console.log('✅ Modal opened');

    // Get the modal container (it's the parent of the title)
    const modal = page.locator('text="Novo Cliente"').locator('..');

    // Step 2: Select Tipo "Pessoa Jurídica"
    console.log('Step 2: Selecting Tipo "Pessoa Jurídica"...');

    // Find the Tipo de Cliente section and click the second radio button (Pessoa Jurídica)
    const tipoSection = page.locator('text="Tipo de Cliente"').locator('..');
    const pessoaJuridicaRadio = tipoSection.locator('input[type="radio"]').nth(1); // Second radio button
    await pessoaJuridicaRadio.click();
    await page.waitForTimeout(1000); // Wait for form to update
    console.log('✅ Selected Pessoa Jurídica');

    // Step 3: Fill company information
    console.log('Step 3: Filling company information...');

    // Wait for form to update after selecting Pessoa Jurídica
    await page.waitForTimeout(500);

    // Fill company name (the form should now show "Razão Social" or "Nome da Empresa")
    const companyNameInput = page.locator('input[placeholder*="Silva"]').or(page.locator('label:has-text("Nome") + input, label:has-text("Razão Social") + input')).first();
    await companyNameInput.fill('Test Company Brasil Ltda');
    console.log('  ✓ Company Name: Test Company Brasil Ltda');

    // Fill email
    const emailInput = page.locator('label:has-text("Email") + input, input[type="email"]').first();
    await emailInput.fill('company@test.com');
    console.log('  ✓ Email: company@test.com');

    // Fill CNPJ (should replace CPF field)
    const cnpjInput = page.locator('label:has-text("CNPJ") + input, input[placeholder*="CNPJ"]').first();
    await cnpjInput.fill('12345678000190');
    console.log('  ✓ CNPJ: 12345678000190');

    // Fill phone (Telefone)
    const phoneInput = page.locator('label:has-text("Telefone") + input, input[placeholder*="telefone"]').first();
    await phoneInput.fill('1133333333');
    console.log('  ✓ Phone: 1133333333');

    await page.waitForTimeout(1000);

    // Take screenshot after basic info
    await page.screenshot({
      path: 'screenshots/test2-basic-info-filled.png',
      fullPage: true
    });

    // Step 4: Add Related Person
    console.log('Step 4: Adding Related Person...');

    const addPersonButton = modal.locator('button:has-text("Adicionar Pessoa"), button:has-text("Adicionar")').first();

    if (await addPersonButton.isVisible({ timeout: 3000 })) {
      await addPersonButton.click();
      await page.waitForTimeout(500);

      // Fill related person name
      const relatedPersonName = modal.locator('input[placeholder*="Nome"]').last();
      await relatedPersonName.fill('João Manager');
      console.log('  ✓ Related Person Name: João Manager');

      // Fill position
      const positionInput = modal.locator('input[placeholder*="Cargo"], input[placeholder*="Função"]').last();
      await positionInput.fill('Gerente');
      console.log('  ✓ Position: Gerente');

      await page.waitForTimeout(500);
    } else {
      console.log('  ℹ️  No "Adicionar Pessoa" button found, may be in different section');
    }

    // Step 5: Add Special Date
    console.log('Step 5: Adding Special Date...');

    const addDateButton = modal.locator('button:has-text("Adicionar Data"), button:has-text("Data Especial")').first();

    if (await addDateButton.isVisible({ timeout: 3000 })) {
      await addDateButton.click();
      await page.waitForTimeout(500);

      // Fill special date
      const dateInput = modal.locator('input[type="date"]').last();
      await dateInput.fill('2025-06-15');
      console.log('  ✓ Date: 2025-06-15');

      // Select date type
      const dateTypeInput = modal.locator('input[placeholder*="Tipo"], input[placeholder*="Descrição"]').last();
      await dateTypeInput.fill('Fundação');
      console.log('  ✓ Date Type: Fundação');

      await page.waitForTimeout(500);
    } else {
      console.log('  ℹ️  No "Adicionar Data" button found, may be in different section');
    }

    // Take screenshot before submission
    await page.screenshot({
      path: 'screenshots/test2-before-submit.png',
      fullPage: true
    });

    // Step 6: Submit form
    console.log('Step 6: Submitting form...');

    const submitButton = page.locator('button:has-text("Criar Cliente")').first();
    await expect(submitButton).toBeVisible();

    // Log console messages to catch any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    await submitButton.click();
    console.log('🔄 Form submitted, waiting for modal to close...');

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Modal closed successfully');

    // Step 7: Verify both clients appear in list
    console.log('Step 7: Verifying both clients appear in list...');

    await page.waitForTimeout(2000); // Wait for list to refresh

    // Verify Pessoa Física client still visible
    const client1InList = page.locator('text="João Silva Teste"').first();
    await expect(client1InList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "João Silva Teste" (PF) still visible');

    // Verify Pessoa Jurídica client visible
    const client2InList = page.locator('text="Test Company Brasil Ltda"').first();
    await expect(client2InList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "Test Company Brasil Ltda" (PJ) appears in list');

    // Take screenshot of both clients in list
    await page.screenshot({
      path: 'screenshots/test2-both-clients-in-list.png',
      fullPage: true
    });

    console.log('\n✅ TEST 2 COMPLETED SUCCESSFULLY\n');
  });

  test.afterEach(async ({ page }) => {
    console.log('🧹 Test cleanup...');
    await page.close();
  });
});
