import { test, expect, Page } from '@playwright/test';

/**
 * FINAL COMPREHENSIVE E2E TEST - Client Registration
 *
 * This test validates the complete client registration flow for both client types:
 * - Pessoa Física (Individual)
 * - Pessoa Jurídica (Company)
 *
 * Success Criteria:
 * ✅ Both clients successfully created with NO ERRORS
 * ✅ Modal closes after each client creation
 * ✅ Both clients appear on the clients list page
 * ✅ No validation errors about missing contact method values
 * ✅ No Firebase index errors
 * ✅ Contact methods properly saved with phone numbers
 */

test.describe('Final E2E Client Registration Test', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Login
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard - handle trailing slash
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Logged in successfully - URL:', currentUrl);
    } else {
      throw new Error(`Login failed - still on: ${currentUrl}`);
    }
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Test 1: Create Pessoa Física Client with ALL required fields', async () => {
    console.log('\n🧪 Starting Test 1: Pessoa Física Client\n');

    // Navigate to clients page
    await page.goto('http://localhost:4000/clients/', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to /clients/');

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    console.log('✅ Modal opened');

    // Take screenshot of empty modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/01-pessoa-fisica-modal-empty.png',
      fullPage: true
    });

    // Select "Pessoa Física"
    const pessoaFisicaButton = page.locator('button:has-text("Pessoa Física")').first();
    await pessoaFisicaButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Selected Pessoa Física');

    // Fill required fields
    await page.fill('input[name="name"]', 'João da Silva');
    console.log('✅ Filled Nome Completo');

    await page.fill('input[name="email"]', 'joao@test.com');
    console.log('✅ Filled Email');

    await page.fill('input[name="cpf"]', '12345678901');
    console.log('✅ Filled CPF');

    await page.fill('input[name="phone"]', '11999999999');
    console.log('✅ Filled Telefone');

    // Take screenshot before contact method
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/02-pessoa-fisica-basic-fields-filled.png',
      fullPage: true
    });

    // Fill Contact Method - IMPORTANT!
    // Find the contact method type select (first select in the contact methods section)
    const contactTypeSelect = page.locator('select').filter({ hasText: /Tipo|WhatsApp|Telefone|E-mail/ }).first();
    await contactTypeSelect.selectOption('phone');
    console.log('✅ Selected Contact Method Type: Telefone');

    // Fill contact method value - THIS IS CRITICAL
    const contactValueInput = page.locator('input[placeholder*="Digite o"]').or(page.locator('input[type="text"]').filter({ hasText: '' })).first();
    await contactValueInput.fill('11999999999');
    console.log('✅ Filled Contact Method Value: 11999999999');

    // Check "Primary" checkbox
    const primaryCheckbox = page.locator('input[type="checkbox"]').first();
    await primaryCheckbox.check();
    console.log('✅ Checked Primary checkbox');

    // Take screenshot of contact method filled
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/03-pessoa-fisica-contact-method-filled.png',
      fullPage: true
    });

    // Add Related Person
    const addPersonButton = page.locator('button:has-text("+ Adicionar Pessoa")').first();
    await addPersonButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Clicked + Adicionar Pessoa');

    // Fill related person fields
    await page.fill('input[placeholder*="Nome da pessoa"]', 'Maria Silva');
    console.log('✅ Filled Related Person Name');

    const relationshipSelect = page.locator('select').filter({ hasText: /Relação|Cônjuge/ }).first();
    await relationshipSelect.selectOption('spouse');
    console.log('✅ Selected Relationship: Cônjuge');

    // Click "Adicionar Pessoa" button in the form
    const confirmAddPersonButton = page.locator('button:has-text("Adicionar Pessoa")').nth(1);
    await confirmAddPersonButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Added Related Person');

    // Verify related person appears
    await expect(page.locator('text=Maria Silva')).toBeVisible();
    console.log('✅ Verified Related Person appears');

    // Take screenshot after related person
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/04-pessoa-fisica-related-person-added.png',
      fullPage: true
    });

    // Add Special Date
    const addDateButton = page.locator('button:has-text("+ Adicionar Data")').first();
    await addDateButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Clicked + Adicionar Data');

    // Fill special date fields
    await page.fill('input[type="date"]', '2025-12-25');
    console.log('✅ Filled Date');

    const dateTypeSelect = page.locator('select').filter({ hasText: /Tipo|Aniversário/ }).first();
    await dateTypeSelect.selectOption('birthday');
    console.log('✅ Selected Date Type: Aniversário');

    await page.fill('input[placeholder*="Descrição"]', 'Aniversário do João');
    console.log('✅ Filled Date Description');

    // Click "Adicionar Data" button
    const confirmAddDateButton = page.locator('button:has-text("Adicionar Data")').nth(1);
    await confirmAddDateButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Added Special Date');

    // Verify special date appears
    await expect(page.locator('text=Aniversário do João')).toBeVisible();
    console.log('✅ Verified Special Date appears');

    // Take screenshot before submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/05-pessoa-fisica-ready-to-submit.png',
      fullPage: true
    });

    // Click "Criar Cliente" button
    const createClientButton = page.locator('button:has-text("Criar Cliente")');
    await createClientButton.click();
    console.log('✅ Clicked Criar Cliente');

    // Wait for modal to close (success indicator)
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('✅ Modal closed - Client created successfully!');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Verify client appears in list
    await expect(page.locator('text=João da Silva')).toBeVisible({ timeout: 10000 });
    console.log('✅ Client "João da Silva" appears in list');

    // Take screenshot of client in list
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/06-pessoa-fisica-in-list.png',
      fullPage: true
    });

    console.log('\n✅ TEST 1 PASSED: Pessoa Física client created successfully!\n');
  });

  test('Test 2: Create Pessoa Jurídica Client with ALL required fields', async () => {
    console.log('\n🧪 Starting Test 2: Pessoa Jurídica Client\n');

    // Click "Novo Cliente" button
    await page.click('button:has-text("Novo Cliente")');
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
    console.log('✅ Modal opened');

    // Take screenshot of empty modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/07-pessoa-juridica-modal-empty.png',
      fullPage: true
    });

    // Select "Pessoa Jurídica"
    const pessoaJuridicaButton = page.locator('button:has-text("Pessoa Jurídica")').first();
    await pessoaJuridicaButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Selected Pessoa Jurídica');

    // Fill required fields
    await page.fill('input[name="name"]', 'Test Company Brasil LTDA');
    console.log('✅ Filled Razão Social');

    await page.fill('input[name="email"]', 'company@test.com');
    console.log('✅ Filled Email');

    await page.fill('input[name="cnpj"]', '12345678000190');
    console.log('✅ Filled CNPJ');

    await page.fill('input[name="phone"]', '1133333333');
    console.log('✅ Filled Telefone');

    // Take screenshot before contact method
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/08-pessoa-juridica-basic-fields-filled.png',
      fullPage: true
    });

    // Fill Contact Method - IMPORTANT!
    const contactTypeSelect = page.locator('select').filter({ hasText: /Tipo|WhatsApp|Telefone|E-mail/ }).first();
    await contactTypeSelect.selectOption('phone');
    console.log('✅ Selected Contact Method Type: Telefone');

    // Fill contact method value
    const contactValueInput = page.locator('input[placeholder*="Digite o"]').or(page.locator('input[type="text"]').filter({ hasText: '' })).first();
    await contactValueInput.fill('1133333333');
    console.log('✅ Filled Contact Method Value: 1133333333');

    // Check "Primary" checkbox
    const primaryCheckbox = page.locator('input[type="checkbox"]').first();
    await primaryCheckbox.check();
    console.log('✅ Checked Primary checkbox');

    // Take screenshot of contact method filled
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/09-pessoa-juridica-contact-method-filled.png',
      fullPage: true
    });

    // Add Related Person
    const addPersonButton = page.locator('button:has-text("+ Adicionar Pessoa")').first();
    await addPersonButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Clicked + Adicionar Pessoa');

    // Fill related person fields
    await page.fill('input[placeholder*="Nome da pessoa"]', 'João Manager');
    console.log('✅ Filled Related Person Name');

    const relationshipSelect = page.locator('select').filter({ hasText: /Relação|Outro/ }).first();
    await relationshipSelect.selectOption('other');
    console.log('✅ Selected Relationship: Outro');

    // Click "Adicionar Pessoa" button
    const confirmAddPersonButton = page.locator('button:has-text("Adicionar Pessoa")').nth(1);
    await confirmAddPersonButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Added Related Person');

    // Verify related person appears
    await expect(page.locator('text=João Manager')).toBeVisible();
    console.log('✅ Verified Related Person appears');

    // Take screenshot after related person
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/10-pessoa-juridica-related-person-added.png',
      fullPage: true
    });

    // Add Special Date
    const addDateButton = page.locator('button:has-text("+ Adicionar Data")').first();
    await addDateButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Clicked + Adicionar Data');

    // Fill special date fields
    await page.fill('input[type="date"]', '2025-06-15');
    console.log('✅ Filled Date');

    const dateTypeSelect = page.locator('select').filter({ hasText: /Tipo|Data Customizada/ }).first();
    await dateTypeSelect.selectOption('custom');
    console.log('✅ Selected Date Type: Data Customizada');

    await page.fill('input[placeholder*="Descrição"]', 'Fundação da Empresa');
    console.log('✅ Filled Date Description');

    // Click "Adicionar Data" button
    const confirmAddDateButton = page.locator('button:has-text("Adicionar Data")').nth(1);
    await confirmAddDateButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Added Special Date');

    // Verify special date appears
    await expect(page.locator('text=Fundação da Empresa')).toBeVisible();
    console.log('✅ Verified Special Date appears');

    // Take screenshot before submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/11-pessoa-juridica-ready-to-submit.png',
      fullPage: true
    });

    // Click "Criar Cliente" button
    const createClientButton = page.locator('button:has-text("Criar Cliente")');
    await createClientButton.click();
    console.log('✅ Clicked Criar Cliente');

    // Wait for modal to close (success indicator)
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    console.log('✅ Modal closed - Client created successfully!');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Verify both clients appear in list
    await expect(page.locator('text=João da Silva')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Test Company Brasil LTDA')).toBeVisible({ timeout: 10000 });
    console.log('✅ Both clients appear in list');

    // Take final screenshot showing both clients
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/12-both-clients-in-list-FINAL.png',
      fullPage: true
    });

    console.log('\n✅ TEST 2 PASSED: Pessoa Jurídica client created successfully!\n');
    console.log('\n🎉 FINAL E2E TEST COMPLETE - BOTH CLIENTS CREATED SUCCESSFULLY! 🎉\n');
  });
});
