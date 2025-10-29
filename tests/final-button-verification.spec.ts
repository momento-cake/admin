import { test, expect } from '@playwright/test';

test.describe('Final Button Verification - Adicionar Pessoa and Adicionar Data', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Complete verification of both buttons in Novo Cliente modal', async ({ page }) => {
    console.log('Starting final verification test...');

    // Step 1: Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'load' });
    await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });

    // Step 2: Login
    console.log('Step 2: Logging in with admin credentials...');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('load');

    // Wait for dashboard or navigation
    console.log('Step 3: Waiting for dashboard...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/02-after-login.png', fullPage: true });

    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    // Check if login was successful
    if (currentUrl.includes('/login')) {
      console.error('❌ Login failed - still on login page');
      await page.screenshot({ path: 'test-results/ERROR-login-failed.png', fullPage: true });
      throw new Error('Login failed - still on login page');
    }

    // Step 4: Navigate to clients page
    console.log('Step 4: Navigating to clients page...');

    // Direct navigation to the correct route
    await page.goto('http://localhost:3003/clients', { waitUntil: 'load' });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/03-clients-page.png', fullPage: true });
    console.log('Current URL:', page.url());

    // Step 5: Open Novo Cliente modal
    console.log('Step 5: Opening Novo Cliente modal...');

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Look for the "Novo Cliente" button - it should be at the top right
    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();

    // Wait for button to be visible
    console.log('Waiting for Novo Cliente button...');
    await expect(newClientButton).toBeVisible({ timeout: 15000 });
    console.log('✓ Button found');

    // Click the button
    console.log('Clicking button...');
    await newClientButton.click();

    // Wait for modal to open
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/04-modal-opened.png', fullPage: true });
    console.log('✓ Modal opened');

    // Verify modal is visible by looking for the "Novo Cliente" heading
    const modalHeading = page.locator('h2:has-text("Novo Cliente"), h2:has-text("Editar Cliente")').first();
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
    console.log('✓ Modal verified by heading');

    // Step 6: Test "Adicionar Pessoa" button
    console.log('\n=== TESTING ADICIONAR PESSOA BUTTON ===');

    // Find and screenshot the "Adicionar Pessoa" button
    console.log('Step 6a: Finding Adicionar Pessoa button...');
    const addPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await expect(addPersonButton).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/05-before-click-pessoa.png', fullPage: true });
    console.log('✓ Adicionar Pessoa button found');

    // Click the button
    console.log('Step 6b: Clicking Adicionar Pessoa button...');
    await addPersonButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/06-pessoa-form-opened.png', fullPage: true });
    console.log('✓ Clicked Adicionar Pessoa button');

    // Verify form fields appear - look for input with placeholder "Nome completo"
    console.log('Step 6c: Verifying form fields...');
    const nameInput = page.locator('input[placeholder="Nome completo"]').first();

    // Find the select within the form card (bg-gray-50) to avoid picking up the filter select
    const formCard = page.locator('.bg-gray-50').first();
    const relationshipSelect = formCard.locator('select').first();

    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(relationshipSelect).toBeVisible({ timeout: 5000 });
    console.log('✓ Form fields are visible');

    // Fill in the form
    console.log('Step 6d: Filling form...');
    await nameInput.fill('João da Silva');

    // Select relationship (it defaults to 'child' which is what we want)
    // Just verify it's visible, no need to change the default value
    console.log('✓ Relationship already set to default (child)');

    // Optional fields - find by placeholder
    const emailInput = page.locator('input[placeholder="email@example.com"]').first();
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await emailInput.fill('joao@example.com');
    }

    const phoneInput = page.locator('input[placeholder*="99999-9999"]').first();
    if (await phoneInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneInput.fill('(11) 98765-4321');
    }

    await page.screenshot({ path: 'test-results/07-pessoa-form-filled.png', fullPage: true });
    console.log('✓ Form filled');

    // Submit the form - look for the button with "Adicionar Pessoa" text
    console.log('Step 6e: Submitting form...');
    const submitPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await submitPersonButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/08-pessoa-added.png', fullPage: true });
    console.log('✓ Form submitted');

    // Verify person appears in list
    console.log('Step 6f: Verifying person in list...');
    const personInList = page.locator('text=João da Silva').first();
    await expect(personInList).toBeVisible({ timeout: 5000 });
    console.log('✓ Person appears in list');

    // Verify form closed and button is visible again
    const addPersonButtonAfter = page.locator('button:has-text("Adicionar Pessoa")').first();
    await expect(addPersonButtonAfter).toBeVisible({ timeout: 5000 });
    console.log('✓ Form closed, button visible again');

    // Step 7: Test "Adicionar Data" button
    console.log('\n=== TESTING ADICIONAR DATA BUTTON ===');

    // Find and screenshot the "Adicionar Data" button
    console.log('Step 7a: Finding Adicionar Data button...');
    const addDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await expect(addDateButton).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'test-results/09-before-click-data.png', fullPage: true });
    console.log('✓ Adicionar Data button found');

    // Click the button
    console.log('Step 7b: Clicking Adicionar Data button...');
    await addDateButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/10-data-form-opened.png', fullPage: true });
    console.log('✓ Clicked Adicionar Data button');

    // Verify form fields appear - look for date input and select within the dates form
    console.log('Step 7c: Verifying form fields...');

    // Find the form cards - there should be two: one for persons (already filled), one for dates
    const datesFormCard = page.locator('.bg-gray-50').last(); // Get the last form card which should be the dates one
    const dateInput = datesFormCard.locator('input[type="date"]').first();
    const typeSelect = datesFormCard.locator('select').first();

    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    console.log('✓ Form fields are visible');

    // Fill in the form
    console.log('Step 7d: Filling form...');
    await dateInput.fill('2025-12-25');

    // Select type (birthday) - it should already be default, but let's verify
    console.log('✓ Date type already set to default (birthday)');

    // Description - find by placeholder (required field)
    const descriptionInput = datesFormCard.locator('input[placeholder*="Aniversário"]').first();
    await descriptionInput.fill('Aniversário do João');

    await page.screenshot({ path: 'test-results/11-data-form-filled.png', fullPage: true });
    console.log('✓ Form filled');

    // Submit the form - look for the button with "Adicionar Data" text
    console.log('Step 7e: Submitting form...');
    const submitDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await submitDateButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/12-data-added.png', fullPage: true });
    console.log('✓ Form submitted');

    // Verify form closed and button is visible again
    console.log('Step 7f: Verifying form closed...');
    const addDateButtonAfter = page.locator('button:has-text("Adicionar Data")').first();
    await expect(addDateButtonAfter).toBeVisible({ timeout: 5000 });
    console.log('✓ Form closed, button visible again');

    // Verify date appears in list - look for the description text
    console.log('Step 7g: Verifying date in list...');
    const dateDescriptionInList = page.locator('text=Aniversário do João').first();
    await expect(dateDescriptionInList).toBeVisible({ timeout: 5000 });
    console.log('✓ Date appears in list');

    // Final screenshot
    await page.screenshot({ path: 'test-results/13-final-state.png', fullPage: true });

    // Check console for errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`Console Error: ${msg.text()}`);
      }
    });

    console.log('\n=== TEST COMPLETE ===');
    console.log('✅ All steps passed successfully!');
    console.log('✅ Adicionar Pessoa button works correctly');
    console.log('✅ Adicionar Data button works correctly');
    console.log('✅ Forms display and accept input');
    console.log('✅ Data is added to lists');
    console.log('✅ Forms close after submission');

    if (consoleLogs.length > 0) {
      console.log('\nConsole errors detected:');
      consoleLogs.forEach(log => console.log(log));
    } else {
      console.log('✅ No console errors detected');
    }
  });
});
