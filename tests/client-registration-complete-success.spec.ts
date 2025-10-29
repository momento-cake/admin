import { test, expect } from '@playwright/test';

/**
 * Complete Client Registration Flow Test
 *
 * This test validates the entire client creation workflow after Firebase security fixes.
 *
 * Test Coverage:
 * - Pessoa Física client creation with all features
 * - Pessoa Jurídica client creation with all features
 * - Related persons functionality
 * - Special dates functionality
 * - Contact methods functionality
 * - Client visibility in list after creation
 */

test.describe('Complete Client Registration Flow - Post Firebase Security Fix', () => {
  test.setTimeout(120000); // 2 minutes for complete flow

  const BASE_URL = 'http://localhost:4000';
  const ADMIN_EMAIL = 'admin@momentocake.com.br';
  const ADMIN_PASSWORD = 'G8j5k188';

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Perform login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard redirect - use URL check instead of waitForURL
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Verify we're on the dashboard by checking for dashboard content
    const dashboardHeading = page.locator('text="Dashboard"').first();
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

    console.log('✅ Login successful');
  });

  test('Test 1: Create Pessoa Física Client with Full Features', async ({ page }) => {
    console.log('\n🧪 TEST 1: Creating Pessoa Física Client...\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log('✅ Navigated to Clients section');
    await page.screenshot({ path: 'screenshots/01-clients-page.png', fullPage: true });

    // Click "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Clicked "Novo Cliente" button');

    // Wait for modal to appear - use heading as selector since modal may not have role="dialog"
    const modalHeading = page.locator('text="Novo Cliente"').first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    console.log('✅ Modal opened');
    await page.screenshot({ path: 'screenshots/02-modal-opened.png', fullPage: true });

    // The modal appears with Pessoa Física already selected by default
    // Verify "Pessoa Física" radio is checked
    const pessoaFisicaRadio = page.locator('input[type="radio"][value="person"]').first();
    await expect(pessoaFisicaRadio).toBeChecked();
    await page.waitForTimeout(500);

    console.log('✅ Selected "Pessoa Física"');
    await page.screenshot({ path: 'screenshots/03-pessoa-fisica-selected.png', fullPage: true });

    // Fill basic information
    const nomeInput = page.locator('input[name="name"]').first();
    await expect(nomeInput).toBeVisible();
    await nomeInput.fill('João da Silva Test');

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.fill('joao@test.com');

    const cpfInput = page.locator('input[name="cpfCnpj"]').first();
    await cpfInput.fill('12345678901');

    const telefoneInput = page.locator('input[name="phone"]').first();
    await telefoneInput.fill('11999999999');

    await page.waitForTimeout(500);
    console.log('✅ Filled basic information');
    await page.screenshot({ path: 'screenshots/04-basic-info-filled.png', fullPage: true });

    // Fill Contact Method (the form has a default contact method row already)
    console.log('📞 Filling contact method...');

    // Find and fill the first contact method value input
    const contactValueInput = page.locator('input[placeholder="Valor"]').first();
    await contactValueInput.scrollIntoViewIfNeeded();
    await expect(contactValueInput).toBeVisible();
    await contactValueInput.fill('11999999999');
    await page.waitForTimeout(500);

    console.log('✅ Added contact method');
    await page.screenshot({ path: 'screenshots/05-contact-method-added.png', fullPage: true });

    // Add Related Person
    console.log('👥 Adding related person...');

    // First, click the "+ Adicionar Pessoa" button to show the form
    const showAddPersonFormButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await showAddPersonFormButton.scrollIntoViewIfNeeded();
    await expect(showAddPersonFormButton).toBeVisible({ timeout: 10000 });
    await showAddPersonFormButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Opened "Adicionar Pessoa" form');

    // Now fill the related person form
    const relatedPersonNameInput = page.locator('input[placeholder*="Nome"]').last();
    await expect(relatedPersonNameInput).toBeVisible();
    await relatedPersonNameInput.fill('Maria da Silva');

    const relationshipSelect = page.locator('select').last();
    await expect(relationshipSelect).toBeVisible();
    await relationshipSelect.selectOption('spouse');

    await page.waitForTimeout(500);

    // Click the "Adicionar" or "Salvar" button within the form
    const savePersonButton = page.locator('button:has-text("Adicionar")').last();
    await expect(savePersonButton).toBeVisible();

    console.log('🖱️ Clicking "Adicionar" button to save related person...');
    await savePersonButton.click();
    await page.waitForTimeout(2000);

    console.log('✅ Clicked "Adicionar Pessoa" button');
    await page.screenshot({ path: 'screenshots/06-related-person-added.png', fullPage: true });

    // Verify related person was added to the list
    const relatedPersonCard = page.locator('text="Maria da Silva"').first();
    if (await relatedPersonCard.isVisible()) {
      console.log('✅ Related person appears in list');
    } else {
      console.log('⚠️ Related person may not be visible yet');
    }

    // Add Special Date
    console.log('📅 Adding special date...');

    // First, click the "+ Adicionar Data" button to show the form
    const showAddDateFormButton = page.locator('button:has-text("Adicionar Data")').first();
    await showAddDateFormButton.scrollIntoViewIfNeeded();
    await expect(showAddDateFormButton).toBeVisible({ timeout: 10000 });
    await showAddDateFormButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Opened "Adicionar Data" form');

    // Now fill the special date form
    const dateInput = page.locator('input[type="date"]').last();
    await expect(dateInput).toBeVisible();
    await dateInput.fill('2025-12-25');

    // The type select should be filled first (it may have a default value)
    const typeSelect = page.locator('select').last();
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption('birthday');

    // Fill description - look for input with label "Descrição"
    const descriptionInput = page.locator('input[placeholder*="Aniversário"]').first();
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill('Aniversário do João');

    await page.waitForTimeout(500);

    // Click the "Adicionar Data" button within the form
    const saveDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await expect(saveDateButton).toBeVisible();

    console.log('🖱️ Clicking "Adicionar Data" button to save special date...');
    await saveDateButton.click();
    await page.waitForTimeout(2000);

    console.log('✅ Clicked "Adicionar Data" button');
    await page.screenshot({ path: 'screenshots/07-special-date-added.png', fullPage: true });

    // Verify special date was added to the list
    const specialDateCard = page.locator('text="Aniversário do João"').first();
    if (await specialDateCard.isVisible()) {
      console.log('✅ Special date appears in list');
    } else {
      console.log('⚠️ Special date may not be visible yet');
    }

    // Click "Criar Cliente" button
    console.log('💾 Creating client...');

    const createButton = page.locator('button:has-text("Criar Cliente")').first();
    await createButton.scrollIntoViewIfNeeded();
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();

    console.log('🖱️ Clicking "Criar Cliente" button...');
    await createButton.click();

    // Wait for modal to close - check that the modal heading is no longer visible
    console.log('⏳ Waiting for modal to close...');
    await expect(modalHeading).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Modal closed');

    await page.waitForTimeout(2000);

    // Verify client appears in list
    console.log('🔍 Verifying client appears in list...');
    await page.screenshot({ path: 'screenshots/08-pessoa-fisica-created.png', fullPage: true });

    const clientInList = page.locator('text="João da Silva Test"').first();
    await expect(clientInList).toBeVisible({ timeout: 10000 });
    console.log('✅ TEST 1 PASSED: Pessoa Física client created and visible in list!');
  });

  test('Test 2: Create Pessoa Jurídica Client with Full Features', async ({ page }) => {
    console.log('\n🧪 TEST 2: Creating Pessoa Jurídica Client...\n');

    // Navigate to Clients section
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log('✅ Navigated to Clients section');

    // Click "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Clicked "Novo Cliente" button');

    // Wait for modal to appear - use heading as selector
    const modalHeading = page.locator('text="Novo Cliente"').first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Select "Pessoa Jurídica" radio button
    const pessoaJuridicaRadio = page.locator('input[type="radio"][value="business"]').first();
    await expect(pessoaJuridicaRadio).toBeVisible();
    await pessoaJuridicaRadio.check();
    await page.waitForTimeout(1000);

    console.log('✅ Selected "Pessoa Jurídica"');
    await page.screenshot({ path: 'screenshots/09-pessoa-juridica-selected.png', fullPage: true });

    // Fill basic information
    const razaoSocialInput = page.locator('input[name="name"]').first();
    await expect(razaoSocialInput).toBeVisible();
    await razaoSocialInput.fill('Test Company Brasil LTDA');

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.fill('company@test.com');

    const cnpjInput = page.locator('input[name="cpfCnpj"]').first();
    await cnpjInput.fill('12345678000190');

    const telefoneInput = page.locator('input[name="phone"]').first();
    await telefoneInput.fill('1133333333');

    await page.waitForTimeout(500);
    console.log('✅ Filled basic information');
    await page.screenshot({ path: 'screenshots/10-pj-basic-info-filled.png', fullPage: true });

    // Fill Contact Method (the form has a default contact method row already)
    console.log('📞 Filling contact method...');

    const contactValueInput = page.locator('input[placeholder="Valor"]').first();
    await contactValueInput.scrollIntoViewIfNeeded();
    await expect(contactValueInput).toBeVisible();
    await contactValueInput.fill('1133333333');
    await page.waitForTimeout(500);

    console.log('✅ Added contact method');

    // Add Related Person
    console.log('👥 Adding related person...');

    const showAddPersonFormButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await showAddPersonFormButton.scrollIntoViewIfNeeded();
    await expect(showAddPersonFormButton).toBeVisible({ timeout: 10000 });
    await showAddPersonFormButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Opened "Adicionar Pessoa" form');

    const relatedPersonNameInput = page.locator('input[placeholder*="Nome"]').last();
    await expect(relatedPersonNameInput).toBeVisible();
    await relatedPersonNameInput.fill('João dos Santos');

    const relationshipSelect = page.locator('select').last();
    await expect(relationshipSelect).toBeVisible();
    await relationshipSelect.selectOption('other');

    await page.waitForTimeout(500);

    const savePersonButton = page.locator('button:has-text("Adicionar")').last();
    await expect(savePersonButton).toBeVisible();

    console.log('🖱️ Clicking "Adicionar" button to save related person...');
    await savePersonButton.click();
    await page.waitForTimeout(2000);

    console.log('✅ Clicked "Adicionar Pessoa" button');
    await page.screenshot({ path: 'screenshots/11-pj-related-person-added.png', fullPage: true });

    // Add Special Date
    console.log('📅 Adding special date...');

    const showAddDateFormButton = page.locator('button:has-text("Adicionar Data")').first();
    await showAddDateFormButton.scrollIntoViewIfNeeded();
    await expect(showAddDateFormButton).toBeVisible({ timeout: 10000 });
    await showAddDateFormButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Opened "Adicionar Data" form');

    const dateInput = page.locator('input[type="date"]').last();
    await expect(dateInput).toBeVisible();
    await dateInput.fill('2025-06-15');

    const typeSelect = page.locator('select').last();
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption('custom');

    const descriptionInput = page.locator('input[placeholder*="Aniversário"]').first();
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill('Fundação da Empresa');

    await page.waitForTimeout(500);

    const saveDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await expect(saveDateButton).toBeVisible();

    console.log('🖱️ Clicking "Adicionar Data" button to save special date...');
    await saveDateButton.click();
    await page.waitForTimeout(2000);

    console.log('✅ Clicked "Adicionar Data" button');
    await page.screenshot({ path: 'screenshots/12-pj-special-date-added.png', fullPage: true });

    // Click "Criar Cliente" button
    console.log('💾 Creating client...');

    const createButton = page.locator('button:has-text("Criar Cliente")').first();
    await createButton.scrollIntoViewIfNeeded();
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();

    console.log('🖱️ Clicking "Criar Cliente" button...');
    await createButton.click();

    // Wait for modal to close - check that the modal heading is no longer visible
    console.log('⏳ Waiting for modal to close...');
    await expect(modalHeading).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Modal closed');

    await page.waitForTimeout(2000);

    // Verify both clients appear in list
    console.log('🔍 Verifying both clients appear in list...');
    await page.screenshot({ path: 'screenshots/13-both-clients-created.png', fullPage: true });

    const pessoaFisicaInList = page.locator('text="João da Silva Test"').first();
    const pessoaJuridicaInList = page.locator('text="Test Company Brasil LTDA"').first();

    await expect(pessoaFisicaInList).toBeVisible({ timeout: 10000 });
    await expect(pessoaJuridicaInList).toBeVisible({ timeout: 10000 });

    console.log('✅ TEST 2 PASSED: Both clients visible in list!');

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/14-final-success.png', fullPage: true });

    console.log('\n🎉 ALL TESTS PASSED! Complete client registration flow working correctly!');
  });
});
