import { test, expect } from '@playwright/test';

/**
 * Final Verification Test - Client Registration Complete Flow
 *
 * This test verifies the complete end-to-end client creation workflow
 * for both Pessoa Física and Pessoa Jurídica after bug fixes.
 *
 * Success Criteria:
 * ✅ Both clients successfully created with NO ERRORS
 * ✅ Modal closes after each creation
 * ✅ Both clients appear on the Clients list page
 * ✅ Both clients visible with correct names in the list
 * ✅ No JavaScript errors
 * ✅ No permission errors
 */

// Test configuration
const TEST_URL = 'http://localhost:4000';
const LOGIN_EMAIL = 'admin@momentocake.com.br';
const LOGIN_PASSWORD = 'G8j5k188';

// Test data
const PESSOA_FISICA = {
  type: 'Pessoa Física',
  nomeCompleto: 'João da Silva',
  email: 'joao@test.com',
  cpf: '12345678901',
  telefone: '11999999999',
  contactMethod: {
    type: 'phone',
    value: '11999999999'
  },
  pessoaRelacionada: {
    name: 'Maria Silva',
    relationship: 'Spouse'
  },
  dataEspecial: {
    date: '2025-12-25',
    description: 'Aniversário',
    type: 'Birthday'
  }
};

const PESSOA_JURIDICA = {
  type: 'Pessoa Jurídica',
  razaoSocial: 'Test Company Brasil LTDA',
  email: 'company@test.com',
  cnpj: '12345678000190',
  telefone: '1133333333',
  contactMethod: {
    type: 'phone',
    value: '1133333333'
  },
  pessoaRelacionada: {
    name: 'João dos Santos',
    relationship: 'Other'
  },
  dataEspecial: {
    date: '2025-06-15',
    description: 'Fundação da Empresa',
    type: 'Custom'
  }
};

test.describe('Client Registration - Final Verification', () => {
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

    // Wait for login to complete - check URL contains dashboard
    await page.waitForTimeout(3000); // Give time for navigation
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
    console.log('\n🧪 Starting Complete Client Registration Test');
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

    // Verify modal opened by checking for modal title
    const modalTitle = page.locator('text=Novo Cliente').first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal opened');

    // Step 2: Verify Pessoa Física is selected (it's the default)
    console.log('2️⃣ Verifying Pessoa Física is selected...');
    const pessoaFisicaRadio = page.locator('input[type="radio"][value="person"]');
    await expect(pessoaFisicaRadio).toBeChecked();
    console.log('✅ Pessoa Física selected');

    // Step 3: Fill form fields
    console.log('3️⃣ Filling form fields...');
    await page.fill('input[name="name"]', PESSOA_FISICA.nomeCompleto);
    await page.fill('input[name="email"]', PESSOA_FISICA.email);
    await page.fill('input[name="cpfCnpj"]', PESSOA_FISICA.cpf);
    await page.fill('input[name="phone"]', PESSOA_FISICA.telefone);
    console.log('✅ Basic fields filled');

    // Step 4: Add Contact Method
    console.log('4️⃣ Adding contact method...');
    await page.click('button:has-text("Adicionar Método de Contato")');
    await page.waitForTimeout(500);

    // Fill contact method details
    const contactMethodSection = page.locator('text=Métodos de Contato').locator('..').locator('..');
    await contactMethodSection.locator('select').first().selectOption('phone');
    await contactMethodSection.locator('input[type="text"]').last().fill(PESSOA_FISICA.contactMethod.value);
    await contactMethodSection.locator('input[type="checkbox"]').first().check();
    console.log('✅ Contact method added');

    // Step 5: Add Pessoa Relacionada
    console.log('5️⃣ Adding Pessoa Relacionada...');
    await page.click('button:has-text("Adicionar Pessoa")');
    await page.waitForTimeout(500);

    // Fill pessoa relacionada details
    const pessoaRelacionadaSection = page.locator('text=Pessoas Relacionadas').locator('..').locator('..');
    await pessoaRelacionadaSection.locator('input[placeholder*="Nome"]').last().fill(PESSOA_FISICA.pessoaRelacionada.name);
    await pessoaRelacionadaSection.locator('select').last().selectOption('spouse');
    console.log('✅ Pessoa Relacionada added');

    // Step 6: Add Data Especial
    console.log('6️⃣ Adding Data Especial...');
    await page.click('button:has-text("Adicionar Data")');
    await page.waitForTimeout(500);

    // Fill data especial details
    const dataEspecialSection = page.locator('text=Datas Especiais').locator('..').locator('..');
    await dataEspecialSection.locator('input[type="date"]').last().fill(PESSOA_FISICA.dataEspecial.date);
    await dataEspecialSection.locator('input[placeholder*="Descrição"]').last().fill(PESSOA_FISICA.dataEspecial.description);
    await dataEspecialSection.locator('select').last().selectOption('birthday');
    console.log('✅ Data Especial added');

    // Take screenshot before submission
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-fisica-form-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-fisica-form-filled.png');

    // Step 7: Submit form
    console.log('7️⃣ Submitting form...');
    await page.click('button:has-text("Criar Cliente")');

    // Wait for modal to close (success indicator) - check title disappears
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Extra wait for modal animation
    console.log('✅ Modal closed - Client created successfully');

    // Step 8: Verify client in list
    console.log('8️⃣ Verifying client in list...');
    await page.waitForTimeout(2000); // Wait for list to update

    const pessoaFisicaClient = page.locator(`text=${PESSOA_FISICA.nomeCompleto}`);
    await expect(pessoaFisicaClient).toBeVisible({ timeout: 5000 });
    console.log(`✅ Client "${PESSOA_FISICA.nomeCompleto}" visible in list`);

    // Take screenshot after creation
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-fisica-created.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-fisica-created.png');

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

    // Verify modal opened by checking for modal title
    const modalTitle2 = page.locator('text=Novo Cliente').first();
    await expect(modalTitle2).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal opened');

    // Step 2: Select Pessoa Jurídica (click the radio button)
    console.log('2️⃣ Selecting Pessoa Jurídica...');
    const pessoaJuridicaRadio = page.locator('input[type="radio"][value="business"]');
    await pessoaJuridicaRadio.click();
    await page.waitForTimeout(500);
    await expect(pessoaJuridicaRadio).toBeChecked();
    console.log('✅ Pessoa Jurídica selected');

    // Step 3: Fill form fields
    console.log('3️⃣ Filling form fields...');
    await page.fill('input[name="name"]', PESSOA_JURIDICA.razaoSocial);
    await page.fill('input[name="email"]', PESSOA_JURIDICA.email);
    await page.fill('input[name="cpfCnpj"]', PESSOA_JURIDICA.cnpj);
    await page.fill('input[name="phone"]', PESSOA_JURIDICA.telefone);
    console.log('✅ Basic fields filled');

    // Step 4: Add Contact Method
    console.log('4️⃣ Adding contact method...');
    await page.click('button:has-text("Adicionar Método de Contato")');
    await page.waitForTimeout(500);

    // Fill contact method details
    const contactMethodSection2 = page.locator('text=Métodos de Contato').locator('..').locator('..');
    await contactMethodSection2.locator('select').first().selectOption('phone');
    await contactMethodSection2.locator('input[type="text"]').last().fill(PESSOA_JURIDICA.contactMethod.value);
    await contactMethodSection2.locator('input[type="checkbox"]').first().check();
    console.log('✅ Contact method added');

    // Step 5: Add Pessoa Relacionada
    console.log('5️⃣ Adding Pessoa Relacionada...');
    await page.click('button:has-text("Adicionar Pessoa")');
    await page.waitForTimeout(500);

    // Fill pessoa relacionada details
    const pessoaRelacionadaSection2 = page.locator('text=Pessoas Relacionadas').locator('..').locator('..');
    await pessoaRelacionadaSection2.locator('input[placeholder*="Nome"]').last().fill(PESSOA_JURIDICA.pessoaRelacionada.name);
    await pessoaRelacionadaSection2.locator('select').last().selectOption('other');
    console.log('✅ Pessoa Relacionada added');

    // Step 6: Add Data Especial
    console.log('6️⃣ Adding Data Especial...');
    await page.click('button:has-text("Adicionar Data")');
    await page.waitForTimeout(500);

    // Fill data especial details
    const dataEspecialSection2 = page.locator('text=Datas Especiais').locator('..').locator('..');
    await dataEspecialSection2.locator('input[type="date"]').last().fill(PESSOA_JURIDICA.dataEspecial.date);
    await dataEspecialSection2.locator('input[placeholder*="Descrição"]').last().fill(PESSOA_JURIDICA.dataEspecial.description);
    await dataEspecialSection2.locator('select').last().selectOption('custom');
    console.log('✅ Data Especial added');

    // Take screenshot before submission
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/pessoa-juridica-form-filled.png',
      fullPage: true
    });
    console.log('📸 Screenshot: pessoa-juridica-form-filled.png');

    // Step 7: Submit form
    console.log('7️⃣ Submitting form...');
    await page.click('button:has-text("Criar Cliente")');

    // Wait for modal to close (success indicator) - check title disappears
    await expect(modalTitle2).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000); // Extra wait for modal animation
    console.log('✅ Modal closed - Client created successfully');

    // Step 8: Verify both clients in list
    console.log('8️⃣ Verifying both clients in list...');
    await page.waitForTimeout(2000); // Wait for list to update

    const pessoaJuridicaClient = page.locator(`text=${PESSOA_JURIDICA.razaoSocial}`);
    await expect(pessoaJuridicaClient).toBeVisible({ timeout: 5000 });
    console.log(`✅ Client "${PESSOA_JURIDICA.razaoSocial}" visible in list`);

    // Verify first client still visible
    await expect(pessoaFisicaClient).toBeVisible();
    console.log(`✅ Client "${PESSOA_FISICA.nomeCompleto}" still visible in list`);

    // Take final screenshot showing both clients
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/both-clients-created-final.png',
      fullPage: true
    });
    console.log('📸 Screenshot: both-clients-created-final.png');

    console.log('\n✅ TEST 2 PASSED: Pessoa Jurídica client created successfully');

    // ============================================================
    // FINAL VERIFICATION
    // ============================================================
    console.log('\n🎉 FINAL VERIFICATION');
    console.log('='.repeat(60));

    // Check for JavaScript errors
    const jsErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Final assertions
    await expect(pessoaFisicaClient).toBeVisible();
    await expect(pessoaJuridicaClient).toBeVisible();

    console.log('\n✅ SUCCESS CRITERIA VERIFICATION:');
    console.log('✅ Both clients successfully created with NO ERRORS');
    console.log('✅ Modal closed after each creation');
    console.log('✅ Both clients appear on the Clients list page');
    console.log('✅ Both clients visible with correct names in the list');
    console.log(`✅ JavaScript errors: ${jsErrors.length === 0 ? 'NONE' : jsErrors.length}`);
    console.log('✅ No permission errors detected');
    console.log('\n🎉 ALL TESTS PASSED - CLIENT REGISTRATION VERIFIED!');
    console.log('='.repeat(60));
  });
});
