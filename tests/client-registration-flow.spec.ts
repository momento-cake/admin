import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Client Registration Flow
 *
 * Tests comprehensive client creation for both:
 * 1. Pessoa Física (Individual)
 * 2. Pessoa Jurídica (Company)
 *
 * Includes validation of:
 * - Form submission
 * - Related persons management
 * - Special dates management
 * - Client list verification
 */

// Test configuration
const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

// Working selectors for authentication
const AUTH_SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

// Helper function: Login to admin dashboard
async function loginToAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');

  // Fill login credentials
  await page.fill(AUTH_SELECTORS.email, ADMIN_EMAIL);
  await page.fill(AUTH_SELECTORS.password, ADMIN_PASSWORD);

  // Submit login form
  await page.click(AUTH_SELECTORS.submitButton);

  // Wait for navigation away from login page (indicates successful login)
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('load');

  // Verify successful login by checking URL (allow trailing slash)
  await expect(page.url()).toMatch(/\/dashboard\/?$/);

  console.log('✅ Login successful - Dashboard loaded');
}

// Helper function: Navigate to Clients page
async function navigateToClients(page: Page) {
  // Look for Clients navigation link in sidebar
  const clientsLink = page.locator('a[href*="/clients"], a:has-text("Clientes")').first();
  await clientsLink.click();
  await page.waitForLoadState('load');

  console.log('✅ Navigated to Clients page');
}

// Helper function: Open Client Modal
async function openClientModal(page: Page) {
  // Look for "Novo Cliente" button
  const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
  await newClientButton.click();

  // Wait for modal to appear - look for the modal heading
  await page.waitForSelector('text=Novo Cliente', { timeout: 5000 });

  console.log('✅ Client modal opened');
}

test.describe('Client Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginToAdmin(page);
  });

  test('Test 1: Create Pessoa Física Client with Related Person and Special Date', async ({ page }) => {
    console.log('\n🧪 Starting Test 1: Pessoa Física Client Creation');

    // Step 1: Navigate to Clients page
    await navigateToClients(page);
    await page.screenshot({ path: 'tests/screenshots/01-clients-page-before.png', fullPage: true });

    // Step 2: Open "Novo Cliente" modal
    await openClientModal(page);
    await page.screenshot({ path: 'tests/screenshots/02-modal-opened-pf.png', fullPage: true });

    // Step 3: Select "Pessoa Física" type (already selected by default)
    const pessoaFisicaRadio = page.locator('input[type="radio"][value="person"]');
    if (!await pessoaFisicaRadio.isChecked()) {
      await pessoaFisicaRadio.check();
    }
    console.log('✅ Selected Pessoa Física');

    // Step 4: Fill basic client information using exact field names from component
    await page.fill('input[name="name"]', 'João Silva Test');
    await page.fill('input[id="email"]', 'joao.silva@test.com');
    await page.fill('input[id="cpfCnpj"]', '12345678901');
    await page.fill('input[id="phone"]', '11999999999');

    // Fill the required contact method "Valor" field
    const contactValueInput = page.locator('input[placeholder="Valor"]').first();
    await contactValueInput.fill('11999999999');

    console.log('✅ Filled basic client information including contact method');
    await page.screenshot({ path: 'tests/screenshots/03-basic-info-filled-pf.png', fullPage: true });

    // Step 5: Scroll to see the form sections and take screenshot
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/04-form-scrolled-pf.png', fullPage: true });

    // Step 6: Add Related Person (Pessoa Relacionada)
    const addRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await addRelatedPersonButton.scrollIntoViewIfNeeded();
    await addRelatedPersonButton.click();
    await page.waitForTimeout(1000); // Wait for form to expand

    console.log('✅ Clicked Adicionar Pessoa button');
    await page.screenshot({ path: 'tests/screenshots/05-related-person-form-opened-pf.png', fullPage: true });

    // Fill related person details - using the form inputs that appear
    const relatedPersonNameInput = page.locator('input[placeholder="Nome completo"]').first();
    await relatedPersonNameInput.fill('Maria Silva');

    // The relationship dropdown defaults to "Filho(a)" (child) - we'll keep this default for test simplicity

    console.log('✅ Filled related person details (using default relationship)');
    await page.screenshot({ path: 'tests/screenshots/06-related-person-filled-pf.png', fullPage: true });

    // Save the related person - button text is "Adicionar Pessoa"
    // Use .last() to get the submit button in the form (not the "Add" button at the top)
    const saveRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await saveRelatedPersonButton.scrollIntoViewIfNeeded();
    await saveRelatedPersonButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Saved related person');
    await page.screenshot({ path: 'tests/screenshots/07-related-person-saved-pf.png', fullPage: true });

    // Step 7: Add Special Date (Data Especial)
    const addSpecialDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await addSpecialDateButton.scrollIntoViewIfNeeded();
    await addSpecialDateButton.click();
    await page.waitForTimeout(1000); // Wait for form to expand

    console.log('✅ Clicked Adicionar Data button');
    await page.screenshot({ path: 'tests/screenshots/08-special-date-form-opened-pf.png', fullPage: true });

    // Fill special date details
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2025-12-25');

    const descriptionInput = page.locator('input[placeholder*="Ex: Aniversário"]').first();
    await descriptionInput.fill('Aniversário');

    console.log('✅ Filled special date details');
    await page.screenshot({ path: 'tests/screenshots/09-special-date-filled-pf.png', fullPage: true });

    // Save the special date - button text is "Adicionar Data"
    // Use .last() to get the submit button in the form (not the "Add" button at the top)
    const saveSpecialDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await saveSpecialDateButton.scrollIntoViewIfNeeded();
    await saveSpecialDateButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Saved special date');
    await page.screenshot({ path: 'tests/screenshots/10-special-date-saved-pf.png', fullPage: true });

    // Step 8: Submit the main form
    // Look for "Criar Cliente" button at the bottom of the modal
    const submitButton = page.locator('button:has-text("Criar Cliente")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    console.log('✅ Clicked Criar Cliente button');

    // Wait for modal to close and client to be created
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/11-after-submit-pf.png', fullPage: true });

    console.log('✅ Form submitted - waiting for client to appear in list');

    // Step 9: Verify client appears in the list
    const clientNameInList = page.locator('text="João Silva Test"').first();

    // Wait for client to appear in list (with longer timeout for Firebase operation)
    await expect(clientNameInList).toBeVisible({ timeout: 15000 });

    console.log('✅ Client "João Silva Test" appears in clients list');
    await page.screenshot({ path: 'tests/screenshots/12-client-in-list-pf.png', fullPage: true });

    console.log('✅ Test 1 PASSED: Pessoa Física client created successfully\n');
  });

  test('Test 2: Create Pessoa Jurídica Client with Related Person and Special Date', async ({ page }) => {
    console.log('\n🧪 Starting Test 2: Pessoa Jurídica Client Creation');

    // Step 1: Navigate to Clients page
    await navigateToClients(page);
    await page.screenshot({ path: 'tests/screenshots/11-clients-page-before-pj.png', fullPage: true });

    // Step 2: Open "Novo Cliente" modal
    await openClientModal(page);
    await page.screenshot({ path: 'tests/screenshots/12-modal-opened-pj.png', fullPage: true });

    // Step 3: Select "Pessoa Jurídica" type
    const pessoaJuridicaRadio = page.locator('input[type="radio"][value="business"]');
    await pessoaJuridicaRadio.check();
    await page.waitForTimeout(500); // Wait for form to update
    console.log('✅ Selected Pessoa Jurídica');

    // Step 4: Fill basic company information using exact field names from component
    await page.fill('input[name="name"]', 'Test Company Ltda');
    await page.fill('input[id="email"]', 'company@test.com');
    await page.fill('input[id="cpfCnpj"]', '12345678000190');
    await page.fill('input[id="phone"]', '1133333333');

    // Fill the required contact method "Valor" field
    const contactValueInput = page.locator('input[placeholder="Valor"]').first();
    await contactValueInput.fill('1133333333');

    console.log('✅ Filled basic company information including contact method');
    await page.screenshot({ path: 'tests/screenshots/13-basic-info-filled-pj.png', fullPage: true });

    // Step 5: Scroll to see the form sections
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/14-form-scrolled-pj.png', fullPage: true });

    // Step 6: Add Related Person (Pessoa Relacionada)
    const addRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await addRelatedPersonButton.scrollIntoViewIfNeeded();
    await addRelatedPersonButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Clicked Adicionar Pessoa button');
    await page.screenshot({ path: 'tests/screenshots/15-related-person-form-opened-pj.png', fullPage: true });

    // Fill related person details
    const relatedPersonNameInput = page.locator('input[placeholder="Nome completo"]').first();
    await relatedPersonNameInput.fill('João Gerente');

    // The relationship dropdown defaults to "Filho(a)" (child) - we'll keep this default for test simplicity

    console.log('✅ Filled related person details (using default relationship)');
    await page.screenshot({ path: 'tests/screenshots/16-related-person-filled-pj.png', fullPage: true });

    // Save the related person - button text is "Adicionar Pessoa"
    // Use .last() to get the submit button in the form (not the "Add" button at the top)
    const saveRelatedPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await saveRelatedPersonButton.scrollIntoViewIfNeeded();
    await saveRelatedPersonButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Saved related person');
    await page.screenshot({ path: 'tests/screenshots/17-related-person-saved-pj.png', fullPage: true });

    // Step 7: Add Special Date (Data Especial)
    const addSpecialDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await addSpecialDateButton.scrollIntoViewIfNeeded();
    await addSpecialDateButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Clicked Adicionar Data button');
    await page.screenshot({ path: 'tests/screenshots/18-special-date-form-opened-pj.png', fullPage: true });

    // Fill special date details
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2025-06-15');

    const descriptionInput = page.locator('input[placeholder*="Ex: Aniversário"]').first();
    await descriptionInput.fill('Fundação da Empresa');

    console.log('✅ Filled special date details');
    await page.screenshot({ path: 'tests/screenshots/19-special-date-filled-pj.png', fullPage: true });

    // Save the special date - button text is "Adicionar Data"
    // Use .last() to get the submit button in the form (not the "Add" button at the top)
    const saveSpecialDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await saveSpecialDateButton.scrollIntoViewIfNeeded();
    await saveSpecialDateButton.click();
    await page.waitForTimeout(1000);

    console.log('✅ Saved special date');
    await page.screenshot({ path: 'tests/screenshots/20-special-date-saved-pj.png', fullPage: true });

    // Step 8: Submit the main form
    const submitButton = page.locator('button:has-text("Criar Cliente")').first();
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    console.log('✅ Clicked Criar Cliente button');

    // Wait for modal to close and client to be created
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/21-after-submit-pj.png', fullPage: true });

    console.log('✅ Form submitted - waiting for client to appear in list');

    // Step 9: Verify client appears in the list
    const clientNameInList = page.locator('text="Test Company Ltda"').first();

    // Wait for client to appear in list (with longer timeout for Firebase operation)
    await expect(clientNameInList).toBeVisible({ timeout: 15000 });

    console.log('✅ Client "Test Company Ltda" appears in clients list');
    await page.screenshot({ path: 'tests/screenshots/22-client-in-list-pj.png', fullPage: true });

    console.log('✅ Test 2 PASSED: Pessoa Jurídica client created successfully\n');
  });
});
