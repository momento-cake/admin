import { test, expect } from '@playwright/test';

test.describe('Client Modal - Adicionar Pessoa and Adicionar Data Buttons', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Wait for page to load
    await page.waitForLoadState('load');

    // Fill login credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Additional wait for dashboard to fully load

    console.log('✓ Login successful');
  });

  test('should display forms and add data when clicking Adicionar Pessoa and Adicionar Data buttons', async ({ page }) => {
    // Navigate to clients page
    console.log('Navigating to clients page...');
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Take screenshot of clients page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/01-clients-page.png',
      fullPage: true
    });
    console.log('✓ Clients page loaded');

    // Look for "Novo Cliente" button - try multiple selectors
    console.log('Looking for Novo Cliente button...');

    // Wait for any button with "Novo Cliente" text
    const novoClienteButton = page.locator('button').filter({ hasText: /novo cliente/i }).first();
    await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });

    // Take screenshot before clicking
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/02-before-modal-open.png',
      fullPage: true
    });

    // Click to open modal
    await novoClienteButton.click();
    console.log('✓ Clicked Novo Cliente button');

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Take screenshot of opened modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/03-modal-opened.png',
      fullPage: true
    });
    console.log('✓ Modal opened');

    // ============================
    // TEST ADICIONAR PESSOA BUTTON
    // ============================
    console.log('\n--- Testing Adicionar Pessoa Button ---');

    // Find and click "Adicionar Pessoa" button
    const addPersonButton = page.locator('button').filter({ hasText: /adicionar pessoa/i }).first();
    await addPersonButton.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✓ Found Adicionar Pessoa button');

    // Take screenshot before clicking
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/04-before-person-form.png',
      fullPage: true
    });

    // Click the button
    await addPersonButton.click();
    await page.waitForTimeout(1000);

    console.log('✓ Clicked Adicionar Pessoa button');

    // Take screenshot of form
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/05-person-form-displayed.png',
      fullPage: true
    });

    // Verify form fields are visible - use the actual placeholder from the component
    const personNameInput = page.locator('input[placeholder="Nome completo"]').first();
    await expect(personNameInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Person name input is visible');

    // Fill the form
    await personNameInput.fill('João Silva');
    console.log('✓ Filled name: João Silva');

    // Select relationship type - it's a native select element
    const relationshipSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Filho(a)' }) }).first();
    await relationshipSelect.selectOption('child');
    console.log('✓ Selected relationship type: child');

    await page.waitForTimeout(500);

    // Take screenshot of filled form
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/06-person-form-filled.png',
      fullPage: true
    });

    // Find and click the submit button for adding person (it's inside the form)
    const submitPersonButton = page.locator('button').filter({ hasText: 'Adicionar Pessoa' }).nth(1); // The second "Adicionar Pessoa" button is the submit button
    await submitPersonButton.click();
    await page.waitForTimeout(1000);

    console.log('✓ Submitted person form');

    // Take screenshot showing person in list
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/07-person-added-to-list.png',
      fullPage: true
    });

    // Verify person appears in the list
    const personInList = page.locator('text=/João Silva/i').first();
    await expect(personInList).toBeVisible({ timeout: 5000 });
    console.log('✓ Person "João Silva" appears in the list');

    // ============================
    // TEST ADICIONAR DATA BUTTON
    // ============================
    console.log('\n--- Testing Adicionar Data Button ---');

    // Find and click "Adicionar Data" button
    const addDateButton = page.locator('button').filter({ hasText: /adicionar data/i }).first();
    await addDateButton.waitFor({ state: 'visible', timeout: 5000 });

    console.log('✓ Found Adicionar Data button');

    // Take screenshot before clicking
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/08-before-date-form.png',
      fullPage: true
    });

    // Click the button
    await addDateButton.click();
    await page.waitForTimeout(500);

    console.log('✓ Clicked Adicionar Data button');

    // Take screenshot of form
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/09-date-form-displayed.png',
      fullPage: true
    });

    // Fill date field
    const dateInput = page.locator('input[type="date"], input[name*="data"]').first();
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await dateInput.fill('2025-12-25');
    console.log('✓ Filled date: 2025-12-25');

    // Select date type
    const dateTypeSelect = page.locator('select, [role="combobox"]').filter({ hasText: /tipo/i }).first();
    if (await dateTypeSelect.isVisible()) {
      await dateTypeSelect.click();
      await page.waitForTimeout(300);

      // Try to find and click "birthday" option
      const birthdayOption = page.locator('[role="option"]').filter({ hasText: /aniversário|birthday/i }).first();
      if (await birthdayOption.isVisible()) {
        await birthdayOption.click();
      } else {
        // Fallback: type to search
        await dateTypeSelect.fill('birthday');
      }
      console.log('✓ Selected date type');
    }

    // Fill description
    const descriptionInput = page.locator('input[name*="descri"], textarea[name*="descri"]').first();
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Test Date');
      console.log('✓ Filled description: Test Date');
    }

    await page.waitForTimeout(500);

    // Take screenshot of filled form
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/10-date-form-filled.png',
      fullPage: true
    });

    // Find and click the submit button for adding date
    const submitDateButton = page.locator('button').filter({ hasText: /adicionar data/i }).last();
    await submitDateButton.click();
    await page.waitForTimeout(1000);

    console.log('✓ Submitted date form');

    // Take screenshot showing date in list
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/11-date-added-to-list.png',
      fullPage: true
    });

    // Verify date appears in the list
    const dateInList = page.locator('text=/2025-12-25|Test Date/i').first();
    await expect(dateInList).toBeVisible({ timeout: 5000 });
    console.log('✓ Date "2025-12-25" or "Test Date" appears in the list');

    // Final screenshot of modal with both items added
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/12-final-modal-state.png',
      fullPage: true
    });

    console.log('\n✓✓✓ All tests passed successfully! ✓✓✓');
  });
});
