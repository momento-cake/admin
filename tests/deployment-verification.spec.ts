import { test, expect } from '@playwright/test';

/**
 * Firebase App Hosting Deployment Verification Test
 *
 * Test URL: https://admin-dev--momentocake-admin-dev.us-east4.hosted.app
 *
 * Objectives:
 * 1. Verify site loads without build errors
 * 2. Test authentication flow with admin credentials
 * 3. Verify successful redirect to dashboard after login
 */

const DEPLOYMENT_URL = 'https://admin-dev--momentocake-admin-dev.us-east4.hosted.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

// Reliable selectors from CLAUDE.md
const SELECTORS = {
  email: 'input[type="email"]',
  password: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
};

test.describe('Firebase App Hosting Deployment Verification', () => {
  test.setTimeout(60000); // 60 seconds timeout for network requests

  test('should load deployment site successfully', async ({ page }) => {
    console.log('Step 1: Navigate to deployment URL...');

    // Navigate to deployment URL
    const response = await page.goto(DEPLOYMENT_URL, {
      waitUntil: 'load', // Use 'load' not 'networkidle'
      timeout: 30000
    });

    // Verify response is successful
    expect(response?.status()).toBeLessThan(400);
    console.log(`✓ Site loaded with status: ${response?.status()}`);

    // Take screenshot of initial page
    await page.screenshot({
      path: 'test-results/deployment-initial-page.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployment-initial-page.png');

    // Get current URL to check if redirected
    const currentURL = page.url();
    console.log(`Current URL: ${currentURL}`);
  });

  test('should authenticate and access dashboard', async ({ page }) => {
    console.log('Step 2: Navigate to deployment URL...');

    await page.goto(DEPLOYMENT_URL, {
      waitUntil: 'load',
      timeout: 30000
    });

    await page.waitForLoadState('load');
    const initialURL = page.url();
    console.log(`Initial URL: ${initialURL}`);

    // Check if we're on login page
    const isLoginPage = initialURL.includes('/login') ||
                       await page.locator(SELECTORS.email).isVisible({ timeout: 5000 }).catch(() => false);

    if (!isLoginPage) {
      console.log('⚠ Not redirected to login page - may already be authenticated or different landing page');
      await page.screenshot({
        path: 'test-results/deployment-no-login-redirect.png',
        fullPage: true
      });

      // Check if we're already on dashboard
      if (initialURL.includes('/dashboard')) {
        console.log('✓ Already on dashboard - authentication may be persisted');
        return;
      }
    }

    console.log('Step 3: Fill in login credentials...');

    // Wait for email input to be visible
    await page.waitForSelector(SELECTORS.email, { state: 'visible', timeout: 10000 });

    // Fill email
    await page.fill(SELECTORS.email, ADMIN_EMAIL);
    console.log('✓ Email filled');

    // Fill password
    await page.fill(SELECTORS.password, ADMIN_PASSWORD);
    console.log('✓ Password filled');

    // Take screenshot before submit
    await page.screenshot({
      path: 'test-results/deployment-before-login.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployment-before-login.png');

    console.log('Step 4: Submit login form...');

    // Click submit button
    await page.click(SELECTORS.submitButton);
    console.log('✓ Submit button clicked');

    // Wait for navigation using 'load' state (NOT 'networkidle')
    await page.waitForLoadState('load');

    // Wait a bit more for any client-side redirects
    await page.waitForTimeout(2000);

    const finalURL = page.url();
    console.log(`Final URL after login: ${finalURL}`);

    // Take screenshot after login attempt
    await page.screenshot({
      path: 'test-results/deployment-after-login.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployment-after-login.png');

    console.log('Step 5: Verify login success...');

    // Check if redirected to dashboard
    const isOnDashboard = finalURL.includes('/dashboard');

    if (isOnDashboard) {
      console.log('✅ SUCCESS: Login successful - redirected to dashboard');

      // Verify dashboard elements are visible
      const dashboardVisible = await page.locator('body').isVisible();
      expect(dashboardVisible).toBeTruthy();

      // Check for common dashboard elements (user avatar, sidebar, etc.)
      const hasUserAvatar = await page.locator('[data-testid=user-avatar]').isVisible({ timeout: 5000 })
        .catch(() => false);
      const hasSidebar = await page.locator('[data-testid=sidebar]').isVisible({ timeout: 5000 })
        .catch(() => false);

      console.log(`Dashboard indicators - Avatar: ${hasUserAvatar}, Sidebar: ${hasSidebar}`);
    } else {
      console.log('❌ FAILURE: Login did not redirect to dashboard');
      console.log(`Expected URL to contain '/dashboard', got: ${finalURL}`);

      // Check for error messages
      const errorMessage = await page.locator('[role="alert"]').textContent()
        .catch(() => null);
      if (errorMessage) {
        console.log(`Error message found: ${errorMessage}`);
      }

      // This will fail the test
      expect(finalURL).toContain('/dashboard');
    }
  });

  test('should verify dashboard accessibility after authentication', async ({ page }) => {
    console.log('Step 6: Direct dashboard access test...');

    // First authenticate
    await page.goto(DEPLOYMENT_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('load');

    // Check if login is needed
    const needsLogin = await page.locator(SELECTORS.email).isVisible({ timeout: 5000 })
      .catch(() => false);

    if (needsLogin) {
      console.log('Authenticating first...');
      await page.fill(SELECTORS.email, ADMIN_EMAIL);
      await page.fill(SELECTORS.password, ADMIN_PASSWORD);
      await page.click(SELECTORS.submitButton);
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);
    }

    // Now try to access dashboard directly
    console.log('Accessing dashboard directly...');
    await page.goto(`${DEPLOYMENT_URL}/dashboard`, {
      waitUntil: 'load',
      timeout: 30000
    });

    await page.waitForLoadState('load');
    const dashboardURL = page.url();
    console.log(`Dashboard URL: ${dashboardURL}`);

    // Verify we're on dashboard (not redirected back to login)
    const isOnDashboard = dashboardURL.includes('/dashboard');
    expect(isOnDashboard).toBeTruthy();

    if (isOnDashboard) {
      console.log('✅ Dashboard is accessible after authentication');
    } else {
      console.log('❌ Dashboard access failed - redirected to:', dashboardURL);
    }

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/deployment-dashboard-access.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: deployment-dashboard-access.png');
  });
});
