import { test, expect } from '@playwright/test';
import path from 'path';

// Test to verify textfield styling consistency between Clients and Users screens
test.describe('Textfield Styling Consistency', () => {
  const screenshotsDir = path.join(__dirname, '../screenshots/textfield-consistency');

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('Test 1: Users Screen Textfields', async ({ page }) => {
    console.log('\n=== Test 1: Users Screen Textfields ===');

    // Navigate to Users > Active Users
    await page.goto('http://localhost:3000/users/active');
    await page.waitForLoadState('load');

    // Click "Convidar Usuário" button to open invite dialog
    const inviteButton = page.locator('button:has-text("Convidar Usuário")');
    await inviteButton.waitFor({ state: 'visible', timeout: 5000 });
    await inviteButton.click();

    // Wait for dialog to appear
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

    // Take screenshot of the invite dialog
    await page.screenshot({
      path: path.join(screenshotsDir, 'users-invite-dialog.png'),
      fullPage: true
    });

    // Examine textfield styling
    const emailField = page.locator('input[name="email"]');
    const nameField = page.locator('input[name="name"]');

    // Get computed styles for email field
    const emailStyles = await emailField.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        border: styles.border,
        borderColor: styles.borderColor,
        borderWidth: styles.borderWidth,
        borderRadius: styles.borderRadius,
        backgroundColor: styles.backgroundColor,
        padding: styles.padding,
        height: styles.height,
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily,
      };
    });

    console.log('Users Screen - Email Field Styles:', emailStyles);

    // Take focused state screenshot
    await emailField.focus();
    await page.screenshot({
      path: path.join(screenshotsDir, 'users-email-focused.png'),
      fullPage: true
    });

    // Get focus state styles
    const emailFocusStyles = await emailField.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        border: styles.border,
        borderColor: styles.borderColor,
        outline: styles.outline,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow,
      };
    });

    console.log('Users Screen - Email Field Focus Styles:', emailFocusStyles);
  });

  test('Test 2: Clients Screen Textfields', async ({ page }) => {
    console.log('\n=== Test 2: Clients Screen Textfields ===');

    // Navigate to Clients
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');

    // Take screenshot of clients list page (showing search/filter inputs)
    await page.screenshot({
      path: path.join(screenshotsDir, 'clients-list-page.png'),
      fullPage: true
    });

    // Examine search field on list page
    const searchField = page.locator('input[type="search"], input[placeholder*="Buscar"]').first();
    if (await searchField.count() > 0) {
      const searchStyles = await searchField.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          border: styles.border,
          borderColor: styles.borderColor,
          borderWidth: styles.borderWidth,
          borderRadius: styles.borderRadius,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          height: styles.height,
          fontSize: styles.fontSize,
        };
      });
      console.log('Clients Screen - Search Field Styles:', searchStyles);
    }

    // Click "Novo Cliente" button to open modal
    const newClientButton = page.locator('button:has-text("Novo Cliente")');
    await newClientButton.waitFor({ state: 'visible', timeout: 5000 });
    await newClientButton.click();

    // Wait for modal/dialog to appear
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

    // Take screenshot of the new client modal
    await page.screenshot({
      path: path.join(screenshotsDir, 'clients-new-modal.png'),
      fullPage: true
    });

    // Examine textfield styling for various fields
    const nameField = page.locator('input[name="name"], input[placeholder*="Nome"]').first();
    const emailField = page.locator('input[name="email"], input[type="email"]').first();
    const cpfField = page.locator('input[name="cpf"], input[name="cpfCnpj"]').first();
    const phoneField = page.locator('input[name="phone"], input[name="telefone"]').first();

    // Get computed styles for name field
    if (await nameField.count() > 0) {
      const nameStyles = await nameField.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          border: styles.border,
          borderColor: styles.borderColor,
          borderWidth: styles.borderWidth,
          borderRadius: styles.borderRadius,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          height: styles.height,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
        };
      });

      console.log('Clients Screen - Name Field Styles:', nameStyles);

      // Take focused state screenshot
      await nameField.focus();
      await page.screenshot({
        path: path.join(screenshotsDir, 'clients-name-focused.png'),
        fullPage: true
      });

      // Get focus state styles
      const nameFocusStyles = await nameField.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          border: styles.border,
          borderColor: styles.borderColor,
          outline: styles.outline,
          outlineColor: styles.outlineColor,
          boxShadow: styles.boxShadow,
        };
      });

      console.log('Clients Screen - Name Field Focus Styles:', nameFocusStyles);
    }

    // Test email field if present
    if (await emailField.count() > 0) {
      const emailStyles = await emailField.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          border: styles.border,
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          height: styles.height,
          fontSize: styles.fontSize,
        };
      });
      console.log('Clients Screen - Email Field Styles:', emailStyles);
    }

    // Test textarea (Notas Adicionais) if present
    const notesField = page.locator('textarea[name="notes"], textarea[placeholder*="Nota"]').first();
    if (await notesField.count() > 0) {
      const notesStyles = await notesField.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          border: styles.border,
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          fontSize: styles.fontSize,
          minHeight: styles.minHeight,
        };
      });
      console.log('Clients Screen - Notes Textarea Styles:', notesStyles);
    }
  });

  test('Test 3 & 4: Consistency Verification and Functionality', async ({ page }) => {
    console.log('\n=== Test 3 & 4: Consistency Verification ===');

    // Create side-by-side comparison screenshot
    // First, capture Users screen
    await page.goto('http://localhost:3000/users/active');
    await page.waitForLoadState('load');
    await page.locator('button:has-text("Convidar Usuário")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const usersDialogScreenshot = await page.screenshot({ fullPage: true });

    // Then capture Clients screen
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');
    await page.locator('button:has-text("Novo Cliente")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const clientsDialogScreenshot = await page.screenshot({ fullPage: true });

    // Test functionality - type in fields on Users screen
    await page.goto('http://localhost:3000/users/active');
    await page.waitForLoadState('load');
    await page.locator('button:has-text("Convidar Usuário")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const usersEmailField = page.locator('input[name="email"]');
    await usersEmailField.fill('test@example.com');
    await page.screenshot({
      path: path.join(screenshotsDir, 'users-typing-test.png'),
      fullPage: true
    });

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.screenshot({
      path: path.join(screenshotsDir, 'users-tab-navigation.png'),
      fullPage: true
    });

    // Test functionality - type in fields on Clients screen
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');
    await page.locator('button:has-text("Novo Cliente")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    const clientsNameField = page.locator('input[name="name"], input[placeholder*="Nome"]').first();
    if (await clientsNameField.count() > 0) {
      await clientsNameField.fill('Test Client');
      await page.screenshot({
        path: path.join(screenshotsDir, 'clients-typing-test.png'),
        fullPage: true
      });

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.screenshot({
        path: path.join(screenshotsDir, 'clients-tab-navigation.png'),
        fullPage: true
      });
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`Screenshots saved to: ${screenshotsDir}`);
  });
});
