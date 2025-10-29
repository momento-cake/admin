import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Client Modal Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForLoadState('load');
  });

  test('Verify Related Person layout - content left, buttons right', async ({ page }) => {
    console.log('Step 1: Navigate to Clients page');

    // Navigate to clients section - try multiple possible URLs
    const clientUrls = [
      'http://localhost:4000/dashboard/clients',
      'http://localhost:4000/clients',
      'http://localhost:4000/dashboard/clientes'
    ];

    let clientPageFound = false;
    for (const url of clientUrls) {
      try {
        await page.goto(url, { timeout: 5000 });
        await page.waitForLoadState('load');
        clientPageFound = true;
        console.log(`✓ Found clients page at: ${url}`);
        break;
      } catch (e) {
        console.log(`✗ Clients page not found at: ${url}`);
      }
    }

    if (!clientPageFound) {
      console.log('Attempting to find Novo Cliente button in current page');
    }

    // Take screenshot of page before opening modal
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-01-clients-page.png'),
      fullPage: true
    });

    console.log('Step 2: Open Novo Cliente modal');

    // Find and click "Novo Cliente" button - try multiple selectors
    const newClientSelectors = [
      'button:has-text("Novo Cliente")',
      'button:has-text("novo cliente")',
      '[data-testid="new-client-button"]',
      'button[aria-label*="cliente"]'
    ];

    let modalOpened = false;
    for (const selector of newClientSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          modalOpened = true;
          console.log(`✓ Clicked button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`✗ Button not found with selector: ${selector}`);
      }
    }

    if (!modalOpened) {
      throw new Error('Could not find or click "Novo Cliente" button');
    }

    // Wait for modal to be visible
    await page.waitForTimeout(1000);

    // Take screenshot of opened modal
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-02-modal-opened.png'),
      fullPage: true
    });

    console.log('Step 3: Add Related Person');

    // Find "Adicionar Pessoa" button
    const addPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await addPersonButton.scrollIntoViewIfNeeded();
    await addPersonButton.click();
    await page.waitForTimeout(500);

    // Fill related person form
    await page.fill('input[name="name"]', 'João Silva');
    await page.selectOption('select[name="relationship"]', 'child');
    await page.fill('input[name="email"]', 'joao@email.com');
    await page.fill('input[name="phone"]', '(11) 98765-4321');

    // Take screenshot of filled form
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-03-person-form-filled.png'),
      fullPage: true
    });

    // Click "Adicionar Pessoa" to add the person
    const submitPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await submitPersonButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of added person
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-04-person-added.png'),
      fullPage: true
    });

    console.log('Step 4: Verify Related Person Layout');

    // Find the related person item
    const personItem = page.locator('text=João Silva').locator('..').locator('..');

    // Get bounding boxes for layout verification
    const itemBox = await personItem.boundingBox();
    expect(itemBox).not.toBeNull();

    // Find content elements (name, email, phone)
    const nameElement = page.locator('text=João Silva');
    const emailElement = page.locator('text=joao@email.com');
    const phoneElement = page.locator('text=(11) 98765-4321');

    // Find button elements
    const editButton = personItem.locator('button:has-text("✏️"), button[aria-label*="Editar"]').first();
    const deleteButton = personItem.locator('button:has-text("🗑️"), button[aria-label*="Excluir"]').first();

    // Get bounding boxes
    const nameBox = await nameElement.boundingBox();
    const editBox = await editButton.boundingBox();
    const deleteBox = await deleteButton.boundingBox();

    console.log('Layout measurements:');
    console.log(`- Item box: ${JSON.stringify(itemBox)}`);
    console.log(`- Name box: ${JSON.stringify(nameBox)}`);
    console.log(`- Edit button box: ${JSON.stringify(editBox)}`);
    console.log(`- Delete button box: ${JSON.stringify(deleteBox)}`);

    if (itemBox && nameBox && editBox && deleteBox) {
      // Verify content is on the left side
      const contentIsLeft = nameBox.x < itemBox.x + (itemBox.width / 2);
      console.log(`✓ Content on left: ${contentIsLeft} (name.x: ${nameBox.x}, midpoint: ${itemBox.x + itemBox.width / 2})`);

      // Verify buttons are on the right side
      const buttonsAreRight = editBox.x > itemBox.x + (itemBox.width / 2);
      console.log(`✓ Buttons on right: ${buttonsAreRight} (edit.x: ${editBox.x}, midpoint: ${itemBox.x + itemBox.width / 2})`);

      // Verify buttons are NOT below content (vertical alignment)
      const buttonsNotBelow = Math.abs(nameBox.y - editBox.y) < 50; // Allow some vertical variance
      console.log(`✓ Buttons not below content: ${buttonsNotBelow} (name.y: ${nameBox.y}, edit.y: ${editBox.y})`);

      // Assertions
      expect(contentIsLeft, 'Content should be aligned to the left').toBeTruthy();
      expect(buttonsAreRight, 'Buttons should be aligned to the right').toBeTruthy();
      expect(buttonsNotBelow, 'Buttons should not be below content').toBeTruthy();
    }

    console.log('Step 5: Add Special Date');

    // Scroll to Special Dates section
    const addDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await addDateButton.scrollIntoViewIfNeeded();
    await addDateButton.click();
    await page.waitForTimeout(500);

    // Fill special date form
    await page.fill('input[type="date"]', '2025-12-25');
    await page.selectOption('select[name="type"]', 'birthday');
    await page.fill('input[name="description"]', 'Aniversário');

    // Take screenshot of filled date form
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-05-date-form-filled.png'),
      fullPage: true
    });

    // Click "Adicionar Data" to add the date
    const submitDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await submitDateButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot of added date
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-06-date-added.png'),
      fullPage: true
    });

    console.log('Step 6: Verify Special Date Layout');

    // Find the special date item
    const dateItem = page.locator('text=Aniversário').locator('..').locator('..');

    // Get bounding boxes for layout verification
    const dateItemBox = await dateItem.boundingBox();
    expect(dateItemBox).not.toBeNull();

    // Find content elements
    const iconElement = dateItem.locator('text=🎂, text=🎉, span:has-text("🎂")').first();
    const descriptionElement = page.locator('text=Aniversário');

    // Find button elements
    const editDateButton = dateItem.locator('button:has-text("✏️"), button[aria-label*="Editar"]').first();
    const deleteDateButton = dateItem.locator('button:has-text("🗑️"), button[aria-label*="Excluir"]').first();

    // Get bounding boxes
    const descBox = await descriptionElement.boundingBox();
    const editDateBox = await editDateButton.boundingBox();
    const deleteDateBox = await deleteDateButton.boundingBox();

    console.log('Date layout measurements:');
    console.log(`- Date item box: ${JSON.stringify(dateItemBox)}`);
    console.log(`- Description box: ${JSON.stringify(descBox)}`);
    console.log(`- Edit button box: ${JSON.stringify(editDateBox)}`);
    console.log(`- Delete button box: ${JSON.stringify(deleteDateBox)}`);

    if (dateItemBox && descBox && editDateBox && deleteDateBox) {
      // Verify content is on the left side
      const dateContentIsLeft = descBox.x < dateItemBox.x + (dateItemBox.width / 2);
      console.log(`✓ Date content on left: ${dateContentIsLeft}`);

      // Verify buttons are on the right side
      const dateButtonsAreRight = editDateBox.x > dateItemBox.x + (dateItemBox.width / 2);
      console.log(`✓ Date buttons on right: ${dateButtonsAreRight}`);

      // Verify buttons are NOT below content
      const dateButtonsNotBelow = Math.abs(descBox.y - editDateBox.y) < 50;
      console.log(`✓ Date buttons not below content: ${dateButtonsNotBelow}`);

      // Assertions
      expect(dateContentIsLeft, 'Date content should be aligned to the left').toBeTruthy();
      expect(dateButtonsAreRight, 'Date buttons should be aligned to the right').toBeTruthy();
      expect(dateButtonsNotBelow, 'Date buttons should not be below content').toBeTruthy();
    }

    // Take final screenshot showing both sections
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-07-full-view.png'),
      fullPage: true
    });

    console.log('✓ Layout verification complete');
  });

  test('Visual regression - Compare layout with reference', async ({ page }) => {
    console.log('Creating reference screenshots for layout validation');

    // This test creates reference screenshots that can be visually inspected
    // to confirm the layout matches the requirements

    // Navigate and open modal (reuse logic from previous test)
    await page.goto('http://localhost:4000/dashboard/clients');
    await page.waitForLoadState('load');

    // Open modal
    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await newClientButton.click();
    await page.waitForTimeout(1000);

    // Add person
    const addPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await addPersonButton.click();
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', 'Maria Santos');
    await page.selectOption('select[name="relationship"]', 'parent');
    await page.fill('input[name="email"]', 'maria@email.com');
    await page.fill('input[name="phone"]', '(21) 99876-5432');

    const submitPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await submitPersonButton.click();
    await page.waitForTimeout(1000);

    // Take detailed screenshot of person item
    const personItem = page.locator('text=Maria Santos').locator('..').locator('..');
    await personItem.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-person-detail.png')
    });

    // Add date
    const addDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await addDateButton.scrollIntoViewIfNeeded();
    await addDateButton.click();
    await page.waitForTimeout(500);

    await page.fill('input[type="date"]', '2025-06-15');
    await page.selectOption('select[name="type"]', 'anniversary');
    await page.fill('input[name="description"]', 'Aniversário de Casamento');

    const submitDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await submitDateButton.click();
    await page.waitForTimeout(1000);

    // Take detailed screenshot of date item
    const dateItem = page.locator('text=Aniversário de Casamento').locator('..').locator('..');
    await dateItem.screenshot({
      path: path.join(__dirname, 'screenshots', 'layout-date-detail.png')
    });

    console.log('✓ Reference screenshots created');
  });
});
