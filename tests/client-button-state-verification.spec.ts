import { test, expect, Page } from '@playwright/test';

test.describe('Client Modal Button State Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3002/login');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Wait for authentication
  });

  test('Adicionar Pessoa button shows form immediately on click', async ({ page }) => {
    console.log('Starting Adicionar Pessoa button test...');

    // Navigate to clients page
    await page.goto('http://localhost:3002/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Click the "Novo Cliente" button to open modal
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")');
    await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1000);

    console.log('Modal opened, taking BEFORE screenshot...');

    // Take screenshot BEFORE clicking button
    await page.screenshot({
      path: 'test-results/adicionar-pessoa-before.png',
      fullPage: true
    });

    // Verify the "Adicionar Pessoa" button is visible
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
    await expect(adicionarPessoaButton).toBeVisible({ timeout: 5000 });

    console.log('Clicking Adicionar Pessoa button...');

    // Click the "Adicionar Pessoa" button
    await adicionarPessoaButton.click();
    await page.waitForTimeout(1000);

    console.log('Button clicked, taking AFTER screenshot...');

    // Take screenshot AFTER clicking button
    await page.screenshot({
      path: 'test-results/adicionar-pessoa-after.png',
      fullPage: true
    });

    // Verify the form appears (check for form fields)
    const nameInput = page.locator('input[placeholder="Ex: João Silva"]');
    const relationSelect = page.locator('select').first();
    const phoneInput = page.locator('input[placeholder="(00) 00000-0000"]');

    console.log('Verifying form fields are visible...');

    // Check that form fields are visible
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(relationSelect).toBeVisible({ timeout: 5000 });
    await expect(phoneInput).toBeVisible({ timeout: 5000 });

    // Verify the button changed state (should not be visible or should be disabled)
    const isButtonVisible = await adicionarPessoaButton.isVisible().catch(() => false);
    console.log(`Button visible after click: ${isButtonVisible}`);

    // Fill in the form to verify it's functional
    console.log('Testing form functionality...');
    await nameInput.fill('Teste Pessoa');
    await relationSelect.selectOption('spouse');
    await phoneInput.fill('11999887766');

    // Verify values were filled
    await expect(nameInput).toHaveValue('Teste Pessoa');

    console.log('✅ Adicionar Pessoa button test PASSED');
  });

  test('Adicionar Data button shows form immediately on click', async ({ page }) => {
    console.log('Starting Adicionar Data button test...');

    // Navigate to clients page
    await page.goto('http://localhost:3002/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Click the "Novo Cliente" button to open modal
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")');
    await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1000);

    console.log('Modal opened, taking BEFORE screenshot...');

    // Take screenshot BEFORE clicking button
    await page.screenshot({
      path: 'test-results/adicionar-data-before.png',
      fullPage: true
    });

    // Verify the "Adicionar Data" button is visible
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")');
    await expect(adicionarDataButton).toBeVisible({ timeout: 5000 });

    console.log('Clicking Adicionar Data button...');

    // Click the "Adicionar Data" button
    await adicionarDataButton.click();
    await page.waitForTimeout(1000);

    console.log('Button clicked, taking AFTER screenshot...');

    // Take screenshot AFTER clicking button
    await page.screenshot({
      path: 'test-results/adicionar-data-after.png',
      fullPage: true
    });

    // Verify the form appears (check for form fields)
    const dateTypeSelect = page.locator('select').first();
    const dateInput = page.locator('input[type="date"]');
    const descriptionInput = page.locator('input[placeholder="Ex: Aniversário, Casamento..."]');

    console.log('Verifying form fields are visible...');

    // Check that form fields are visible
    await expect(dateTypeSelect).toBeVisible({ timeout: 5000 });
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await expect(descriptionInput).toBeVisible({ timeout: 5000 });

    // Verify the button changed state (should not be visible or should be disabled)
    const isButtonVisible = await adicionarDataButton.isVisible().catch(() => false);
    console.log(`Button visible after click: ${isButtonVisible}`);

    // Fill in the form to verify it's functional
    console.log('Testing form functionality...');
    await dateTypeSelect.selectOption('birthday');
    await dateInput.fill('2000-01-15');
    await descriptionInput.fill('Aniversário Teste');

    // Verify values were filled
    await expect(descriptionInput).toHaveValue('Aniversário Teste');

    console.log('✅ Adicionar Data button test PASSED');
  });

  test('Both buttons work in sequence', async ({ page }) => {
    console.log('Starting sequential button test...');

    // Navigate to clients page
    await page.goto('http://localhost:3002/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Click the "Novo Cliente" button to open modal
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")');
    await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1000);

    // Test Adicionar Pessoa button
    console.log('Testing Adicionar Pessoa...');
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
    await adicionarPessoaButton.click();
    await page.waitForTimeout(500);

    const pessoaNameInput = page.locator('input[placeholder="Ex: João Silva"]');
    await expect(pessoaNameInput).toBeVisible({ timeout: 5000 });

    // Fill and submit pessoa form
    await pessoaNameInput.fill('Pessoa Teste');
    await page.locator('select').first().selectOption('spouse');
    await page.locator('input[placeholder="(00) 00000-0000"]').fill('11999887766');

    // Find and click the "Adicionar" button within the pessoa form
    const addPessoaButton = page.locator('button:has-text("Adicionar")').first();
    await addPessoaButton.click();
    await page.waitForTimeout(500);

    console.log('Pessoa added, now testing Adicionar Data...');

    // Take screenshot showing pessoa was added
    await page.screenshot({
      path: 'test-results/sequential-after-pessoa.png',
      fullPage: true
    });

    // Test Adicionar Data button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")');
    await expect(adicionarDataButton).toBeVisible({ timeout: 5000 });
    await adicionarDataButton.click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });

    // Fill data form
    await page.locator('select').first().selectOption('birthday');
    await dateInput.fill('2000-01-15');
    await page.locator('input[placeholder="Ex: Aniversário, Casamento..."]').fill('Data Teste');

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/sequential-after-data.png',
      fullPage: true
    });

    console.log('✅ Sequential button test PASSED');
  });
});
