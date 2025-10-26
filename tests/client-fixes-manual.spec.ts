import { test, expect } from '@playwright/test';

/**
 * Manual verification of Client Management Fixes
 * This test navigates directly to the /clients page after login
 */

test.describe('Client Management - Manual Fix Verification', () => {
  const APP_URL = 'http://localhost:3000';
  const LOGIN_URL = `${APP_URL}/login`;
  const CLIENTS_URL = `${APP_URL}/clients`;

  const ADMIN_EMAIL = 'admin@momentocake.com.br';
  const ADMIN_PASSWORD = 'G8j5k188';

  test('Complete client management verification', async ({ page }) => {
    console.log('Starting comprehensive client management test...');

    // Step 1: Login
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('load');

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForTimeout(3000);

    // Take screenshot after login
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/01-after-login.png',
      fullPage: true
    });

    console.log('URL after login:', page.url());

    // Step 2: Navigate directly to /clients
    console.log('Navigating to /clients...');
    await page.goto(CLIENTS_URL);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Take screenshot of clients page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/02-clients-page.png',
      fullPage: true
    });

    console.log('URL at clients page:', page.url());

    // Step 3: Check sidebar for "Clientes" menu structure
    console.log('Checking sidebar menu structure...');

    // Look for Clientes menu item
    const clientesMenu = page.locator('text=Clientes').first();
    const isClientesVisible = await clientesMenu.isVisible().catch(() => false);
    console.log('Clientes menu visible:', isClientesVisible);

    // Check if it has a submenu indicator (chevron)
    const hasChevron = await page.locator('[data-testid="clientes-submenu"], nav a:has-text("Clientes") > svg').first().isVisible().catch(() => false);
    console.log('Has submenu chevron:', hasChevron);

    // Step 4: Look for "Novo Cliente" button on the page
    console.log('Looking for Novo Cliente button...');

    const novoClienteButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar Cliente"), [data-testid="add-client-button"]').first();
    const hasNovoButton = await novoClienteButton.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('Novo Cliente button found:', hasNovoButton);

    if (!hasNovoButton) {
      // Try alternative selectors
      const allButtons = await page.locator('button').allTextContents();
      console.log('All buttons on page:', allButtons);
    }

    // Take screenshot highlighting where button should be
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/03-looking-for-button.png',
      fullPage: true
    });

    // Step 5: If button found, click it and check modal
    if (hasNovoButton) {
      console.log('Clicking Novo Cliente button...');
      await novoClienteButton.click();
      await page.waitForTimeout(1000);

      // Check for modal
      const modal = page.locator('[role="dialog"], .modal-overlay').first();
      const isModalVisible = await modal.isVisible().catch(() => false);
      console.log('Modal visible:', isModalVisible);

      // Take screenshot with modal
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/04-modal-opened.png',
        fullPage: true
      });

      // Check URL hasn't changed
      console.log('URL after opening modal:', page.url());
      expect(page.url()).toContain('/clients');

      // Look for form inputs
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
      const inputCount = await inputs.count();
      console.log('Number of input fields:', inputCount);

      if (inputCount > 0) {
        const firstInput = inputs.first();

        // Get input styling
        const inputStyles = await firstInput.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor,
            classes: el.className
          };
        });

        console.log('Input field styles:', inputStyles);

        // Focus on input
        await firstInput.focus();
        await page.waitForTimeout(500);

        // Take screenshot of focused input
        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/05-input-focused.png',
          fullPage: true
        });
      }

      // Look for Cancel/Save buttons
      const cancelButton = page.locator('button:has-text("Cancelar")').first();
      const saveButton = page.locator('button:has-text("Salvar")').first();

      console.log('Cancel button visible:', await cancelButton.isVisible().catch(() => false));
      console.log('Save button visible:', await saveButton.isVisible().catch(() => false));

      // Close modal if cancel exists
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/06-modal-closed.png',
          fullPage: true
        });
      }
    }

    // Step 6: Check for JSON errors in console
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Reload page to capture console logs
    await page.reload();
    await page.waitForTimeout(2000);

    console.log('Console logs:', consoleLogs);

    // Take final screenshot
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/manual/07-final-state.png',
      fullPage: true
    });
  });
});
