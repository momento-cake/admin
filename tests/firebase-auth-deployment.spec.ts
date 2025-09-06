import { test, expect, Page } from '@playwright/test';

/**
 * Firebase Authentication Testing for Deployed Application
 * Tests the security rules fixes and authentication flow
 * Target: https://momentocake-admin-dev.web.app
 */

test.describe('Firebase Authentication - Deployed Application Tests', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let networkFailures: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test
    consoleLogs = [];
    consoleErrors = [];
    networkFailures = [];

    // Capture console logs and errors with detailed categorization
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`🚨 Console Error: ${text}`);
      } else {
        consoleLogs.push(`${type.toUpperCase()}: ${text}`);
        if (text.includes('Firebase') || text.includes('Auth') || text.includes('Firestore')) {
          console.log(`🔥 Firebase Related Log: ${text}`);
        }
      }
    });

    // Capture network failures with specific Firebase monitoring
    page.on('requestfailed', (request) => {
      const failure = `${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`;
      networkFailures.push(failure);
      console.log(`❌ Network Request Failed: ${failure}`);
    });

    // Monitor specific Firebase API calls
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('googleapis.com') || url.includes('firebase') || url.includes('firestore')) {
        console.log(`🌐 Firebase API Response: ${response.status()} ${url}`);
        if (!response.ok()) {
          console.log(`⚠️ Firebase API Error Response: ${response.status()} ${response.statusText()}`);
        }
      }
    });
  });

  test('Page Loading - Verify application loads without permission errors', async ({ page }) => {
    console.log('🌐 Testing basic page loading and Firebase connection...');
    
    try {
      // Navigate to the deployed application
      await page.goto('https://momentocake-admin-dev.web.app', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for Firebase initialization
      await page.waitForTimeout(5000);

      // Take screenshot of loaded page
      await page.screenshot({ 
        path: 'screenshot-home.png',
        fullPage: true 
      });

      // Check page title and basic elements
      const title = await page.title();
      console.log(`📄 Page Title: ${title}`);

      // Verify no critical errors in console
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('Missing or insufficient permissions') ||
        error.includes('permission-denied') ||
        error.includes('Failed to load resource') ||
        error.includes('400')
      );

      if (criticalErrors.length > 0) {
        console.log('🚨 Critical permission/loading errors found:');
        criticalErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('✅ No critical permission/loading errors detected');
      }

      // Verify page loaded successfully
      expect(title).toBeTruthy();
      expect(criticalErrors).toHaveLength(0);

    } catch (error) {
      console.error('❌ Page loading failed:', error);
      await page.screenshot({ 
        path: 'screenshot-load-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('Firebase Config - Check checkIfAdminsExist function without permission errors', async ({ page }) => {
    console.log('🔥 Testing checkIfAdminsExist function...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for Firebase initialization and any initial checks
    await page.waitForTimeout(8000);

    // Check for Firebase initialization and admin check functionality
    const firebaseStatus = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if Firebase is initialized
        if (typeof window !== 'undefined' && (window as any).firebase) {
          resolve({
            firebaseInitialized: true,
            hasFirestore: !!(window as any).firebase.firestore,
            hasAuth: !!(window as any).firebase.auth
          });
        } else {
          resolve({
            firebaseInitialized: false,
            hasFirestore: false,
            hasAuth: false
          });
        }
      });
    });

    console.log('🔥 Firebase Status:', firebaseStatus);

    // Check for specific permission-related errors from the checkIfAdminsExist function
    const permissionErrors = consoleErrors.filter(error => 
      error.includes('Missing or insufficient permissions') ||
      error.includes('permission-denied') ||
      error.includes('checkIfAdminsExist')
    );

    const firebaseConfigErrors = consoleErrors.filter(error => 
      error.includes('Firebase') && (
        error.includes('configuration') ||
        error.includes('config') ||
        error.includes('project')
      )
    );

    console.log(`🔍 Permission errors found: ${permissionErrors.length}`);
    console.log(`🔍 Firebase config errors found: ${firebaseConfigErrors.length}`);

    if (permissionErrors.length > 0) {
      console.log('🚨 Permission-related errors:');
      permissionErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (firebaseConfigErrors.length > 0) {
      console.log('🚨 Firebase configuration errors:');
      firebaseConfigErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Take screenshot of current state
    await page.screenshot({ 
      path: 'screenshot-firebase-check.png',
      fullPage: true 
    });

    // Verify no permission errors (this should pass if security rules were fixed)
    expect(permissionErrors).toHaveLength(0);
  });

  test('Authentication Flow - Test First Access (Primeiro Acesso) registration', async ({ page }) => {
    console.log('📝 Testing Primeiro Acesso registration flow...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(5000);

    // Look for the "Primeiro Acesso" button or link
    const firstAccessElements = [
      'button:has-text("Primeiro Acesso")',
      'a:has-text("Primeiro Acesso")',
      'button:has-text("First Access")',
      'button:has-text("Cadastrar")',
      'button:has-text("Registrar")',
      '[data-testid="primeiro-acesso"]',
      '[data-testid="first-access"]'
    ];

    let firstAccessButton = null;
    let buttonFound = false;

    for (const selector of firstAccessElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        firstAccessButton = element.first();
        buttonFound = true;
        console.log(`✅ Found first access button with selector: ${selector}`);
        break;
      }
    }

    if (buttonFound && firstAccessButton) {
      console.log('🔘 Clicking Primeiro Acesso button...');
      await firstAccessButton.click();
      await page.waitForTimeout(3000);

      // Take screenshot of registration form
      await page.screenshot({ 
        path: 'first-access-form.png',
        fullPage: true 
      });

      // Look for registration form fields
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      const nameInput = page.locator('input[name="name"], input[name="nome"], input[placeholder*="name" i], input[placeholder*="nome" i]');
      const submitButton = page.locator('button[type="submit"], button:has-text("Criar"), button:has-text("Create"), button:has-text("Cadastrar")');

      const fieldsFound = {
        email: await emailInput.count() > 0,
        password: await passwordInput.count() > 0,
        name: await nameInput.count() > 0,
        submit: await submitButton.count() > 0
      };

      console.log('📧 Registration form fields found:', fieldsFound);

      if (fieldsFound.email && fieldsFound.password && fieldsFound.submit) {
        console.log('📝 Filling registration form with test data...');
        
        if (fieldsFound.name) {
          await nameInput.first().fill('Test Admin User');
        }
        await emailInput.first().fill('admin-test@momentocake.test');
        await passwordInput.first().fill('TestPassword123!');

        // Take screenshot with filled form
        await page.screenshot({ 
          path: 'first-access-form-filled.png',
          fullPage: true 
        });

        console.log('🚀 Form filled successfully (not submitting to avoid creating test users)');
        
        // Check for any validation errors or UI feedback
        await page.waitForTimeout(2000);
        
        const validationErrors = await page.locator('.error, .invalid, [class*="error"], [class*="invalid"]').count();
        console.log(`🔍 Validation errors visible: ${validationErrors}`);
        
        expect(fieldsFound.email && fieldsFound.password && fieldsFound.submit).toBe(true);
      } else {
        console.log('❌ Required form fields not found');
        expect.soft(false, 'Registration form fields not found').toBe(true);
      }
    } else {
      console.log('ℹ️ Primeiro Acesso button not found - might be on a different page or hidden');
      await page.screenshot({ 
        path: 'no-first-access-button.png',
        fullPage: true 
      });
    }
  });

  test('Authentication Flow - Test login functionality', async ({ page }) => {
    console.log('🔐 Testing login functionality...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(3000);

    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign In")');

    const loginElementsFound = {
      email: await emailInput.count() > 0,
      password: await passwordInput.count() > 0,
      button: await loginButton.count() > 0
    };

    console.log('🔐 Login form elements found:', loginElementsFound);

    if (loginElementsFound.email && loginElementsFound.password && loginElementsFound.button) {
      console.log('📝 Testing login with invalid credentials...');

      // Test with invalid credentials first
      await emailInput.first().fill('invalid@test.com');
      await passwordInput.first().fill('wrongpassword');

      // Take screenshot before login attempt
      await page.screenshot({ 
        path: 'login-form-filled.png',
        fullPage: true 
      });

      // Clear console errors to track new ones from login attempt
      const previousErrorCount = consoleErrors.length;

      console.log('🚀 Attempting login with invalid credentials...');
      await loginButton.first().click();
      await page.waitForTimeout(5000);

      // Check for authentication errors (expected for invalid credentials)
      const newErrors = consoleErrors.slice(previousErrorCount);
      const authErrors = newErrors.filter(error => 
        error.includes('auth/') || 
        error.includes('authentication') ||
        error.includes('invalid-credential') ||
        error.includes('wrong-password')
      );

      console.log(`🔍 New errors after login attempt: ${newErrors.length}`);
      console.log(`🔍 Authentication-related errors: ${authErrors.length}`);

      if (authErrors.length > 0) {
        console.log('✅ Authentication errors properly handled (expected for invalid credentials)');
        authErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      // Check for unexpected 400 errors or permission issues
      const unexpectedErrors = newErrors.filter(error => 
        error.includes('Failed to load resource') ||
        error.includes('400') ||
        error.includes('permission-denied')
      );

      if (unexpectedErrors.length > 0) {
        console.log('🚨 Unexpected errors during login:');
        unexpectedErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      // Take screenshot after login attempt
      await page.screenshot({ 
        path: 'login-attempt-result.png',
        fullPage: true 
      });

      // Verify no unexpected 400 errors (these should be fixed)
      expect(unexpectedErrors).toHaveLength(0);
      
      console.log('✅ Login form functionality test completed');
    } else {
      console.log('ℹ️ Login form not found - might be redirected or different flow');
      await page.screenshot({ 
        path: 'no-login-form.png',
        fullPage: true 
      });
    }
  });

  test('Network Monitoring - Check for Firebase API failures', async ({ page }) => {
    console.log('🌐 Monitoring Firebase network requests...');

    const firebaseRequests: Array<{url: string, status: number, statusText: string}> = [];
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('googleapis.com') || url.includes('firebase') || url.includes('firestore')) {
        firebaseRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for Firebase operations to complete
    await page.waitForTimeout(8000);

    console.log(`🌐 Total Firebase requests captured: ${firebaseRequests.length}`);

    if (firebaseRequests.length > 0) {
      console.log('📊 Firebase API Request Summary:');
      firebaseRequests.forEach((req, index) => {
        const statusIcon = req.status < 300 ? '✅' : req.status < 400 ? '⚠️' : '❌';
        console.log(`  ${index + 1}. ${statusIcon} ${req.status} ${req.statusText} - ${req.url}`);
      });

      // Check for failed Firebase requests
      const failedRequests = firebaseRequests.filter(req => req.status >= 400);
      
      if (failedRequests.length > 0) {
        console.log('🚨 Failed Firebase requests:');
        failedRequests.forEach((req, index) => {
          console.log(`  ${index + 1}. ${req.status} ${req.statusText} - ${req.url}`);
        });
      } else {
        console.log('✅ All Firebase requests successful');
      }

      expect(failedRequests.filter(req => req.status === 400)).toHaveLength(0);
    } else {
      console.log('ℹ️ No Firebase requests detected');
    }

    await page.screenshot({ 
      path: 'network-monitoring-complete.png',
      fullPage: true 
    });
  });

  test.afterEach(async ({ page }) => {
    // Generate comprehensive test summary
    console.log('\n📊 === TEST EXECUTION SUMMARY ===');
    console.log(`📝 Total console messages: ${consoleLogs.length}`);
    console.log(`🚨 Total console errors: ${consoleErrors.length}`);
    console.log(`❌ Network failures: ${networkFailures.length}`);

    // Categorize errors for better analysis
    const permissionErrors = consoleErrors.filter(error => 
      error.includes('permission') || error.includes('denied') || error.includes('insufficient')
    );
    const firebaseErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('firebase')
    );
    const networkErrors = consoleErrors.filter(error => 
      error.includes('Failed to load') || error.includes('400') || error.includes('404')
    );

    console.log(`🔒 Permission-related errors: ${permissionErrors.length}`);
    console.log(`🔥 Firebase-related errors: ${firebaseErrors.length}`);
    console.log(`🌐 Network-related errors: ${networkErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n🚨 Error Details:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (networkFailures.length > 0) {
      console.log('\n❌ Network Failure Details:');
      networkFailures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure}`);
      });
    }
  });
});