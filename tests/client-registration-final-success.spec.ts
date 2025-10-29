import { test, expect } from '@playwright/test';

/**
 * Complete Client Registration Flow Test
 * Tests both Pessoa Física and Pessoa Jurídica client creation
 * after Firebase security rules have been fixed
 */

const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const BASE_URL = 'http://localhost:4000';

test.describe('Client Registration - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for successful login and redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('load');

    // Additional wait for dashboard to fully render
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });

    console.log('✅ Logged in successfully');
  });

  test('Test 1: Create Pessoa Física Client with Related Person and Special Date', async ({ page }) => {
    console.log('\n=== TEST 1: PESSOA FÍSICA CLIENT ===\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000); // Wait for page to fully render
    console.log('📍 Navigated to Clients section');

    // Take screenshot of initial state
    await page.screenshot({
      path: 'screenshots/client-test-1-initial.png',
      fullPage: true
    });

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');

    // Wait for modal to open by checking for the modal heading
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'visible', timeout: 10000 });
    console.log('✅ Modal opened');

    // Wait for modal to be fully visible
    await page.waitForTimeout(1000);

    // Select "Pessoa Física" - it's already selected by default
    // The radio button is already checked, so we can skip this step
    console.log('✅ Pessoa Física is already selected by default');

    // Fill form fields
    console.log('📝 Filling form fields...');

    // Scroll modal to ensure all fields are visible
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollTop = 0;
    });

    // Nome Completo (use ID)
    await page.fill('input#name, input[placeholder="João da Silva"]', 'João Silva Teste');
    console.log('  - Nome Completo: João Silva Teste');

    // Scroll down slightly to ensure fields are visible
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollTop = 100;
    });
    await page.waitForTimeout(300);

    // Email (use ID)
    await page.fill('input#email', 'joao.silva@test.com');
    console.log('  - Email: joao.silva@test.com');

    // CPF (the field is cpfCnpj)
    await page.fill('input#cpfCnpj', '12345678901');
    console.log('  - CPF: 12345678901');

    // Telefone (use ID)
    await page.fill('input#phone', '11999999999');
    console.log('  - Telefone: 11999999999');

    // Contact Method Value - use the "Valor" placeholder under "Métodos de Contato"
    const valorInput = page.locator('input[placeholder="Valor"]').first();
    if (await valorInput.isVisible()) {
      await valorInput.fill('11999999999');
      console.log('  - Contact Method Value: 11999999999');
    }

    // Take screenshot after filling basic info
    await page.screenshot({
      path: 'screenshots/client-test-1-basic-info.png',
      fullPage: true
    });

    // Add Related Person
    console.log('👥 Adding Related Person...');

    // Scroll to the "Adicionar Pessoa" button
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollTop = modal.scrollHeight;
    });
    await page.waitForTimeout(500);

    const addRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await addRelatedPersonButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addRelatedPersonButton.click();
    await page.waitForTimeout(1500); // Wait for form to appear

    // Verify form appeared
    await page.waitForSelector('input[placeholder="Nome completo"]', { timeout: 5000 });
    console.log('✅ Related person form appeared');

    // Fill related person fields
    await page.fill('input[placeholder="Nome completo"]', 'Maria Silva');
    console.log('  - Name: Maria Silva');

    // Select relationship - find the select in the related person form
    const relationshipSelect = page.locator('select').last(); // Use last select to ensure we get the one in the related person form
    await relationshipSelect.selectOption({ label: 'Cônjuge' });
    console.log('  - Relationship: Cônjuge');

    await page.screenshot({
      path: 'screenshots/client-test-1-related-person.png',
      fullPage: true
    });

    // Add Special Date
    console.log('📅 Adding Special Date...');
    const addSpecialDateButton = page.locator('button:has-text("Adicionar Data")');
    await addSpecialDateButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addSpecialDateButton.click();
    await page.waitForTimeout(1000);

    // Fill special date fields
    await page.fill('input[type="date"]', '2025-12-25');
    console.log('  - Date: 2025-12-25');

    await page.fill('input[placeholder*="descrição"], input[placeholder*="Descrição"]', 'Aniversário');
    console.log('  - Description: Aniversário');

    // Select type
    const typeSelect = page.locator('select').filter({ hasText: /Aniversário|Birthday/ }).or(
      page.locator('select[name*="type"]')
    ).first();
    await typeSelect.selectOption({ label: 'Aniversário' });
    console.log('  - Type: Aniversário');

    await page.screenshot({
      path: 'screenshots/client-test-1-special-date.png',
      fullPage: true
    });

    // Submit form
    console.log('💾 Submitting form...');
    const createButton = page.locator('button:has-text("Criar Cliente")');
    await createButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    await createButton.click();

    // Wait for modal to close (indicating success)
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'hidden', timeout: 15000 });
    console.log('✅ Modal closed - Client created successfully');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify client appears in list
    const clientInList = page.locator('text=João Silva Teste');
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "João Silva Teste" visible in list');

    // Take screenshot of final state
    await page.screenshot({
      path: 'screenshots/client-test-1-final.png',
      fullPage: true
    });

    console.log('\n✅ TEST 1 COMPLETED SUCCESSFULLY\n');
  });

  test('Test 2: Create Pessoa Jurídica Client with Related Person and Special Date', async ({ page }) => {
    console.log('\n=== TEST 2: PESSOA JURÍDICA CLIENT ===\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000); // Wait for page to fully render
    console.log('📍 Navigated to Clients section');

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');

    // Wait for modal to open by checking for the modal heading
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'visible', timeout: 10000 });
    console.log('✅ Modal opened');

    // Wait for modal to be fully visible
    await page.waitForTimeout(1000);

    // Select "Pessoa Jurídica" - click the radio button
    const pessoaJuridicaRadio = page.locator('input[type="radio"][value="juridica"], input[type="radio"]:near(:text("Pessoa Jurídica"))').last();
    await pessoaJuridicaRadio.check();
    await page.waitForTimeout(500);
    console.log('✅ Selected Pessoa Jurídica');

    // Fill form fields
    console.log('📝 Filling form fields...');

    // Scroll modal to ensure all fields are visible
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollTop = 0;
    });

    // Razão Social (use ID)
    await page.fill('input#name, input[placeholder="Empresa LTDA"]', 'Test Company Brasil Ltda');
    console.log('  - Razão Social: Test Company Brasil Ltda');

    // Scroll down slightly to ensure fields are visible
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollTop = 100;
    });
    await page.waitForTimeout(300);

    // Email (use ID)
    await page.fill('input#email', 'company@test.com');
    console.log('  - Email: company@test.com');

    // CNPJ (the field is cpfCnpj)
    await page.fill('input#cpfCnpj', '12345678000190');
    console.log('  - CNPJ: 12345678000190');

    // Telefone (use ID)
    await page.fill('input#phone', '1133333333');
    console.log('  - Telefone: 1133333333');

    // Contact Method Value - use the "Valor" placeholder under "Métodos de Contato"
    const valorInput = page.locator('input[placeholder="Valor"]').first();
    if (await valorInput.isVisible()) {
      await valorInput.fill('1133333333');
      console.log('  - Contact Method Value: 1133333333');
    }

    // Take screenshot after filling basic info
    await page.screenshot({
      path: 'screenshots/client-test-2-basic-info.png',
      fullPage: true
    });

    // Add Related Person
    console.log('👥 Adding Related Person...');
    const addRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")');
    await addRelatedPersonButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addRelatedPersonButton.click();
    await page.waitForTimeout(1000);

    // Fill related person fields
    await page.fill('input[placeholder="Nome da pessoa relacionada"]', 'João Manager');
    console.log('  - Name: João Manager');

    // Select relationship (other)
    const relationshipSelect = page.locator('select').filter({ hasText: /Outro|Other/ }).or(
      page.locator('select[name*="relationship"]')
    ).first();
    await relationshipSelect.selectOption({ label: 'Outro' });
    console.log('  - Relationship: Outro');

    await page.screenshot({
      path: 'screenshots/client-test-2-related-person.png',
      fullPage: true
    });

    // Add Special Date
    console.log('📅 Adding Special Date...');
    const addSpecialDateButton = page.locator('button:has-text("Adicionar Data")');
    await addSpecialDateButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addSpecialDateButton.click();
    await page.waitForTimeout(1000);

    // Fill special date fields
    await page.fill('input[type="date"]', '2025-06-15');
    console.log('  - Date: 2025-06-15');

    await page.fill('input[placeholder*="descrição"], input[placeholder*="Descrição"]', 'Fundação');
    console.log('  - Description: Fundação');

    // Select type (custom)
    const typeSelect = page.locator('select').filter({ hasText: /Outro|Custom/ }).or(
      page.locator('select[name*="type"]')
    ).last();
    await typeSelect.selectOption({ label: 'Outro' });
    console.log('  - Type: Outro');

    await page.screenshot({
      path: 'screenshots/client-test-2-special-date.png',
      fullPage: true
    });

    // Submit form
    console.log('💾 Submitting form...');
    const createButton = page.locator('button:has-text("Criar Cliente")');
    await createButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    await createButton.click();

    // Wait for modal to close (indicating success)
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'hidden', timeout: 15000 });
    console.log('✅ Modal closed - Client created successfully');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify client appears in list
    const clientInList = page.locator('text=Test Company Brasil Ltda');
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "Test Company Brasil Ltda" visible in list');

    // Take screenshot of final state showing both clients
    await page.screenshot({
      path: 'screenshots/client-test-2-final-both-clients.png',
      fullPage: true
    });

    // Verify both clients are visible
    const pessoaFisicaClient = page.locator('text=João Silva Teste');
    const pessoaJuridicaClient = page.locator('text=Test Company Brasil Ltda');

    await expect(pessoaFisicaClient).toBeVisible();
    await expect(pessoaJuridicaClient).toBeVisible();
    console.log('✅ Both clients (Pessoa Física and Pessoa Jurídica) visible in list');

    console.log('\n✅ TEST 2 COMPLETED SUCCESSFULLY\n');
  });

  test('Test 3: Verify Client Data Persistence', async ({ page }) => {
    console.log('\n=== TEST 3: DATA PERSISTENCE VERIFICATION ===\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000); // Wait for page to fully render
    console.log('📍 Navigated to Clients section');

    // Verify both clients exist
    const pessoaFisicaClient = page.locator('text=João Silva Teste');
    const pessoaJuridicaClient = page.locator('text=Test Company Brasil Ltda');

    await expect(pessoaFisicaClient).toBeVisible({ timeout: 10000 });
    await expect(pessoaJuridicaClient).toBeVisible({ timeout: 10000 });
    console.log('✅ Both clients persistent after page reload');

    // Take final screenshot
    await page.screenshot({
      path: 'screenshots/client-test-3-persistence-verified.png',
      fullPage: true
    });

    console.log('\n✅ TEST 3 COMPLETED SUCCESSFULLY\n');
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉\n');
  });
});
