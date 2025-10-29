import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Verify Button Fix - Adicionar Pessoa and Adicionar Data', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Wait for dashboard to load
  });

  test('should verify Adicionar Pessoa button works correctly', async ({ page }) => {
    // Click on Clientes in the sidebar to navigate to clients page
    await page.click('text=Clientes');
    await page.waitForTimeout(1000);

    // Click "Novo Cliente" button to open modal (use the second one which is the main button)
    const novoClienteButton = page.getByRole('button', { name: 'Novo Cliente' }).nth(1);
    await novoClienteButton.waitFor({ state: 'visible', timeout: 5000 });
    await novoClienteButton.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Take screenshot BEFORE clicking Adicionar Pessoa
    await page.screenshot({
      path: 'test-results/before-adicionar-pessoa.png',
      fullPage: true
    });

    // Locate the Adicionar Pessoa button
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
    await adicionarPessoaButton.waitFor({ state: 'visible', timeout: 5000 });

    // Verify button is visible and enabled
    await expect(adicionarPessoaButton).toBeVisible();
    await expect(adicionarPessoaButton).toBeEnabled();

    console.log('✓ Adicionar Pessoa button found and is clickable');

    // Click the button
    await adicionarPessoaButton.click();

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Take screenshot AFTER clicking Adicionar Pessoa
    await page.screenshot({
      path: 'test-results/after-adicionar-pessoa.png',
      fullPage: true
    });

    // Verify the form fields appear
    const nomeField = page.locator('input[placeholder="Nome completo"]');
    const tipoField = page.locator('select').first();

    // Check if form fields are visible
    const isNomeVisible = await nomeField.isVisible();
    const isTipoVisible = await tipoField.isVisible();

    console.log(`Nome field visible: ${isNomeVisible}`);
    console.log(`Tipo field visible: ${isTipoVisible}`);

    // Verify button state changed (either hidden or disabled)
    const buttonStillVisible = await adicionarPessoaButton.isVisible().catch(() => false);
    const buttonDisabled = buttonStillVisible ? await adicionarPessoaButton.isDisabled() : true;

    console.log(`Button still visible: ${buttonStillVisible}`);
    console.log(`Button disabled: ${buttonDisabled}`);

    // Assertions
    expect(isNomeVisible || isTipoVisible).toBeTruthy();
    expect(!buttonStillVisible || buttonDisabled).toBeTruthy();

    console.log('✓ PASS: Adicionar Pessoa button working correctly');
  });

  test('should verify Adicionar Data button works correctly', async ({ page }) => {
    // Click on Clientes in the sidebar to navigate to clients page
    await page.click('text=Clientes');
    await page.waitForTimeout(1000);

    // Click "Novo Cliente" button to open modal (use the second one which is the main button)
    const novoClienteButton = page.getByRole('button', { name: 'Novo Cliente' }).nth(1);
    await novoClienteButton.waitFor({ state: 'visible', timeout: 5000 });
    await novoClienteButton.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Take screenshot BEFORE clicking Adicionar Data
    await page.screenshot({
      path: 'test-results/before-adicionar-data.png',
      fullPage: true
    });

    // Locate the Adicionar Data button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")');
    await adicionarDataButton.waitFor({ state: 'visible', timeout: 5000 });

    // Verify button is visible and enabled
    await expect(adicionarDataButton).toBeVisible();
    await expect(adicionarDataButton).toBeEnabled();

    console.log('✓ Adicionar Data button found and is clickable');

    // Click the button
    await adicionarDataButton.click();

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Take screenshot AFTER clicking Adicionar Data
    await page.screenshot({
      path: 'test-results/after-adicionar-data.png',
      fullPage: true
    });

    // Verify the form fields appear
    const tipoDataField = page.locator('select').first();
    const dataField = page.locator('input[type="date"]');

    // Check if form fields are visible
    const isTipoDataVisible = await tipoDataField.isVisible();
    const isDataVisible = await dataField.isVisible();

    console.log(`Tipo Data field visible: ${isTipoDataVisible}`);
    console.log(`Data field visible: ${isDataVisible}`);

    // Verify button state changed (either hidden or disabled)
    const buttonStillVisible = await adicionarDataButton.isVisible().catch(() => false);
    const buttonDisabled = buttonStillVisible ? await adicionarDataButton.isDisabled() : true;

    console.log(`Button still visible: ${buttonStillVisible}`);
    console.log(`Button disabled: ${buttonDisabled}`);

    // Assertions
    expect(isTipoDataVisible || isDataVisible).toBeTruthy();
    expect(!buttonStillVisible || buttonDisabled).toBeTruthy();

    console.log('✓ PASS: Adicionar Data button working correctly');
  });

  test('should verify both buttons work in sequence', async ({ page }) => {
    // Click on Clientes in the sidebar to navigate to clients page
    await page.click('text=Clientes');
    await page.waitForTimeout(1000);

    // Click "Novo Cliente" button to open modal (use the second one which is the main button)
    const novoClienteButton = page.getByRole('button', { name: 'Novo Cliente' }).nth(1);
    await novoClienteButton.waitFor({ state: 'visible', timeout: 5000 });
    await novoClienteButton.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Test Adicionar Pessoa first
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
    await adicionarPessoaButton.click();
    await page.waitForTimeout(500);

    // Verify form appears
    const nomeField = page.locator('input[placeholder="Nome completo"]');
    await expect(nomeField).toBeVisible();

    console.log('✓ Adicionar Pessoa working in sequence');

    // Now test Adicionar Data
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")');
    await adicionarDataButton.click();
    await page.waitForTimeout(500);

    // Verify form appears
    const dataField = page.locator('input[type="date"]');
    await expect(dataField).toBeVisible();

    console.log('✓ Adicionar Data working in sequence');

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/both-buttons-sequence.png',
      fullPage: true
    });

    console.log('✓ PASS: Both buttons work correctly in sequence');
  });
});
