import { test, expect } from '@playwright/test';

test.describe('Special Dates Page Verification', () => {
  test('should load special dates page without 500 error', async ({ page }) => {
    // Setup console logging to catch any errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Navigate to login page
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('load');

    // Take screenshot of login page
    await page.screenshot({
      path: 'screenshots/special-dates-test-1-login.png',
      fullPage: true
    });

    // Fill login credentials
    console.log('Step 2: Entering login credentials...');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    // Take screenshot before clicking submit
    await page.screenshot({
      path: 'screenshots/special-dates-test-2-credentials-filled.png',
      fullPage: true
    });

    // Click submit and wait for navigation
    console.log('Step 3: Submitting login form...');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('load');

    // Wait a bit for authentication to complete
    await page.waitForTimeout(2000);

    // Take screenshot after login attempt
    await page.screenshot({
      path: 'screenshots/special-dates-test-3-after-login.png',
      fullPage: true
    });

    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    // Navigate to special dates page
    console.log('Step 4: Navigating to special dates page...');
    await page.goto('http://localhost:4000/clients/special-dates');

    // Wait for page to load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Check the final URL
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    // Take screenshot of special dates page
    await page.screenshot({
      path: 'screenshots/special-dates-test-4-special-dates-page.png',
      fullPage: true
    });

    // Check for 500 error indicators
    const pageContent = await page.content();
    const has500Error = pageContent.includes('500') ||
                        pageContent.includes('Internal Server Error') ||
                        pageContent.includes('Application error');

    console.log('\n=== TEST RESULTS ===');
    console.log(`Is 500 error present: ${has500Error ? 'YES ❌' : 'NO ✅'}`);

    // Check for page elements
    const headingVisible = await page.locator('h1:has-text("Datas Especiais")').isVisible().catch(() => false);
    console.log(`Is "Datas Especiais" heading visible: ${headingVisible ? 'YES ✅' : 'NO ❌'}`);

    const loadEarlierButton = await page.locator('button:has-text("Load Earlier")').isVisible().catch(() => false);
    console.log(`Is "Load Earlier" button visible: ${loadEarlierButton ? 'YES ✅' : 'NO ❌'}`);

    const loadLaterButton = await page.locator('button:has-text("Load Later")').isVisible().catch(() => false);
    console.log(`Is "Load Later" button visible: ${loadLaterButton ? 'YES ✅' : 'NO ❌'}`);

    // Check for any special dates displayed
    const specialDatesCards = await page.locator('[data-testid*="special-date"]').count().catch(() => 0);
    const specialDatesAltCards = await page.locator('.border.rounded').count().catch(() => 0);
    console.log(`Number of special date cards found: ${Math.max(specialDatesCards, specialDatesAltCards)}`);

    // Report console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      console.log(`Found ${consoleErrors.length} console errors:`);
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('No console errors detected ✅');
    }

    // Report all console messages
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    if (consoleMessages.length > 0) {
      consoleMessages.slice(-10).forEach((msg, index) => {
        console.log(`${consoleMessages.length - 10 + index + 1}. ${msg}`);
      });
    }

    // Final summary
    console.log('\n=== SUMMARY ===');
    console.log(`✓ 500 error gone: ${!has500Error}`);
    console.log(`✓ Page visible: ${headingVisible || loadEarlierButton || loadLaterButton}`);
    console.log(`✓ Load buttons visible: ${loadEarlierButton && loadLaterButton}`);
    console.log(`✓ Console errors: ${consoleErrors.length === 0 ? 'None' : consoleErrors.length}`);

    // Assert no 500 error
    expect(has500Error).toBe(false);
  });
});
