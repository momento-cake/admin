const { test, expect } = require('@playwright/test');

test.describe('Firebase Integration Test - Momento Cake Admin', () => {
  let page;
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture console logs and errors
    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();
      
      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`🚨 Console Error: ${text}`);
      } else {
        consoleLogs.push(`${type.toUpperCase()}: ${text}`);
        console.log(`📝 Console ${type}: ${text}`);
      }
    });

    // Capture network failures
    page.on('requestfailed', (request) => {
      console.log(`❌ Network Request Failed: ${request.url()} - ${request.failure().errorText}`);
    });
  });

  test('should load application successfully', async () => {
    console.log('🌐 Navigating to: https://momentocake-admin-dev.web.app');
    
    try {
      await page.goto('https://momentocake-admin-dev.web.app', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Take initial screenshot
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/app-loaded.png',
        fullPage: true 
      });

      // Check if page loaded successfully
      const title = await page.title();
      console.log(`📄 Page Title: ${title}`);

      // Look for common elements that indicate successful loading
      const bodyContent = await page.locator('body').textContent();
      console.log(`📝 Page loaded with content length: ${bodyContent.length} characters`);

      expect(title).toBeTruthy();
      console.log('✅ Application loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load application:', error.message);
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/load-error.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('should check Firebase configuration', async () => {
    console.log('🔥 Checking Firebase configuration...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(5000); // Wait for Firebase to initialize

    // Check for Firebase configuration in the page
    const firebaseConfig = await page.evaluate(() => {
      if (window.firebase || window.Firebase) {
        return {
          firebaseAvailable: true,
          apps: window.firebase?.apps?.length || 0
        };
      }
      return { firebaseAvailable: false, apps: 0 };
    });

    console.log('🔥 Firebase Status:', firebaseConfig);

    // Check for specific Firebase project configuration errors
    const hasProjectMismatchError = consoleErrors.some(error => 
      error.includes('project') && error.includes('mismatch')
    );

    const hasFirebaseErrors = consoleErrors.some(error => 
      error.toLowerCase().includes('firebase')
    );

    console.log(`🔍 Project mismatch errors found: ${hasProjectMismatchError}`);
    console.log(`🔍 Firebase-related errors found: ${hasFirebaseErrors}`);

    // Take screenshot of current state
    await page.screenshot({ 
      path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/firebase-config-check.png',
      fullPage: true 
    });

    // Log all console errors for analysis
    if (consoleErrors.length > 0) {
      console.log('🚨 Console Errors Found:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('should test login form functionality', async () => {
    console.log('🔐 Testing login form...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(3000);

    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Entrar")');

    const emailExists = await emailInput.count() > 0;
    const passwordExists = await passwordInput.count() > 0;
    const buttonExists = await loginButton.count() > 0;

    console.log(`📧 Email input found: ${emailExists}`);
    console.log(`🔒 Password input found: ${passwordExists}`);
    console.log(`🔘 Login button found: ${buttonExists}`);

    if (emailExists && passwordExists && buttonExists) {
      console.log('📝 Attempting to fill login form...');

      // Fill the form with test credentials
      await emailInput.first().fill('test@momentocake.test');
      await passwordInput.first().fill('testpassword123');

      // Take screenshot before submission
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/login-form-filled.png',
        fullPage: true 
      });

      console.log('🚀 Attempting login...');
      
      // Clear previous errors to track new ones
      const previousErrorCount = consoleErrors.length;
      
      await loginButton.first().click();
      await page.waitForTimeout(5000); // Wait for authentication response

      // Check for new errors after login attempt
      const newErrors = consoleErrors.slice(previousErrorCount);
      
      if (newErrors.length > 0) {
        console.log('🚨 New errors after login attempt:');
        newErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }

      // Take screenshot after login attempt
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/login-attempt-result.png',
        fullPage: true 
      });

      console.log('✅ Login form test completed');
    } else {
      console.log('ℹ️ Login form elements not found - checking for auth redirect or different flow');
      
      // Take screenshot of current state
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/no-login-form.png',
        fullPage: true 
      });
    }
  });

  test('should check for registration flow', async () => {
    console.log('📝 Checking for user registration flow...');

    await page.goto('https://momentocake-admin-dev.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    await page.waitForTimeout(3000);

    // Look for registration/signup links or buttons
    const signUpButtons = page.locator('button:has-text("Sign Up"), button:has-text("Register"), a:has-text("Sign Up"), a:has-text("Register"), button:has-text("Criar Conta"), a:has-text("Cadastrar")');
    const signUpExists = await signUpButtons.count() > 0;

    console.log(`📝 Registration elements found: ${signUpExists}`);

    if (signUpExists) {
      console.log('🔘 Clicking registration link/button...');
      await signUpButtons.first().click();
      await page.waitForTimeout(3000);

      // Take screenshot of registration form
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/registration-form.png',
        fullPage: true 
      });

      // Look for registration form fields
      const regEmailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      const regPasswordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]');
      const regSubmitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create"), button:has-text("Criar")');

      const regEmailExists = await regEmailInput.count() > 0;
      const regPasswordExists = await regPasswordInput.count() > 0;
      const regButtonExists = await regSubmitButton.count() > 0;

      console.log(`📧 Registration email input: ${regEmailExists}`);
      console.log(`🔒 Registration password input: ${regPasswordExists}`);
      console.log(`🔘 Registration button: ${regButtonExists}`);

      if (regEmailExists && regPasswordExists && regButtonExists) {
        console.log('📝 Testing registration form fill...');
        
        await regEmailInput.first().fill('newuser@momentocake.test');
        await regPasswordInput.first().fill('newuserpassword123');

        // Take screenshot with filled form
        await page.screenshot({ 
          path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/registration-filled.png',
          fullPage: true 
        });

        console.log('✅ Registration form test completed (form filled but not submitted)');
      }
    } else {
      console.log('ℹ️ No registration flow found');
      
      await page.screenshot({ 
        path: '/Users/gabrielaraujo/projects/momentocake/admin/test-results/no-registration.png',
        fullPage: true 
      });
    }
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }

    // Generate console log summary
    console.log('\n📊 === CONSOLE LOGS SUMMARY ===');
    console.log(`Total console messages: ${consoleLogs.length}`);
    console.log(`Total errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n🚨 Error Summary:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  });
});