import { test, expect } from '@playwright/test';

/**
 * Client Modal Button Interaction Test
 * Tests the "Adicionar Pessoa" and "Adicionar Data" button functionality
 * in the client creation modal to verify they are clickable and functional
 */

const TEST_USER = {
  email: 'admin@momentocake.com.br',
  password: 'G8j5k188'
};

test.describe('Client Modal Button Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login');

    // Login with admin credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Successfully logged in');
  });

  test('should open client modal and test "Adicionar Pessoa" button', async ({ page }) => {
    // Navigate to clients page - try multiple possible routes
    const clientRoutes = [
      '/dashboard/clients',
      '/clients',
      '/dashboard/clientes'
    ];

    let navigated = false;
    for (const route of clientRoutes) {
      try {
        await page.goto(`http://localhost:3001${route}`, { timeout: 5000 });
        navigated = true;
        console.log(`✅ Navigated to: ${route}`);
        break;
      } catch (e) {
        console.log(`❌ Route not found: ${route}`);
      }
    }

    if (!navigated) {
      throw new Error('Could not find clients page');
    }

    // Take screenshot of clients page
    await page.screenshot({ path: 'screenshots/01-clients-page.png', fullPage: true });
    console.log('📸 Screenshot: clients page');

    // Look for "Novo Cliente" or "Add Client" button
    const addClientButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Add Client"), button:has-text("Adicionar Cliente")').first();

    // Wait for button to be visible
    await addClientButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Found "Novo Cliente" button');

    // Click to open modal
    await addClientButton.click();
    console.log('🖱️ Clicked "Novo Cliente" button');

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Take screenshot of opened modal
    await page.screenshot({ path: 'screenshots/02-modal-opened.png', fullPage: true });
    console.log('📸 Screenshot: modal opened');

    // Fill in basic client information first
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Client - Button Verification');
      console.log('✅ Filled client name');
    }

    // Look for "Adicionar Pessoa" button in Related Persons section
    console.log('🔍 Looking for "Adicionar Pessoa" button...');

    // Try multiple selectors
    const addPersonSelectors = [
      'button:has-text("Adicionar Pessoa")',
      'button:has-text("Add Person")',
      '[data-testid="add-person-button"]',
      'button[aria-label*="adicionar pessoa" i]',
      'button[aria-label*="add person" i]'
    ];

    let addPersonButton = null;
    for (const selector of addPersonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        addPersonButton = button;
        console.log(`✅ Found "Adicionar Pessoa" button with selector: ${selector}`);
        break;
      }
    }

    if (!addPersonButton) {
      console.log('❌ Could not find "Adicionar Pessoa" button, checking page content...');
      const bodyText = await page.textContent('body');
      console.log('Page contains "Adicionar Pessoa":', bodyText?.includes('Adicionar Pessoa'));

      // Take diagnostic screenshot
      await page.screenshot({ path: 'screenshots/03-pessoa-button-search.png', fullPage: true });
      console.log('📸 Screenshot: searching for Adicionar Pessoa button');

      throw new Error('Could not locate "Adicionar Pessoa" button');
    }

    // Check button position and visibility
    const buttonBox = await addPersonButton.boundingBox();
    console.log('📍 Button position:', buttonBox);

    // Scroll to button if needed
    await addPersonButton.scrollIntoViewIfNeeded();
    console.log('📜 Scrolled to button');

    // Take screenshot before clicking
    await page.screenshot({ path: 'screenshots/04-before-pessoa-click.png', fullPage: true });
    console.log('📸 Screenshot: before clicking Adicionar Pessoa');

    // Try to click the button
    console.log('🖱️ Attempting to click "Adicionar Pessoa" button...');
    await addPersonButton.click({ force: false, timeout: 5000 });
    console.log('✅ Clicked "Adicionar Pessoa" button');

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'screenshots/05-after-pessoa-click.png', fullPage: true });
    console.log('📸 Screenshot: after clicking Adicionar Pessoa');

    // Verify form fields appeared
    const personNameInput = page.locator('input[name*="person" i][name*="name" i], input[placeholder*="nome da pessoa" i]').first();
    const formVisible = await personNameInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (formVisible) {
      console.log('✅ Person form appeared successfully!');

      // Fill in person details
      await personNameInput.fill('João Silva');
      console.log('✅ Filled person name');

      // Try to find relationship field
      const relationshipInput = page.locator('input[name*="relationship" i], input[placeholder*="parentesco" i]').first();
      if (await relationshipInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await relationshipInput.fill('Pai');
        console.log('✅ Filled relationship');
      }

      // Take screenshot with filled form
      await page.screenshot({ path: 'screenshots/06-pessoa-form-filled.png', fullPage: true });
      console.log('📸 Screenshot: person form filled');

      // Look for submit/save button within the person form
      const savePersonButton = page.locator('button:has-text("Salvar"), button:has-text("Adicionar"), button:has-text("Save")').last();
      if (await savePersonButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await savePersonButton.click();
        console.log('✅ Clicked save person button');
        await page.waitForTimeout(500);
      }
    } else {
      console.log('❌ Person form did not appear after clicking button');
      throw new Error('Person form did not appear - button click may not have worked');
    }
  });

  test('should open client modal and test "Adicionar Data" button', async ({ page }) => {
    // Navigate to clients page
    await page.goto('http://localhost:3001/dashboard/clients', { waitUntil: 'load' });

    // Open modal
    const addClientButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Add Client")').first();
    await addClientButton.click();
    await page.waitForTimeout(1000);

    console.log('🔍 Looking for "Adicionar Data" button...');

    // Look for "Adicionar Data" button in Special Dates section
    const addDateSelectors = [
      'button:has-text("Adicionar Data")',
      'button:has-text("Add Date")',
      '[data-testid="add-date-button"]',
      'button[aria-label*="adicionar data" i]',
      'button[aria-label*="add date" i]'
    ];

    let addDateButton = null;
    for (const selector of addDateSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        addDateButton = button;
        console.log(`✅ Found "Adicionar Data" button with selector: ${selector}`);
        break;
      }
    }

    if (!addDateButton) {
      console.log('❌ Could not find "Adicionar Data" button');
      await page.screenshot({ path: 'screenshots/07-data-button-search.png', fullPage: true });
      console.log('📸 Screenshot: searching for Adicionar Data button');
      throw new Error('Could not locate "Adicionar Data" button');
    }

    // Scroll to button
    await addDateButton.scrollIntoViewIfNeeded();

    // Take screenshot before clicking
    await page.screenshot({ path: 'screenshots/08-before-data-click.png', fullPage: true });
    console.log('📸 Screenshot: before clicking Adicionar Data');

    // Click the button
    console.log('🖱️ Attempting to click "Adicionar Data" button...');
    await addDateButton.click({ force: false, timeout: 5000 });
    console.log('✅ Clicked "Adicionar Data" button');

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'screenshots/09-after-data-click.png', fullPage: true });
    console.log('📸 Screenshot: after clicking Adicionar Data');

    // Verify form fields appeared
    const dateTypeInput = page.locator('input[name*="date" i][name*="type" i], input[placeholder*="tipo" i], select[name*="type" i]').first();
    const formVisible = await dateTypeInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (formVisible) {
      console.log('✅ Date form appeared successfully!');

      // Fill in date details
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dateInput.fill('2025-12-25');
        console.log('✅ Filled date');
      }

      // Try to fill type/description
      await dateTypeInput.fill('Aniversário');
      console.log('✅ Filled date type');

      // Take screenshot with filled form
      await page.screenshot({ path: 'screenshots/10-data-form-filled.png', fullPage: true });
      console.log('📸 Screenshot: date form filled');

      // Look for submit/save button
      const saveDateButton = page.locator('button:has-text("Salvar"), button:has-text("Adicionar"), button:has-text("Save")').last();
      if (await saveDateButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveDateButton.click();
        console.log('✅ Clicked save date button');
        await page.waitForTimeout(500);
      }
    } else {
      console.log('❌ Date form did not appear after clicking button');
      throw new Error('Date form did not appear - button click may not have worked');
    }
  });
});
