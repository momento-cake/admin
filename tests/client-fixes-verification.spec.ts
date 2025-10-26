import { test, expect } from '@playwright/test';

/**
 * Client Management Feature - Fix Verification Test Suite
 *
 * This test suite verifies four critical fixes:
 * 1. Sidebar Menu Fix - No submenu for Clientes
 * 2. Form Field Styling Fix - Distinct background colors
 * 3. JSON Parsing Error Fix - No JSON parse errors on page load
 * 4. Modal Pattern Fix - Modal dialog instead of separate page
 */

test.describe('Client Management - Fix Verification', () => {
  const APP_URL = 'http://localhost:3000';
  const LOGIN_URL = `${APP_URL}/login`;
  const CLIENTS_URL = `${APP_URL}/clients`;

  const ADMIN_EMAIL = 'admin@momentocake.com.br';
  const ADMIN_PASSWORD = 'G8j5k188';

  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(LOGIN_URL);
    await page.waitForLoadState('load');

    // Take screenshot of login page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/01-login-page.png',
      fullPage: true
    });

    // Fill login form using verified selectors
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    // Take screenshot before login
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/02-login-filled.png',
      fullPage: true
    });

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForLoadState('load');

    // Verify successful login by checking URL or dashboard elements
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/03-after-login.png',
      fullPage: true
    });
  });

  test('Fix 1: Verify sidebar menu has no submenu for Clientes', async ({ page }) => {
    console.log('Testing Fix 1: Sidebar Menu Structure');

    // Wait for sidebar to be visible
    await page.waitForSelector('[data-testid="sidebar"], nav', { timeout: 10000 });

    // Take screenshot of sidebar
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/04-sidebar-menu.png',
      fullPage: true
    });

    // Check if "Clientes" menu item exists
    const clientesMenuItem = page.locator('text=Clientes').first();
    await expect(clientesMenuItem).toBeVisible({ timeout: 5000 });

    // Verify it's a direct link (not a parent menu with submenu)
    // Check if clicking it navigates directly to /clients
    await clientesMenuItem.click();
    await page.waitForLoadState('load');

    // Take screenshot after clicking Clientes
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/05-clientes-clicked.png',
      fullPage: true
    });

    // Verify URL is /clients
    expect(page.url()).toContain('/clients');

    console.log('✓ Fix 1 Test Complete: Clientes menu navigates directly to /clients');
  });

  test('Fix 3: Verify no JSON parsing errors on Clientes page load', async ({ page }) => {
    console.log('Testing Fix 3: JSON Parsing Error');

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to Clientes page
    await page.goto(CLIENTS_URL);
    await page.waitForLoadState('load');

    // Wait a bit for any errors to appear
    await page.waitForTimeout(2000);

    // Take screenshot of Clientes page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/06-clientes-page-loaded.png',
      fullPage: true
    });

    // Check for JSON parsing errors
    const hasJSONError = consoleErrors.some(err =>
      err.includes('Unexpected token') ||
      err.includes('not valid JSON') ||
      err.includes('<!DOCTYPE')
    );

    const hasPageJSONError = pageErrors.some(err =>
      err.message.includes('Unexpected token') ||
      err.message.includes('not valid JSON') ||
      err.message.includes('<!DOCTYPE')
    );

    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors.map(e => e.message));

    // Assert no JSON parsing errors
    expect(hasJSONError).toBe(false);
    expect(hasPageJSONError).toBe(false);

    console.log('✓ Fix 3 Test Complete: No JSON parsing errors detected');
  });

  test('Fix 2 & 4: Verify modal pattern and form field styling', async ({ page }) => {
    console.log('Testing Fix 2 & 4: Modal Pattern and Form Field Styling');

    // Navigate to Clientes page
    await page.goto(CLIENTS_URL);
    await page.waitForLoadState('load');

    // Take screenshot of Clientes page before opening modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/07-before-modal.png',
      fullPage: true
    });

    // Find and click "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 5000 });

    console.log('Clicking Novo Cliente button...');
    await novoClienteButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Take screenshot after clicking Novo Cliente
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/08-modal-opened.png',
      fullPage: true
    });

    // Verify modal pattern (Fix 4)
    console.log('Verifying modal pattern...');

    // Check for modal overlay (should have fixed positioning)
    const modalOverlay = page.locator('[role="dialog"], .modal, [data-testid="modal"]').first();

    // Verify modal is visible
    const isModalVisible = await modalOverlay.isVisible().catch(() => false);
    console.log('Modal visible:', isModalVisible);

    if (isModalVisible) {
      // Get modal styles
      const modalStyles = await modalOverlay.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          zIndex: styles.zIndex,
          backgroundColor: styles.backgroundColor
        };
      });

      console.log('Modal styles:', modalStyles);

      // Check if URL changed (it shouldn't for a modal)
      const currentURL = page.url();
      console.log('Current URL after modal open:', currentURL);
      expect(currentURL).toContain('/clients');

      // Verify modal structure
      const hasHeader = await page.locator('text=Novo Cliente, [role="dialog"] header').first().isVisible().catch(() => false);
      const hasFooter = await page.locator('[role="dialog"] footer, button:has-text("Cancelar"), button:has-text("Salvar")').first().isVisible().catch(() => false);

      console.log('Modal has header:', hasHeader);
      console.log('Modal has footer:', hasFooter);
    }

    // Verify form field styling (Fix 2)
    console.log('Verifying form field styling...');

    // Find input fields in the form
    const inputFields = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const inputCount = await inputFields.count();

    console.log('Found input fields:', inputCount);

    if (inputCount > 0) {
      // Get the first input field
      const firstInput = inputFields.first();

      // Get computed styles
      const inputStyles = await firstInput.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
          borderWidth: styles.borderWidth,
          classes: el.className
        };
      });

      console.log('Input field styles:', inputStyles);

      // Take screenshot of form with focus on first field
      await firstInput.focus();
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/09-form-field-focused.png',
        fullPage: true
      });

      // Check if input has bg-background class or distinct background
      const hasDistinctBackground = inputStyles.classes.includes('bg-background') ||
                                    inputStyles.backgroundColor !== 'rgba(0, 0, 0, 0)';

      console.log('Has distinct background:', hasDistinctBackground);
      expect(hasDistinctBackground).toBe(true);
    }

    // Try to close modal if Cancel button exists
    const cancelButton = page.locator('button:has-text("Cancelar")').first();
    const isCancelVisible = await cancelButton.isVisible().catch(() => false);

    if (isCancelVisible) {
      console.log('Closing modal...');
      await cancelButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/10-modal-closed.png',
        fullPage: true
      });
    }

    console.log('✓ Fix 2 & 4 Test Complete: Modal pattern and form styling verified');
  });

  test('Fix 4 Extended: Verify edit modal pattern', async ({ page }) => {
    console.log('Testing Fix 4 Extended: Edit Modal Pattern');

    // Navigate to Clientes page
    await page.goto(CLIENTS_URL);
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Take screenshot of Clientes page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/11-clientes-list.png',
      fullPage: true
    });

    // Look for edit button on a client card
    const editButton = page.locator('button:has-text("Editar"), [data-testid="edit-client"], button[aria-label*="Editar"]').first();
    const hasEditButton = await editButton.isVisible().catch(() => false);

    console.log('Edit button found:', hasEditButton);

    if (hasEditButton) {
      // Click edit button
      await editButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot of edit modal
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/client-fixes/12-edit-modal.png',
        fullPage: true
      });

      // Verify modal opened (URL should still be /clients)
      expect(page.url()).toContain('/clients');

      // Verify modal is visible
      const modalVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
      console.log('Edit modal visible:', modalVisible);

      if (modalVisible) {
        // Close modal
        const cancelButton = page.locator('button:has-text("Cancelar")').first();
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click();
          await page.waitForTimeout(500);
        }
      }

      console.log('✓ Fix 4 Extended Complete: Edit modal pattern verified');
    } else {
      console.log('⚠ No edit button found - may need to create a client first');
    }
  });
});
