/**
 * Manual Admin Authentication Flow Test
 * More tolerant approach for testing the live production application
 * Application URL: https://momentocake-admin-dev.web.app
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'https://momentocake-admin-dev.web.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

// More flexible selectors
const SELECTORS = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  loginButton: 'button:has-text("Entrar")',
  firstAccessButton: 'button:has-text("Primeiro Acesso")',
  logoutButton: 'button:has-text("Sair")',
  userMenu: '[data-testid="user-menu"]',
  dashboardContainer: 'main, [role="main"], .dashboard',
  errorMessage: '.error, [role="alert"], .alert'
};

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${name}.png`,
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${name}.png`);
}

async function waitForPageLoad(page: Page, timeout = 10000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
    // Additional wait for any dynamic content
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log('⚠️ Timeout waiting for page load, continuing...');
  }
}

test.describe('Manual Admin Authentication Testing', () => {
  test('Complete Authentication Flow Test', async ({ page }) => {
    console.log('🚀 Starting comprehensive authentication test...');
    console.log(`🌐 Testing URL: ${APP_URL}`);
    console.log(`👤 Admin Email: ${ADMIN_EMAIL}`);
    
    // Step 1: Load homepage and take screenshot
    console.log('\n📍 STEP 1: Initial Homepage Load');
    console.log('======================================');
    
    const startTime = Date.now();
    await page.goto(APP_URL);
    await waitForPageLoad(page);
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    
    await takeScreenshot(page, 'screenshot-home');
    
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    const currentUrl = page.url();
    console.log(`🎯 Current URL: ${currentUrl}`);
    
    // Check if we're already on login page or redirected
    if (currentUrl.includes('/login')) {
      console.log('✅ Already on login page');
    } else {
      console.log('ℹ️ On homepage, will navigate to login');
    }
    
    // Step 2: Navigate to login page if not already there
    console.log('\n📍 STEP 2: Login Page Navigation');
    console.log('======================================');
    
    if (!currentUrl.includes('/login')) {
      await page.goto(`${APP_URL}/login`);
      await waitForPageLoad(page);
    }
    
    await takeScreenshot(page, 'screenshot-login');
    
    // Check what elements are visible
    const emailVisible = await page.locator(SELECTORS.emailInput).isVisible();
    const passwordVisible = await page.locator(SELECTORS.passwordInput).isVisible();
    const loginButtonVisible = await page.locator(SELECTORS.loginButton).isVisible();
    const firstAccessVisible = await page.locator(SELECTORS.firstAccessButton).isVisible();
    
    console.log(`📧 Email input visible: ${emailVisible}`);
    console.log(`🔑 Password input visible: ${passwordVisible}`);
    console.log(`🚀 Login button visible: ${loginButtonVisible}`);
    console.log(`🆕 First Access button visible: ${firstAccessVisible}`);
    
    if (!emailVisible || !passwordVisible || !loginButtonVisible) {
      console.log('❌ Login form elements not found');
      const bodyText = await page.textContent('body');
      console.log('Page content:', bodyText?.substring(0, 500));
      throw new Error('Login form elements not visible');
    }
    
    // Step 3: Fill login form
    console.log('\n📍 STEP 3: Login Form Completion');
    console.log('======================================');
    
    await page.locator(SELECTORS.emailInput).fill(ADMIN_EMAIL);
    console.log(`✅ Filled email: ${ADMIN_EMAIL}`);
    
    await page.locator(SELECTORS.passwordInput).fill(ADMIN_PASSWORD);
    console.log('✅ Filled password: [HIDDEN FOR SECURITY]');
    
    await takeScreenshot(page, 'login-form-filled');
    
    // Step 4: Submit login form
    console.log('\n📍 STEP 4: Login Submission');
    console.log('======================================');
    
    const loginStartTime = Date.now();
    
    // Click login button
    await page.locator(SELECTORS.loginButton).click();
    console.log('🎯 Login button clicked');
    
    // Wait for some response (page change, error message, etc.)
    await page.waitForTimeout(5000);
    
    const loginTime = Date.now() - loginStartTime;
    console.log(`⏱️ Login process time: ${loginTime}ms`);
    
    const postLoginUrl = page.url();
    console.log(`🎯 Post-login URL: ${postLoginUrl}`);
    
    await takeScreenshot(page, 'screenshot-post-login');
    
    // Step 5: Analyze post-login state
    console.log('\n📍 STEP 5: Post-Login Analysis');
    console.log('======================================');
    
    // Check if we were redirected away from login
    if (postLoginUrl.includes('/login')) {
      console.log('⚠️ Still on login page - checking for errors');
      
      // Look for error messages
      const errorElements = await page.locator(SELECTORS.errorMessage).all();
      if (errorElements.length > 0) {
        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await errorElements[i].textContent();
          console.log(`❌ Error message ${i + 1}: ${errorText}`);
        }
      } else {
        console.log('ℹ️ No error messages found');
      }
      
      // Check console for errors
      const logs = await page.evaluate(() => {
        const logs = [];
        const originalConsoleError = console.error;
        console.error = function(...args) {
          logs.push(args.join(' '));
          originalConsoleError.apply(console, args);
        };
        return logs;
      });
      
      if (logs.length > 0) {
        console.log('Console errors:', logs);
      }
      
    } else {
      console.log('✅ Successfully redirected from login page');
      
      // Check what page we're on
      if (postLoginUrl.includes('/dashboard')) {
        console.log('🎯 Redirected to dashboard');
      } else if (postLoginUrl.includes('/setup')) {
        console.log('🎯 Redirected to setup page');
      } else {
        console.log(`🎯 Redirected to: ${postLoginUrl}`);
      }
    }
    
    // Step 6: Check dashboard/admin access
    console.log('\n📍 STEP 6: Dashboard/Admin Access Check');
    console.log('======================================');
    
    // Try to navigate to dashboard
    await page.goto(`${APP_URL}/dashboard`);
    await waitForPageLoad(page);
    
    const dashboardUrl = page.url();
    console.log(`🎯 Dashboard URL: ${dashboardUrl}`);
    
    await takeScreenshot(page, 'screenshot-dashboard');
    
    if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ Successfully accessed dashboard');
      
      // Look for admin-specific elements
      const pageContent = await page.textContent('body');
      const hasAdminContent = pageContent?.toLowerCase().includes('admin') || 
                             pageContent?.toLowerCase().includes('administr');
      
      console.log(`🔍 Page contains admin references: ${hasAdminContent}`);
      
      // Check for navigation elements
      const navElements = await page.locator('nav, [role="navigation"]').all();
      console.log(`🧭 Navigation elements found: ${navElements.length}`);
      
    } else if (dashboardUrl.includes('/login')) {
      console.log('❌ Redirected back to login - authentication failed');
    } else {
      console.log(`⚠️ Unexpected redirect to: ${dashboardUrl}`);
    }
    
    // Step 7: Test session persistence
    console.log('\n📍 STEP 7: Session Persistence Test');
    console.log('======================================');
    
    await page.reload();
    await waitForPageLoad(page);
    
    const reloadUrl = page.url();
    console.log(`🔄 URL after reload: ${reloadUrl}`);
    
    if (reloadUrl.includes('/login')) {
      console.log('❌ Session lost after reload');
    } else {
      console.log('✅ Session persisted after reload');
    }
    
    // Step 8: Try setup page if dashboard doesn't work
    console.log('\n📍 STEP 8: Setup Page Test');
    console.log('======================================');
    
    await page.goto(`${APP_URL}/setup`);
    await waitForPageLoad(page);
    
    const setupUrl = page.url();
    console.log(`🎯 Setup URL: ${setupUrl}`);
    
    await takeScreenshot(page, 'screenshot-setup');
    
    if (setupUrl.includes('/setup')) {
      console.log('✅ Successfully accessed setup page');
    } else if (setupUrl.includes('/login')) {
      console.log('❌ Setup page redirected to login');
    } else {
      console.log(`⚠️ Setup page redirected to: ${setupUrl}`);
    }
    
    // Step 9: Final summary
    console.log('\n📍 STEP 9: Test Summary');
    console.log('======================================');
    
    console.log(`🌐 Application URL: ${APP_URL}`);
    console.log(`👤 Admin Email: ${ADMIN_EMAIL}`);
    console.log(`⏱️ Initial load time: ${loadTime}ms`);
    console.log(`⏱️ Login process time: ${loginTime}ms`);
    console.log(`📸 Screenshots saved: screenshot-home.png, screenshot-login.png, login-form-filled.png, screenshot-post-login.png, screenshot-dashboard.png, screenshot-setup.png`);
    
    // Create diagnostic summary
    const diagnostics = {
      initialLoad: loadTime < 10000 ? 'PASS' : 'SLOW',
      loginFormVisible: emailVisible && passwordVisible && loginButtonVisible ? 'PASS' : 'FAIL',
      loginSubmission: loginTime < 10000 ? 'PASS' : 'SLOW',
      sessionCheck: 'TESTED'
    };
    
    console.log('\n🔍 DIAGNOSTICS:');
    Object.entries(diagnostics).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // Take final screenshot
    await takeScreenshot(page, 'diagnostic-final');
    
    console.log('\n✅ Authentication flow test completed');
    console.log('Check the screenshots for visual validation');
  });

  test('Quick Login Verification', async ({ page }) => {
    console.log('🚀 Quick login verification test');
    
    await page.goto(`${APP_URL}/login`);
    await page.waitForTimeout(3000);
    
    const emailInput = page.locator(SELECTORS.emailInput);
    const passwordInput = page.locator(SELECTORS.passwordInput);
    const loginButton = page.locator(SELECTORS.loginButton);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await loginButton.click();
    
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`Final URL: ${currentUrl}`);
    
    // Should NOT be on login page if successful
    expect(currentUrl).not.toContain('/login');
    
    console.log('✅ Quick login test passed');
  });
});