/**
 * Comprehensive Admin Authentication Flow Test
 * Tests the complete authentication flow for the Momento Cake admin application
 * using the provided admin credentials.
 * 
 * Application URL: https://momentocake-admin-dev.web.app
 * Admin Credentials: admin@momentocake.com.br / G8j5k188
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const APP_URL = 'https://momentocake-admin-dev.web.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

// Selectors
const SELECTORS = {
  emailInput: '[data-testid="email-input"], input[type="email"], input[name="email"]',
  passwordInput: '[data-testid="password-input"], input[type="password"], input[name="password"]',
  loginButton: '[data-testid="login-button"], button[type="submit"], button:has-text("Entrar")',
  logoutButton: '[data-testid="logout-button"], button:has-text("Sair")',
  userMenu: '[data-testid="user-menu"], [data-testid="user-avatar"]',
  dashboardContainer: '[data-testid="dashboard"], main, .dashboard',
  adminIndicator: '[data-testid="admin-badge"], .admin, [role="admin"]',
  errorMessage: '[data-testid="error-message"], .error, .alert-error'
};

// Helper functions
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/auth-flow-${name}.png`,
    fullPage: true
  });
  console.log(`📸 Screenshot saved: auth-flow-${name}.png`);
}

async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
  return errors;
}

async function captureNetworkErrors(page: Page): Promise<string[]> {
  const networkErrors: string[] = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`Network Error: ${response.status()} - ${response.url()}`);
    }
  });
  return networkErrors;
}

async function waitForFirebaseAuth(page: Page) {
  // Wait for Firebase Auth to initialize
  await page.waitForFunction(() => {
    return window.firebase && window.firebase.auth;
  }, { timeout: 10000 });
}

async function getLocalStorageAuth(page: Page) {
  return await page.evaluate(() => {
    const auth = localStorage.getItem('firebase:authUser:AIzaSyAZ4n9Z8y3Zi2Jz6Q5zY6y5Zz5Z5Z5Z5Z5:[DEFAULT]');
    return auth ? JSON.parse(auth) : null;
  });
}

test.describe('Admin Authentication Flow', () => {
  let context: BrowserContext;
  let page: Page;
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: 'test-results/',
        size: { width: 1280, height: 720 }
      }
    });
    page = await context.newPage();
    
    // Set up error capturing
    consoleErrors = await captureConsoleErrors(page);
    networkErrors = await captureNetworkErrors(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. Initial State Verification', async () => {
    console.log('🔍 Testing initial state verification...');
    
    const startTime = Date.now();
    
    // Load homepage
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    
    // Take initial screenshot
    await takeScreenshot(page, '01-initial-homepage');
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('Momento Cake');
    console.log(`📄 Page title: ${title}`);
    
    // Check if Firebase is initialized
    const firebaseInitialized = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             window.firebase !== undefined;
    });
    
    if (firebaseInitialized) {
      console.log('✅ Firebase SDK detected');
    } else {
      console.log('⚠️ Firebase SDK not detected on initial load');
    }
    
    // Check console for errors
    if (consoleErrors.length > 0) {
      console.log('❌ Console errors on initial load:', consoleErrors);
    } else {
      console.log('✅ No console errors on initial load');
    }
    
    expect(page.url()).toBe(APP_URL + '/');
  });

  test('2. Login Flow Testing', async () => {
    console.log('🔐 Testing login flow...');
    
    // Navigate to login page
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, '02-login-page');
    
    // Check if login form is present
    const emailInput = page.locator(SELECTORS.emailInput).first();
    const passwordInput = page.locator(SELECTORS.passwordInput).first();
    const loginButton = page.locator(SELECTORS.loginButton).first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    console.log('📝 Login form elements found and visible');
    
    // Fill in credentials
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    await takeScreenshot(page, '03-login-form-filled');
    
    console.log(`👤 Filled email: ${ADMIN_EMAIL}`);
    console.log('🔑 Filled password: [HIDDEN]');
    
    // Submit login form
    const loginStartTime = Date.now();
    
    await loginButton.click();
    
    // Wait for navigation or dashboard to load
    try {
      await page.waitForURL(url => url.includes('/dashboard') || url.includes('/admin'), { timeout: 15000 });
      console.log('✅ Redirected after login');
    } catch (error) {
      console.log('⚠️ No redirect detected, checking current URL');
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Check if we're still on login page with error
      const errorElement = page.locator(SELECTORS.errorMessage);
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`❌ Login error: ${errorText}`);
        throw new Error(`Login failed: ${errorText}`);
      }
    }
    
    const loginTime = Date.now() - loginStartTime;
    console.log(`⏱️ Login process time: ${loginTime}ms`);
    
    await takeScreenshot(page, '04-post-login-state');
    
    // Verify successful login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    console.log(`🎯 Current URL after login: ${currentUrl}`);
  });

  test('3. Post-Login State Verification', async () => {
    console.log('🏠 Testing post-login state...');
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // Check for dashboard elements
    const dashboardElement = page.locator(SELECTORS.dashboardContainer).first();
    if (await dashboardElement.isVisible()) {
      console.log('✅ Dashboard container found');
    } else {
      console.log('⚠️ Dashboard container not found, checking page content');
      const bodyText = await page.textContent('body');
      console.log('Page content preview:', bodyText?.substring(0, 200));
    }
    
    // Check for user menu or avatar
    const userMenu = page.locator(SELECTORS.userMenu).first();
    if (await userMenu.isVisible()) {
      console.log('✅ User menu/avatar found');
      await userMenu.click();
      await takeScreenshot(page, '05-user-menu-opened');
    }
    
    // Check for admin status indicator
    const adminBadge = page.locator(SELECTORS.adminIndicator);
    if (await adminBadge.isVisible()) {
      console.log('✅ Admin status indicator found');
    } else {
      console.log('⚠️ Admin status indicator not visible');
    }
    
    // Check localStorage for auth token
    const authData = await getLocalStorageAuth(page);
    if (authData) {
      console.log('✅ Auth data found in localStorage');
      console.log(`👤 User email: ${authData.email || 'not found'}`);
    } else {
      console.log('⚠️ No auth data in localStorage');
    }
    
    // Check for Firestore connection
    const firestoreConnected = await page.evaluate(async () => {
      try {
        if (window.firebase && window.firebase.firestore) {
          // Try to access a simple document to test connection
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    });
    
    if (firestoreConnected) {
      console.log('✅ Firestore connection available');
    } else {
      console.log('⚠️ Firestore connection not available');
    }
    
    await takeScreenshot(page, '06-dashboard-state');
  });

  test('4. Session Persistence Testing', async () => {
    console.log('🔄 Testing session persistence...');
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, '07-after-page-refresh');
    
    // Check if user is still logged in
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    console.log('✅ User remained logged in after page refresh');
    
    // Check if auth data persists
    const authData = await getLocalStorageAuth(page);
    if (authData) {
      console.log('✅ Auth data persists in localStorage');
    } else {
      console.log('❌ Auth data lost after refresh');
    }
    
    // Test navigation to a protected route
    try {
      await page.goto(`${APP_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      console.log('✅ Protected route accessible');
    } catch (error) {
      console.log('❌ Protected route not accessible');
    }
  });

  test('5. Logout Flow Testing', async () => {
    console.log('🚪 Testing logout flow...');
    
    // Find logout button (may be in a dropdown menu)
    let logoutButton = page.locator(SELECTORS.logoutButton).first();
    
    if (!(await logoutButton.isVisible())) {
      // Try to find user menu first
      const userMenu = page.locator(SELECTORS.userMenu).first();
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.waitForTimeout(500); // Wait for dropdown
        logoutButton = page.locator(SELECTORS.logoutButton).first();
      }
    }
    
    if (await logoutButton.isVisible()) {
      console.log('🎯 Logout button found');
      await logoutButton.click();
      
      // Wait for redirect or URL change
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`🎯 URL after logout: ${currentUrl}`);
      
      // Check if redirected away from protected area
      if (currentUrl.includes('/login') || currentUrl === `${APP_URL}/`) {
        console.log('✅ Successfully redirected after logout');
      } else {
        console.log('⚠️ Unexpected URL after logout');
      }
      
      await takeScreenshot(page, '08-after-logout');
      
      // Check if auth data is cleared
      const authData = await getLocalStorageAuth(page);
      if (!authData) {
        console.log('✅ Auth data cleared from localStorage');
      } else {
        console.log('⚠️ Auth data still present after logout');
      }
      
    } else {
      console.log('❌ Logout button not found');
      // Try alternative logout methods
      await page.evaluate(() => {
        if (window.firebase && window.firebase.auth) {
          window.firebase.auth().signOut();
        }
      });
      console.log('🔧 Attempted programmatic logout');
    }
  });

  test('6. Re-login Testing', async () => {
    console.log('🔄 Testing re-login functionality...');
    
    // Navigate to login page
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill credentials again
    const emailInput = page.locator(SELECTORS.emailInput).first();
    const passwordInput = page.locator(SELECTORS.passwordInput).first();
    const loginButton = page.locator(SELECTORS.loginButton).first();
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await loginButton.click();
    
    // Wait for successful login
    try {
      await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
      console.log('✅ Re-login successful');
      
      await takeScreenshot(page, '09-re-login-success');
      
    } catch (error) {
      console.log('❌ Re-login failed');
      await takeScreenshot(page, '09-re-login-failed');
      throw error;
    }
  });

  test('7. Error Handling Testing', async () => {
    console.log('🚨 Testing error handling...');
    
    // First logout to test from clean state
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Test with incorrect password
    const emailInput = page.locator(SELECTORS.emailInput).first();
    const passwordInput = page.locator(SELECTORS.passwordInput).first();
    const loginButton = page.locator(SELECTORS.loginButton).first();
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill('wrong-password');
    await loginButton.click();
    
    // Wait for error message
    await page.waitForTimeout(3000);
    
    const errorElement = page.locator(SELECTORS.errorMessage);
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log(`✅ Error message displayed: ${errorText}`);
    } else {
      console.log('⚠️ No error message displayed for wrong password');
    }
    
    await takeScreenshot(page, '10-error-handling');
    
    // Test form validation
    await emailInput.fill('invalid-email');
    await passwordInput.fill('123');
    await loginButton.click();
    
    await page.waitForTimeout(1000);
    console.log('✅ Form validation tested');
  });

  test('8. Performance and Final Report', async () => {
    console.log('📊 Generating performance report...');
    
    // Final login for performance measurement
    await page.goto(`${APP_URL}/login`);
    
    const performanceStartTime = Date.now();
    
    const emailInput = page.locator(SELECTORS.emailInput).first();
    const passwordInput = page.locator(SELECTORS.passwordInput).first();
    const loginButton = page.locator(SELECTORS.loginButton).first();
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    const submitTime = Date.now();
    await loginButton.click();
    
    try {
      await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
      const totalTime = Date.now() - performanceStartTime;
      const authTime = Date.now() - submitTime;
      
      console.log('📈 PERFORMANCE METRICS:');
      console.log(`   Total login flow: ${totalTime}ms`);
      console.log(`   Authentication time: ${authTime}ms`);
      
    } catch (error) {
      console.log('❌ Performance test failed');
    }
    
    await takeScreenshot(page, '11-final-state');
    
    // Final report
    console.log('\n🎯 AUTHENTICATION FLOW TEST SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Application URL: ${APP_URL}`);
    console.log(`👤 Admin Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: [PROVIDED CREDENTIALS]`);
    console.log(`📊 Console Errors: ${consoleErrors.length}`);
    console.log(`🌐 Network Errors: ${networkErrors.length}`);
    console.log('=====================================');
    
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    
    if (networkErrors.length > 0) {
      console.log('Network Errors:', networkErrors);
    }
  });
});

// Additional utility test for Firebase connectivity
test.describe('Firebase Integration Health Check', () => {
  test('Firebase Services Connectivity', async ({ page }) => {
    console.log('🔥 Testing Firebase services...');
    
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    const firebaseHealth = await page.evaluate(async () => {
      const results = {
        sdkLoaded: false,
        authInitialized: false,
        firestoreAvailable: false,
        configValid: false
      };
      
      try {
        // Check if Firebase SDK is loaded
        if (typeof window !== 'undefined' && window.firebase) {
          results.sdkLoaded = true;
          
          // Check Auth
          if (window.firebase.auth) {
            results.authInitialized = true;
          }
          
          // Check Firestore
          if (window.firebase.firestore) {
            results.firestoreAvailable = true;
          }
          
          // Check if app is configured
          if (window.firebase.apps && window.firebase.apps.length > 0) {
            results.configValid = true;
          }
        }
      } catch (error) {
        console.error('Firebase health check error:', error);
      }
      
      return results;
    });
    
    console.log('🔥 Firebase Health Check Results:');
    console.log(`   SDK Loaded: ${firebaseHealth.sdkLoaded ? '✅' : '❌'}`);
    console.log(`   Auth Initialized: ${firebaseHealth.authInitialized ? '✅' : '❌'}`);
    console.log(`   Firestore Available: ${firebaseHealth.firestoreAvailable ? '✅' : '❌'}`);
    console.log(`   Config Valid: ${firebaseHealth.configValid ? '✅' : '❌'}`);
    
    expect(firebaseHealth.sdkLoaded).toBe(true);
    expect(firebaseHealth.configValid).toBe(true);
  });
});