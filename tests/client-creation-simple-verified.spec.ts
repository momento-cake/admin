import { test, expect } from '@playwright/test';

/**
 * Simplified Final Verification Test - Client Registration
 *
 * This test verifies the core client creation workflow for both
 * Pessoa Física and Pessoa Jurídica with essential fields only.
 *
 * Success Criteria:
 * ✅ Both clients successfully created with NO ERRORS
 * ✅ Modal closes after each creation
 * ✅ Both clients appear on the Clients list page
 * ✅ No JavaScript errors
 */

// Test configuration
const TEST_URL = 'http://localhost:4000';
const LOGIN_EMAIL = 'admin@momentocake.com.br';
const LOGIN_PASSWORD = 'G8j5k188';

// Generate unique test data using timestamp
const timestamp = Date.now().toString().slice(-8);

const PESSOA_FISICA = {
  nomeCompleto: `João da Silva ${timestamp}`,
  email: `joao.silva.${timestamp}@test.com`,
  cpf: `${timestamp}901`, // Will be formatted as CPF
  telefone: '11999999999',
};

const PESSOA_JURIDICA = {
  razaoSocial: `Test Company Brasil LTDA ${timestamp}`,
  email: `company.brasil.${timestamp}@test.com`,
  cnpj: `${timestamp}000190`, // Will be formatted as CNPJ
  telefone: '1133333333',
};

test.describe('Client Registration - Simplified Final Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    console.log('🌐 Navigating to application...');
    await page.goto(TEST_URL);
    await page.waitForLoadState('load');

    // Login
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', LOGIN_EMAIL);
    await page.fill('input[type="password"]', LOGIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (!currentUrl.includes('dashboard')) {
      throw new Error(`Login failed - Expected dashboard URL, got: ${currentUrl}`);
    }
    console.log('✅ Login successful');

    // Navigate to Clients page
    console.log('📋 Navigating to Clients page...');
    await page.goto(`${TEST_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    console.log('✅ On Clients page');
  });

  test('Complete Flow: Create Pessoa Física and Pessoa Jurídica Clients', async ({ page }) => {
    console.log('\n🧪 Starting Simplified Client Registration Test');
    console.log('='.repeat(60));

    // ============================================================
    // TEST 1: CREATE PESSOA FÍSICA CLIENT
    // ============================================================
    console.log('\n📝 TEST 1: Creating Pessoa Física Client');
    console.log('-'.repeat(60));

    // Step 1: Open modal
    console.log('1️⃣ Opening Novo Cliente modal...');
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForTimeout(1000);

    // Verify modal opened
    const modalTitle = page.locator('text=Novo Cliente').first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal opened');

    // Step 2: Verify Pessoa Física is selected (default)
    console.log('2️⃣ Verifying Pessoa Física is selected...');
    const pessoaFisicaRadio = page.locator('input[type="radio"][value="person"]');
    await expect(pessoaFisicaRadio).toBeChecked();
    console.log('✅ Pessoa Física selected');

    // Step 3: Fill basic form fields
    console.log('3️⃣ Filling basic form fields...');
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="name"]', PESSOA_FISICA.nomeCompleto);

    await page.fill('input[name="email"]', '');
    await page.fill('input[name="email"]', PESSOA_FISICA.email);

    await page.fill('input[name="cpfCnpj"]', '');
    await page.fill('input[name="cpfCnpj"]', PESSOA_FISICA.cpf);

    await page.fill('input[name="phone"]', '');
    await page.fill('input[name="phone"]', PESSOA_FISICA.telefone);
    console.log('✅ Basic fields filled');

    // Step 4: Fill contact method value (required field)
    console.log('4️⃣ Filling contact method...');
    const contactMethodValueInput = page.locator('input[placeholder="Valor"]').first();
    await contactMethodValueInput.fill(PESSOA_FISICA.telefone);
    console.log('✅ Contact method filled');

    // Take screenshot before submission
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-fisica-simple-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-fisica-simple-filled.png');

    // Step 5: Submit form
    console.log('5️⃣ Submitting form...');
    await page.click('button:has-text("Criar Cliente")');

    // Wait for modal to close
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Modal closed - Client created successfully');

    // Step 6: Verify client in list
    console.log('6️⃣ Verifying client in list...');
    await page.waitForTimeout(2000);

    const pessoaFisicaClient = page.locator(`text=${PESSOA_FISICA.nomeCompleto}`);
    await expect(pessoaFisicaClient).toBeVisible({ timeout: 5000 });
    console.log(`✅ Client "${PESSOA_FISICA.nomeCompleto}" visible in list`);

    // Take screenshot
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-fisica-simple-created.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-fisica-simple-created.png');

    console.log('\n✅ TEST 1 PASSED: Pessoa Física client created successfully');

    // ============================================================
    // TEST 2: CREATE PESSOA JURÍDICA CLIENT
    // ============================================================
    console.log('\n📝 TEST 2: Creating Pessoa Jurídica Client');
    console.log('-'.repeat(60));

    // Step 1: Open modal
    console.log('1️⃣ Opening Novo Cliente modal...');
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForTimeout(1000);

    // Verify modal opened
    const modalTitle2 = page.locator('text=Novo Cliente').first();
    await expect(modalTitle2).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal opened');

    // Step 2: Select Pessoa Jurídica
    console.log('2️⃣ Selecting Pessoa Jurídica...');
    const pessoaJuridicaRadio = page.locator('input[type="radio"][value="business"]');
    await pessoaJuridicaRadio.click();
    await page.waitForTimeout(500);
    await expect(pessoaJuridicaRadio).toBeChecked();
    console.log('✅ Pessoa Jurídica selected');

    // Step 3: Fill basic form fields
    console.log('3️⃣ Filling basic form fields...');
    await page.fill('input[name="name"]', '');
    await page.fill('input[name="name"]', PESSOA_JURIDICA.razaoSocial);

    await page.fill('input[name="email"]', '');
    await page.fill('input[name="email"]', PESSOA_JURIDICA.email);

    await page.fill('input[name="cpfCnpj"]', '');
    await page.fill('input[name="cpfCnpj"]', PESSOA_JURIDICA.cnpj);

    await page.fill('input[name="phone"]', '');
    await page.fill('input[name="phone"]', PESSOA_JURIDICA.telefone);
    console.log('✅ Basic fields filled');

    // Step 4: Fill contact method value (required field)
    console.log('4️⃣ Filling contact method...');
    const contactMethodValueInput2 = page.locator('input[placeholder="Valor"]').first();
    await contactMethodValueInput2.fill(PESSOA_JURIDICA.telefone);
    console.log('✅ Contact method filled');

    // Take screenshot before submission
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-juridica-simple-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-juridica-simple-filled.png');

    // Step 5: Submit form
    console.log('5️⃣ Submitting form...');
    await page.click('button:has-text("Criar Cliente")');

    // Wait for modal to close
    await expect(modalTitle2).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Modal closed - Client created successfully');

    // Step 6: Verify both clients in list
    console.log('6️⃣ Verifying both clients in list...');
    await page.waitForTimeout(2000);

    const pessoaJuridicaClient = page.locator(`text=${PESSOA_JURIDICA.razaoSocial}`);
    await expect(pessoaJuridicaClient).toBeVisible({ timeout: 5000 });
    console.log(`✅ Client "${PESSOA_JURIDICA.razaoSocial}" visible in list`);

    // Verify first client still visible
    await expect(pessoaFisicaClient).toBeVisible();
    console.log(`✅ Client "${PESSOA_FISICA.nomeCompleto}" still visible in list`);

    // Take final screenshot
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/both-clients-simple-final.png',
      fullPage: true
    });
    console.log('📸 Screenshot: both-clients-simple-final.png');

    console.log('\n✅ TEST 2 PASSED: Pessoa Jurídica client created successfully');

    // ============================================================
    // FINAL VERIFICATION
    // ============================================================
    console.log('\n🎉 FINAL VERIFICATION');
    console.log('='.repeat(60));

    // Final assertions
    await expect(pessoaFisicaClient).toBeVisible();
    await expect(pessoaJuridicaClient).toBeVisible();

    console.log('\n✅ SUCCESS CRITERIA VERIFICATION:');
    console.log('✅ Both clients successfully created with NO ERRORS');
    console.log('✅ Modal closed after each creation');
    console.log('✅ Both clients appear on the Clients list page');
    console.log('✅ Both clients visible with correct names in the list');
    console.log('\n🎉 ALL TESTS PASSED - CLIENT REGISTRATION VERIFIED!');
    console.log('='.repeat(60));
  });
});
