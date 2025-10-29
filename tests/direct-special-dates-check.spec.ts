import { test, expect } from '@playwright/test';

test.describe('Direct Special Dates Investigation', () => {
  test('Navigate directly to special-dates and capture error', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Navigate directly to special-dates page
    console.log('Navigating to /clients/special-dates...');
    await page.goto('http://localhost:4000/clients/special-dates');

    // Wait for page to load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log(`Current URL: ${page.url()}`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/special-dates-direct.png',
      fullPage: true
    });

    // Get page content
    const bodyText = await page.locator('body').textContent();
    console.log('\n=== PAGE CONTENT ===');
    console.log(bodyText);

    // Try to find error message
    const errorText = await page.locator('text=/Runtime Error|Cannot find module|Error/i').first().textContent().catch(() => null);
    if (errorText) {
      console.log('\n=== ERROR FOUND ===');
      console.log(errorText);
    }

    // Get all visible text
    const allText = await page.locator('body').evaluate((body) => {
      return body.innerText;
    });
    console.log('\n=== ALL VISIBLE TEXT ===');
    console.log(allText);

    // Print console messages
    if (consoleMessages.length > 0) {
      console.log('\n=== CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg) => console.log(msg));
    }
  });
});
