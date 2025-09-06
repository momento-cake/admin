import { test, expect } from '@playwright/test';

test.describe('Firebase Registration Flow Test', () => {
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
        if (text.includes('Firebase') || text.includes('Auth') || text.includes('admin')) {
          console.log(`🔥 Firebase/Auth: ${text}`);
        }
      }
    });
  });

  test('Test Registration Form Functionality', async ({ page }) => {
    console.log('📝 Testing registration form functionality...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'load',
      timeout: 20000 
    });

    await page.waitForTimeout(3000);

    // Fill out the registration form
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome" i]');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[type="password"]').last();
    const submitButton = page.locator('button[type="submit"], button:has-text("Criar")');

    console.log('📝 Filling out registration form...');

    await nameInput.fill('Test Administrator');
    await emailInput.fill('test-admin@momentocake.dev');
    await passwordInput.fill('TestPassword123!');
    await confirmPasswordInput.fill('TestPassword123!');

    // Take screenshot with filled form
    await page.screenshot({ 
      path: 'setup-form-filled.png',
      fullPage: true 
    });

    console.log('🔍 Checking form validation...');

    // Check if form is ready to submit (no validation errors)
    const validationErrors = await page.locator('.error, .text-red-500, [class*="error"]').count();
    console.log(`🔍 Validation errors visible: ${validationErrors}`);

    // Clear errors before form submission
    const previousErrorCount = consoleErrors.length;

    console.log('🚀 Attempting form submission (will not complete to avoid creating test data)...');
    
    // Note: We won't actually submit to avoid creating test data
    // Instead, just verify the form structure is correct
    
    const formElements = {
      nameField: await nameInput.count() > 0,
      emailField: await emailInput.count() > 0,
      passwordField: await passwordInput.count() > 0,
      confirmPasswordField: await confirmPasswordInput.count() > 0,
      submitButton: await submitButton.count() > 0
    };

    console.log('📋 Form elements validation:');
    console.log(`  ✅ Name field: ${formElements.nameField}`);
    console.log(`  ✅ Email field: ${formElements.emailField}`);
    console.log(`  ✅ Password field: ${formElements.passwordField}`);
    console.log(`  ✅ Confirm Password field: ${formElements.confirmPasswordField}`);
    console.log(`  ✅ Submit button: ${formElements.submitButton}`);

    // Verify form structure is complete
    const formIsComplete = Object.values(formElements).every(element => element);
    console.log(`📝 Registration form is complete: ${formIsComplete}`);

    expect(formIsComplete).toBe(true);
  });

  test('Test Firebase Auth Configuration', async ({ page }) => {
    console.log('🔥 Testing Firebase Auth configuration...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'load',
      timeout: 20000 
    });

    await page.waitForTimeout(5000);

    // Check Firebase Auth configuration
    const authConfig = await page.evaluate(() => {
      // Check if Firebase Auth is properly configured
      if (typeof window !== 'undefined') {
        const firebase = (window as any).firebase;
        return {
          firebaseAvailable: !!firebase,
          authAvailable: !!(firebase?.auth),
          appInitialized: !!(firebase?.apps && firebase.apps.length > 0),
          projectId: firebase?.apps?.[0]?.options?.projectId || 'unknown'
        };
      }
      return { error: 'Firebase not available' };
    });

    console.log('🔥 Firebase Auth Status:', authConfig);

    // Check for auth-related errors
    const authErrors = consoleErrors.filter(error => 
      error.includes('auth') || 
      error.includes('permission-denied') ||
      error.includes('insufficient permissions')
    );

    console.log(`🔍 Auth-related errors: ${authErrors.length}`);

    if (authErrors.length > 0) {
      console.log('🚨 Auth errors found:');
      authErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No auth-related errors found');
    }

    // Take final screenshot
    await page.screenshot({ 
      path: 'firebase-auth-test.png',
      fullPage: true 
    });

    expect(authConfig.firebaseAvailable).toBe(true);
    expect(authConfig.authAvailable).toBe(true);
    expect(authErrors).toHaveLength(0);
  });

  test.afterEach(async () => {
    console.log('\n📊 === TEST SUMMARY ===');
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