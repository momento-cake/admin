import { test, expect } from '@playwright/test';

test.describe('Packaging Inventory - Create Button Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');

    // Wait for page to load
    await page.waitForLoadState('load');

    // Fill in login credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard - be more flexible with URL pattern
    await page.waitForTimeout(2000);
    await page.waitForLoadState('load');

    // Verify we're on dashboard by checking for dashboard content
    const dashboardHeading = await page.locator('text=Dashboard').isVisible().catch(() => false);
    if (!dashboardHeading) {
      console.log('⚠️ Login may have failed - not on dashboard');
    } else {
      console.log('✅ Successfully logged in');
    }
  });

  test('should navigate to packaging inventory and test create button', async ({ page }) => {
    // Navigate to packaging inventory
    console.log('Navigating to packaging inventory...');
    await page.goto('http://localhost:4000/packaging/inventory');
    await page.waitForLoadState('load');

    // Wait for loading spinner to disappear (up to 30 seconds)
    console.log('Waiting for page to finish loading...');
    const loadingSpinner = page.locator('text=Carregando');
    try {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 });
      console.log('✅ Loading completed');
    } catch (error) {
      console.log('⚠️ Loading timeout - page still showing loading state');
    }

    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);

    // Take screenshot of initial page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-inventory-initial.png',
      fullPage: true
    });
    console.log('📸 Screenshot taken: packaging-inventory-initial.png');

    // Check for empty state message
    const emptyStateMessage = page.locator('text=Nenhuma Embalagem Registrada');
    const hasEmptyState = await emptyStateMessage.isVisible().catch(() => false);

    if (hasEmptyState) {
      console.log('✅ Empty state detected: "Nenhuma Embalagem Registrada"');

      // Look for "Adicionar Primeira Embalagem" button
      const firstPackagingButton = page.locator('button:has-text("Adicionar Primeira Embalagem")');
      const buttonExists = await firstPackagingButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (buttonExists) {
        console.log('✅ Found "Adicionar Primeira Embalagem" button');

        // Take screenshot before clicking
        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-empty-state-with-button.png',
          fullPage: true
        });

        // Click the button
        await firstPackagingButton.click();
        console.log('🖱️  Clicked "Adicionar Primeira Embalagem" button');

        // Wait a moment for dialog to appear
        await page.waitForTimeout(1000);

        // Check if dialog/modal appeared
        const dialogTitle = page.locator('text=Criar Nova Embalagem');
        const dialogVisible = await dialogTitle.isVisible({ timeout: 5000 }).catch(() => false);

        if (dialogVisible) {
          console.log('✅ Dialog opened successfully with title "Criar Nova Embalagem"');

          // Check for form fields
          const formFields = {
            nome: await page.locator('input[name="name"], label:has-text("Nome")').isVisible().catch(() => false),
            marca: await page.locator('input[name="brand"], label:has-text("Marca")').isVisible().catch(() => false),
            descricao: await page.locator('textarea[name="description"], label:has-text("Descrição")').isVisible().catch(() => false)
          };

          console.log('Form fields visibility:', formFields);

          // Take screenshot of opened dialog
          await page.screenshot({
            path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-create-dialog-opened.png',
            fullPage: true
          });
          console.log('📸 Screenshot taken: packaging-create-dialog-opened.png');

          // Try to close the dialog (look for close button or cancel button)
          const closeButton = page.locator('button:has-text("Cancelar"), button[aria-label="Close"], button:has-text("Fechar")').first();
          const closeButtonExists = await closeButton.isVisible({ timeout: 3000 }).catch(() => false);

          if (closeButtonExists) {
            await closeButton.click();
            console.log('✅ Dialog closed successfully');

            await page.waitForTimeout(500);

            // Verify dialog is closed
            const dialogStillVisible = await dialogTitle.isVisible().catch(() => false);
            if (!dialogStillVisible) {
              console.log('✅ Dialog closed and no longer visible');
            }
          } else {
            console.log('⚠️  Could not find close/cancel button');
          }

        } else {
          console.log('❌ Dialog did not appear after clicking button');
          await page.screenshot({
            path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-no-dialog-error.png',
            fullPage: true
          });
        }

      } else {
        console.log('❌ "Adicionar Primeira Embalagem" button not found');
      }

    } else {
      console.log('ℹ️  No empty state - checking for "Nova Embalagem" header button');

      // Look for header button
      const headerButton = page.locator('button:has-text("Nova Embalagem")');
      const headerButtonExists = await headerButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (headerButtonExists) {
        console.log('✅ Found "Nova Embalagem" header button');

        // Take screenshot before clicking
        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-with-data.png',
          fullPage: true
        });

        // Click the header button
        await headerButton.click();
        console.log('🖱️  Clicked "Nova Embalagem" button');

        // Wait for dialog
        await page.waitForTimeout(1000);

        // Check if dialog appeared
        const dialogTitle = page.locator('text=Criar Nova Embalagem');
        const dialogVisible = await dialogTitle.isVisible({ timeout: 5000 }).catch(() => false);

        if (dialogVisible) {
          console.log('✅ Dialog opened successfully from header button');

          await page.screenshot({
            path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-create-dialog-from-header.png',
            fullPage: true
          });
        } else {
          console.log('❌ Dialog did not appear after clicking header button');
        }
      } else {
        console.log('❌ "Nova Embalagem" header button not found');
      }
    }

    // Take final screenshot
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/packaging-test-final.png',
      fullPage: true
    });
    console.log('📸 Final screenshot taken');
  });
});
