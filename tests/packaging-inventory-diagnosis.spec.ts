import { test, expect } from '@playwright/test';

test.describe('Packaging Inventory Page Diagnosis', () => {
  test('should diagnose issues on packaging inventory page', async ({ page }) => {
    // Capture console messages
    const consoleMessages: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Capture network failures
    const failedRequests: { url: string; status: number; statusText: string }[] = [];
    page.on('response', (response) => {
      if (!response.ok() && response.status() !== 304) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });

    console.log('=== STEP 1: Navigating to login page ===');
    await page.goto('http://localhost:4000/login', { waitUntil: 'load' });
    await page.screenshot({ path: 'test-results/01-login-page.png', fullPage: true });

    console.log('=== STEP 2: Filling in login credentials ===');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.screenshot({ path: 'test-results/02-login-filled.png', fullPage: true });

    console.log('=== STEP 3: Submitting login form ===');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for redirect

    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true });

    console.log('=== STEP 4: Navigating to packaging inventory page ===');
    await page.goto('http://localhost:4000/packaging/inventory', { waitUntil: 'load' });
    await page.waitForTimeout(2000); // Give page time to render/error

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    console.log('=== STEP 5: Capturing page content ===');
    await page.screenshot({ path: 'test-results/04-packaging-inventory.png', fullPage: true });

    // Check for error messages on the page
    const pageContent = await page.content();
    const bodyText = await page.locator('body').textContent();

    // Look for common error indicators
    const has404 = bodyText?.includes('404') || bodyText?.includes('Not Found');
    const has500 = bodyText?.includes('500') || bodyText?.includes('Internal Server Error');
    const hasError = bodyText?.includes('Error') || bodyText?.includes('error');

    // Check if page is blank
    const visibleText = bodyText?.trim() || '';

    console.log('\n=== DIAGNOSTIC REPORT ===');
    console.log('\n--- Page Information ---');
    console.log(`Final URL: ${finalUrl}`);
    console.log(`Page appears blank: ${visibleText.length < 50}`);
    console.log(`Has 404 error: ${has404}`);
    console.log(`Has 500 error: ${has500}`);
    console.log(`Has error message: ${hasError}`);

    console.log('\n--- Page Text Content (first 500 chars) ---');
    console.log(visibleText.substring(0, 500));

    console.log('\n--- Console Messages ---');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\nError messages:');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.text}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\nWarning messages:');
      warnings.slice(0, 5).forEach((warn, idx) => {
        console.log(`${idx + 1}. ${warn.text}`);
      });
    }

    console.log('\n--- Page Errors ---');
    if (pageErrors.length > 0) {
      pageErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err}`);
      });
    } else {
      console.log('No page errors captured');
    }

    console.log('\n--- Failed Network Requests ---');
    if (failedRequests.length > 0) {
      failedRequests.forEach((req, idx) => {
        console.log(`${idx + 1}. [${req.status}] ${req.url}`);
      });
    } else {
      console.log('No failed network requests');
    }

    console.log('\n--- DOM Elements Check ---');
    // Check for specific elements
    const hasHeader = await page.locator('header').count() > 0;
    const hasSidebar = await page.locator('nav, aside, [role="navigation"]').count() > 0;
    const hasMain = await page.locator('main').count() > 0;
    const hasErrorBoundary = await page.locator('[data-error-boundary], .error-boundary').count() > 0;

    console.log(`Has header: ${hasHeader}`);
    console.log(`Has sidebar: ${hasSidebar}`);
    console.log(`Has main content: ${hasMain}`);
    console.log(`Has error boundary: ${hasErrorBoundary}`);

    // Try to find any error text elements
    const errorElements = await page.locator('[class*="error"], [role="alert"], .text-red-500, .text-destructive').all();
    if (errorElements.length > 0) {
      console.log('\nError elements found:');
      for (let i = 0; i < Math.min(errorElements.length, 5); i++) {
        const text = await errorElements[i].textContent();
        console.log(`${i + 1}. ${text?.trim()}`);
      }
    }

    console.log('\n=== END DIAGNOSTIC REPORT ===\n');

    // This test is for diagnosis, so we don't assert - just report
  });
});
