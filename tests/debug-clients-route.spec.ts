import { test, expect } from '@playwright/test';

/**
 * DEBUG TEST - Check if clients route is accessible
 */

test('Debug: Check clients route accessibility', async ({ page }) => {
  console.log('Step 1: Login...');

  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');

  await page.waitForURL(/.*\/dashboard\/?/, { timeout: 10000 });
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);

  console.log('✅ Logged in');
  await page.screenshot({ path: 'tests/screenshots/debug-01-dashboard.png', fullPage: true });

  console.log('Step 2: Navigate to clients...');

  // Try clicking the link in the sidebar
  const clientsLink = page.locator('a:has-text("Clientes")').first();
  const isVisible = await clientsLink.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    console.log('  - Found "Clientes" link in sidebar');
    await clientsLink.click();
    console.log('  - Clicked link');
  } else {
    console.log('  - No "Clientes" link found, navigating directly');
    await page.goto('http://localhost:4000/dashboard/clients');
  }

  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  console.log('Step 3: Check page content...');

  const url = page.url();
  console.log(`  - Current URL: ${url}`);

  await page.screenshot({ path: 'tests/screenshots/debug-02-after-navigation.png', fullPage: true });

  // Check for 404
  const has404 = await page.locator('text="404"').isVisible().catch(() => false);
  const hasNotFound = await page.locator('text=/not be found/i').isVisible().catch(() => false);

  if (has404 || hasNotFound) {
    console.log('  ❌ Page shows 404 error');
  } else {
    console.log('  ✅ Page loaded (no 404)');
  }

  // Check for page title
  const hasTitle = await page.locator('h1:has-text("Clientes")').isVisible({ timeout: 2000 }).catch(() => false);
  if (hasTitle) {
    console.log('  ✅ Found "Clientes" title');
  } else {
    console.log('  ❌ No "Clientes" title found');
  }

  // Check for button
  const hasButton = await page.locator('button:has-text("Novo Cliente")').isVisible({ timeout: 2000 }).catch(() => false);
  if (hasButton) {
    console.log('  ✅ Found "Novo Cliente" button');
  } else {
    console.log('  ❌ No "Novo Cliente" button found');
  }

  // Get page HTML for debugging
  const bodyText = await page.locator('body').textContent();
  console.log(`  - Page text content (first 200 chars): ${bodyText?.slice(0, 200)}`);
});
