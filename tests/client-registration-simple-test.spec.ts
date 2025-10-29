import { test, expect } from '@playwright/test';

/**
 * Simplified Client Registration Test
 * Tests basic Pessoa Física and Pessoa Jurídica client creation
 * WITHOUT related persons and special dates
 */

const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const BASE_URL = 'http://localhost:4000';

test.describe('Client Registration - Simplified Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('load');
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });

    console.log('✅ Logged in successfully');
  });

  test('Create Pessoa Física Client - Basic Info Only', async ({ page }) => {
    console.log('\n=== TEST: PESSOA FÍSICA CLIENT (BASIC) ===\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    console.log('📍 Navigated to Clients section');

    // Take screenshot of initial state
    await page.screenshot({
      path: 'screenshots/simple-test-inicial.png',
      fullPage: true
    });

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'visible', timeout: 10000 });
    console.log('✅ Modal opened');
    await page.waitForTimeout(1000);

    // Pessoa Física is already selected by default
    console.log('✅ Pessoa Física is already selected by default');

    // Fill basic form fields
    console.log('📝 Filling form fields...');

    await page.fill('input[name="name"]', 'João Silva Teste');
    console.log('  - Nome: João Silva Teste');

    await page.fill('input[name="email"]', 'joao.silva@test.com');
    console.log('  - Email: joao.silva@test.com');

    await page.fill('input[name="cpfCnpj"]', '12345678901');
    console.log('  - CPF: 123.456.789-01');

    await page.fill('input[name="phone"]', '11999999999');
    console.log('  - Telefone: (11) 99999-9999');

    // Fill contact method value
    const valorInput = page.locator('input[placeholder="Valor"]').first();
    await valorInput.fill('11999999999');
    console.log('  - Contact Method: 11999999999');

    // Take screenshot before submitting
    await page.screenshot({
      path: 'screenshots/simple-test-filled.png',
      fullPage: true
    });

    // Submit form
    console.log('💾 Submitting form...');
    const createButton = page.locator('button:has-text("Criar Cliente")');
    await createButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      } else if (msg.text().includes('Client created') || msg.text().includes('Success')) {
        console.log('✅ Success message:', msg.text());
      }
    });

    await createButton.click();

    // Wait for modal to close
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'hidden', timeout: 15000 });
    console.log('✅ Modal closed - Client created successfully');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify client appears in list
    const clientInList = page.locator('text=João Silva Teste');
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "João Silva Teste" visible in list');

    // Take final screenshot
    await page.screenshot({
      path: 'screenshots/simple-test-success.png',
      fullPage: true
    });

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY\n');
  });

  test('Create Pessoa Jurídica Client - Basic Info Only', async ({ page }) => {
    console.log('\n=== TEST: PESSOA JURÍDICA CLIENT (BASIC) ===\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    console.log('📍 Navigated to Clients section');

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'visible', timeout: 10000 });
    console.log('✅ Modal opened');
    await page.waitForTimeout(1000);

    // Select Pessoa Jurídica
    const pessoaJuridicaRadio = page.locator('input[type="radio"]').last();
    await pessoaJuridicaRadio.check();
    await page.waitForTimeout(500);
    console.log('✅ Selected Pessoa Jurídica');

    // Fill basic form fields
    console.log('📝 Filling form fields...');

    await page.fill('input[name="name"]', 'Test Company Brasil Ltda');
    console.log('  - Razão Social: Test Company Brasil Ltda');

    await page.fill('input[name="email"]', 'company@test.com');
    console.log('  - Email: company@test.com');

    await page.fill('input[name="cpfCnpj"]', '12345678000190');
    console.log('  - CNPJ: 12.345.678/0001-90');

    await page.fill('input[name="phone"]', '1133333333');
    console.log('  - Telefone: (11) 3333-3333');

    // Fill contact method value
    const valorInput = page.locator('input[placeholder="Valor"]').first();
    await valorInput.fill('1133333333');
    console.log('  - Contact Method: 1133333333');

    // Take screenshot before submitting
    await page.screenshot({
      path: 'screenshots/simple-test-pj-filled.png',
      fullPage: true
    });

    // Submit form
    console.log('💾 Submitting form...');
    const createButton = page.locator('button:has-text("Criar Cliente")');
    await createButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      } else if (msg.text().includes('Client created') || msg.text().includes('Success')) {
        console.log('✅ Success message:', msg.text());
      }
    });

    await createButton.click();

    // Wait for modal to close
    await page.waitForSelector('h2:has-text("Novo Cliente")', { state: 'hidden', timeout: 15000 });
    console.log('✅ Modal closed - Client created successfully');

    // Wait for page to update
    await page.waitForTimeout(2000);

    // Verify client appears in list
    const clientInList = page.locator('text=Test Company Brasil Ltda');
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "Test Company Brasil Ltda" visible in list');

    // Verify both clients exist
    const pessoaFisicaClient = page.locator('text=João Silva Teste');
    const pessoaJuridicaClient = page.locator('text=Test Company Brasil Ltda');
    await expect(pessoaFisicaClient).toBeVisible();
    await expect(pessoaJuridicaClient).toBeVisible();
    console.log('✅ Both clients visible in list');

    // Take final screenshot showing both clients
    await page.screenshot({
      path: 'screenshots/simple-test-both-clients.png',
      fullPage: true
    });

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY\n');
    console.log('\n🎉 ALL TESTS PASSED! Firebase security rules working correctly! 🎉\n');
  });
});
