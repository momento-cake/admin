import { test, expect } from '@playwright/test';

/**
 * Quick Firebase Authentication Validation
 * Simplified tests to verify security rules fixes
 */

test.describe('Quick Firebase Validation - Deployed Application', () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    consoleErrors = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`🚨 Console Error: ${text}`);
      } else {
        consoleLogs.push(`${type.toUpperCase()}: ${text}`);
        if (text.includes('Firebase') || text.includes('Auth') || text.includes('Firestore')) {
          console.log(`🔥 Firebase: ${text}`);
        }
      }
    });
  });

  test('Basic Site Loading and Firebase Initialization', async ({ page }) => {
    console.log('🌐 Testing basic site loading...');
    
    try {
      // Use 'load' instead of 'networkidle' for faster loading
      await page.goto('https://momentocake-admin-dev.web.app', { 
        waitUntil: 'load',
        timeout: 20000 
      });

      // Wait a bit for Firebase to initialize
      await page.waitForTimeout(5000);

      // Take screenshot
      await page.screenshot({ 
        path: 'screenshot-loaded.png',
        fullPage: true 
      });

      // Check if page loaded
      const title = await page.title();
      console.log(`📄 Page Title: ${title}`);

      // Check for critical errors specifically related to the reported issues
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('Missing or insufficient permissions') ||
        error.includes('permission-denied') ||
        error.includes('Failed to load resource') && error.includes('400')
      );

      console.log(`✅ Page loaded successfully`);
      console.log(`🔍 Critical permission/400 errors found: ${criticalErrors.length}`);

      if (criticalErrors.length > 0) {
        console.log('🚨 Critical errors detected:');
        criticalErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('✅ No critical permission/400 errors detected - Security rules appear to be working!');
      }

      // Basic assertions
      expect(title).toBeTruthy();
      expect(criticalErrors).toHaveLength(0);

    } catch (error) {
      console.error('❌ Failed to load page:', error);
      await page.screenshot({ 
        path: 'screenshot-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('Firebase Functionality Check', async ({ page }) => {
    console.log('🔥 Testing Firebase functionality...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'load',
      timeout: 20000 
    });

    // Wait for Firebase initialization
    await page.waitForTimeout(6000);

    // Check for Firebase-related logs
    const firebaseLogs = consoleLogs.filter(log => 
      log.toLowerCase().includes('firebase') || 
      log.toLowerCase().includes('initialized')
    );

    console.log(`🔥 Firebase-related logs found: ${firebaseLogs.length}`);
    firebaseLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`);
    });

    // Check specifically for the checkIfAdminsExist permission issue
    const permissionDeniedErrors = consoleErrors.filter(error =>
      error.includes('checkIfAdminsExist') ||
      (error.includes('Missing or insufficient permissions') && error.includes('users'))
    );

    console.log(`🔍 checkIfAdminsExist permission errors: ${permissionDeniedErrors.length}`);

    if (permissionDeniedErrors.length > 0) {
      console.log('🚨 Permission errors still present:');
      permissionDeniedErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No permission errors for checkIfAdminsExist - Security rules fix successful!');
    }

    expect(permissionDeniedErrors).toHaveLength(0);
  });

  test('Login Form Presence Check', async ({ page }) => {
    console.log('🔐 Checking for login form...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'load',
      timeout: 20000 
    });

    await page.waitForTimeout(3000);

    // Look for login elements
    const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').count();
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")').count();

    console.log(`📧 Email inputs found: ${emailInput}`);
    console.log(`🔒 Password inputs found: ${passwordInput}`);
    console.log(`🔘 Login buttons found: ${loginButton}`);

    // Look for "Primeiro Acesso" button
    const firstAccessButton = await page.locator('button:has-text("Primeiro Acesso"), a:has-text("Primeiro Acesso")').count();
    console.log(`📝 First Access buttons found: ${firstAccessButton}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'login-page.png',
      fullPage: true 
    });

    // Basic validation that we have some form elements
    const hasLoginElements = emailInput > 0 && passwordInput > 0;
    const hasFirstAccess = firstAccessButton > 0;

    console.log(`✅ Login form elements present: ${hasLoginElements}`);
    console.log(`✅ First Access option present: ${hasFirstAccess}`);

    expect(hasLoginElements || hasFirstAccess).toBe(true);
  });

  test.afterEach(async () => {
    console.log('\n📊 === SUMMARY ===');
    console.log(`📝 Console messages: ${consoleLogs.length}`);
    console.log(`🚨 Console errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n🚨 All Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  });
});