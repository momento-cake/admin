import { test, expect } from '@playwright/test';

test.describe('Special Dates Error Investigation', () => {
  test('Navigate to special-dates page and capture error details', async ({ page }) => {
    // Enable console message capture
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number; statusText: string }[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Capture network responses
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('load');

    // Take screenshot of login page
    await page.screenshot({
      path: 'tests/screenshots/01-login-page.png',
      fullPage: true
    });

    // Fill login form
    console.log('Step 2: Filling login credentials...');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    // Take screenshot before login
    await page.screenshot({
      path: 'tests/screenshots/02-before-login.png',
      fullPage: true
    });

    // Click login button
    console.log('Step 3: Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for redirect

    console.log(`Current URL after login: ${page.url()}`);

    // Take screenshot after login
    await page.screenshot({
      path: 'tests/screenshots/03-after-login.png',
      fullPage: true
    });

    // Navigate to special-dates page
    console.log('Step 4: Navigating to /clients/special-dates...');
    await page.goto('http://localhost:4000/clients/special-dates');

    // Wait for page to load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for any async errors

    console.log(`Current URL: ${page.url()}`);

    // Take screenshot of special-dates page (with error)
    await page.screenshot({
      path: 'tests/screenshots/04-special-dates-error.png',
      fullPage: true
    });

    // Try to capture error message text
    const pageText = await page.locator('body').textContent();
    console.log('\n=== PAGE CONTENT ===');
    console.log(pageText?.substring(0, 500)); // First 500 chars

    // Look for specific error elements
    const errorHeading = await page.locator('h1, h2').first().textContent().catch(() => null);
    console.log(`\nError heading: ${errorHeading}`);

    // Check for error details
    const errorDetails = await page.locator('pre, code').textContent().catch(() => null);
    if (errorDetails) {
      console.log('\n=== ERROR DETAILS ===');
      console.log(errorDetails);
    }

    // Print console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Print all console messages
    if (consoleMessages.length > 0) {
      console.log('\n=== ALL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg}`);
      });
    }

    // Print network errors
    if (networkErrors.length > 0) {
      console.log('\n=== NETWORK ERRORS ===');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.status} ${error.statusText} - ${error.url}`);
      });
    }

    // Try to get any visible error messages
    const errorElements = await page.locator('text=/error|Error|ERROR|500|fail|Fail/i').all();
    if (errorElements.length > 0) {
      console.log('\n=== VISIBLE ERROR ELEMENTS ===');
      for (let i = 0; i < Math.min(errorElements.length, 10); i++) {
        const text = await errorElements[i].textContent();
        console.log(`${i + 1}. ${text}`);
      }
    }

    // Report summary
    console.log('\n=== INVESTIGATION SUMMARY ===');
    console.log(`Final URL: ${page.url()}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Screenshots saved to: tests/screenshots/`);
  });
});
