import { test, expect, chromium } from '@playwright/test';
import path from 'path';

// Manual test to capture screenshots for textfield consistency review
test.describe('Manual Textfield Consistency Review', () => {
  const screenshotsDir = path.join(__dirname, '../screenshots/textfield-consistency');

  test('Capture Users and Clients screens for manual comparison', async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
      console.log('\n=== Manual Test: Navigating to Login ===');
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('load');

      // Take login page screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, '0-login-page.png'),
        fullPage: true
      });

      console.log('Attempting login...');
      await page.fill('input[type="email"]', 'admin@momentocake.com.br');
      await page.fill('input[type="password"]', 'G8j5k188');

      await page.screenshot({
        path: path.join(screenshotsDir, '1-login-filled.png'),
        fullPage: true
      });

      await page.click('button[type="submit"]');

      // Wait a bit for redirect
      await page.waitForTimeout(3000);

      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);

      await page.screenshot({
        path: path.join(screenshotsDir, '2-after-login.png'),
        fullPage: true
      });

      // Try to navigate to Users page regardless of login success
      console.log('\n=== Navigating to Users Page ===');
      await page.goto('http://localhost:3000/users/active');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotsDir, '3-users-page.png'),
        fullPage: true
      });

      // Try to find and click "Convidar Usuário" button
      try {
        const inviteButton = page.locator('button:has-text("Convidar Usuário"), button:has-text("Convidar")');
        await inviteButton.first().waitFor({ state: 'visible', timeout: 3000 });
        await inviteButton.first().click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(screenshotsDir, '4-users-invite-dialog.png'),
          fullPage: true
        });

        // Get detailed styling info for email field
        const emailField = page.locator('input[name="email"], input[type="email"]').first();
        if (await emailField.count() > 0) {
          const styles = await emailField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderColor: computed.borderColor,
              borderWidth: computed.borderWidth,
              borderRadius: computed.borderRadius,
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              height: computed.height,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
            };
          });
          console.log('\n📧 Users Email Field Styles:', JSON.stringify(styles, null, 2));

          // Focus and capture
          await emailField.focus();
          await page.waitForTimeout(500);

          const focusStyles = await emailField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              borderColor: computed.borderColor,
              outline: computed.outline,
              boxShadow: computed.boxShadow,
            };
          });
          console.log('📧 Users Email Field Focus Styles:', JSON.stringify(focusStyles, null, 2));

          await page.screenshot({
            path: path.join(screenshotsDir, '5-users-email-focused.png'),
            fullPage: true
          });
        }

        // Close dialog
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } catch (err) {
        console.log('Could not interact with Users invite dialog:', err.message);
      }

      // Navigate to Clients page
      console.log('\n=== Navigating to Clients Page ===');
      await page.goto('http://localhost:3000/clients');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotsDir, '6-clients-page.png'),
        fullPage: true
      });

      // Check search field on list page
      try {
        const searchField = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]').first();
        if (await searchField.count() > 0) {
          const searchStyles = await searchField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderColor: computed.borderColor,
              borderWidth: computed.borderWidth,
              borderRadius: computed.borderRadius,
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              height: computed.height,
              fontSize: computed.fontSize,
            };
          });
          console.log('\n🔍 Clients Search Field Styles:', JSON.stringify(searchStyles, null, 2));
        }
      } catch (err) {
        console.log('Could not find search field:', err.message);
      }

      // Try to find and click "Novo Cliente" button
      try {
        const newClientButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar")');
        await newClientButton.first().waitFor({ state: 'visible', timeout: 3000 });
        await newClientButton.first().click();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(screenshotsDir, '7-clients-new-modal.png'),
          fullPage: true
        });

        // Get detailed styling info for name field
        const nameField = page.locator('input[name="name"], input[placeholder*="Nome"]').first();
        if (await nameField.count() > 0) {
          const styles = await nameField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderColor: computed.borderColor,
              borderWidth: computed.borderWidth,
              borderRadius: computed.borderRadius,
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              height: computed.height,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
            };
          });
          console.log('\n👤 Clients Name Field Styles:', JSON.stringify(styles, null, 2));

          // Focus and capture
          await nameField.focus();
          await page.waitForTimeout(500);

          const focusStyles = await nameField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              borderColor: computed.borderColor,
              outline: computed.outline,
              boxShadow: computed.boxShadow,
            };
          });
          console.log('👤 Clients Name Field Focus Styles:', JSON.stringify(focusStyles, null, 2));

          await page.screenshot({
            path: path.join(screenshotsDir, '8-clients-name-focused.png'),
            fullPage: true
          });

          // Type something to test
          await nameField.fill('Test Client Name');
          await page.waitForTimeout(500);

          await page.screenshot({
            path: path.join(screenshotsDir, '9-clients-typing.png'),
            fullPage: true
          });

          // Test keyboard navigation
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);

          await page.screenshot({
            path: path.join(screenshotsDir, '10-clients-tab-navigation.png'),
            fullPage: true
          });
        }

        // Check email field
        const emailField = page.locator('input[name="email"], input[type="email"]').first();
        if (await emailField.count() > 0) {
          const emailStyles = await emailField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderColor: computed.borderColor,
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              height: computed.height,
            };
          });
          console.log('\n📧 Clients Email Field Styles:', JSON.stringify(emailStyles, null, 2));
        }

        // Check textarea if present
        const notesField = page.locator('textarea').first();
        if (await notesField.count() > 0) {
          const notesStyles = await notesField.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              border: computed.border,
              borderColor: computed.borderColor,
              backgroundColor: computed.backgroundColor,
              padding: computed.padding,
              fontSize: computed.fontSize,
              minHeight: computed.minHeight,
            };
          });
          console.log('\n📝 Clients Notes Textarea Styles:', JSON.stringify(notesStyles, null, 2));
        }

      } catch (err) {
        console.log('Could not interact with Clients modal:', err.message);
      }

      console.log('\n✅ All screenshots captured successfully!');
      console.log(`Screenshots saved to: ${screenshotsDir}`);
      console.log('\nPlease review the screenshots to compare styling consistency.');

    } catch (error) {
      console.error('Test error:', error);
      await page.screenshot({
        path: path.join(screenshotsDir, 'error-screenshot.png'),
        fullPage: true
      });
    } finally {
      await browser.close();
    }
  });
});
