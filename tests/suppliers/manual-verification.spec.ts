import { test, expect, Page } from '@playwright/test';

/**
 * Manual Verification Test for Suppliers Management System
 * This test runs basic checks without authentication to understand the current state
 */

test.describe('Manual Suppliers System Verification', () => {

  test('Check application accessibility and basic structure', async ({ page }) => {
    console.log('🔍 Checking application basic accessibility...');

    // Check if application is accessible
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/manual-home-page.png', fullPage: true });
    
    console.log('Current URL:', page.url());
    console.log('Page Title:', await page.title());

    // Check if we can access login page
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/manual-login-page.png', fullPage: true });
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar")');

    console.log('Email input visible:', await emailInput.isVisible());
    console.log('Password input visible:', await passwordInput.isVisible());
    console.log('Submit button visible:', await submitButton.isVisible());

    // Try to access suppliers page directly (might redirect to login)
    await page.goto('http://localhost:3000/suppliers');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/manual-suppliers-direct.png', fullPage: true });
    
    console.log('Suppliers page URL:', page.url());
  });

  test('Check dashboard structure if accessible', async ({ page }) => {
    console.log('🏠 Checking dashboard structure...');

    try {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ path: 'test-results/manual-dashboard.png', fullPage: true });
      
      // Look for sidebar elements
      const sidebar = page.locator('[data-testid="sidebar"], nav, .sidebar');
      const suppliersLink = page.locator('text="Fornecedores", a[href*="suppliers"]');
      const ingredientsLink = page.locator('text="Ingredientes", a[href*="ingredients"]');

      console.log('Sidebar visible:', await sidebar.isVisible());
      console.log('Suppliers link visible:', await suppliersLink.isVisible());
      console.log('Ingredients link visible:', await ingredientsLink.isVisible());

    } catch (error) {
      console.log('Dashboard access error:', error.message);
    }
  });

  test('Attempt basic authentication flow', async ({ page }) => {
    console.log('🔐 Attempting authentication...');

    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Look for any form of login inputs with more flexible selectors
    const possibleEmailInputs = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Email"]',
      'input[id="email"]'
    ];

    const possiblePasswordInputs = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="senha"]',
      'input[placeholder*="password"]',
      'input[id="password"]'
    ];

    let emailInput = null;
    let passwordInput = null;

    // Try to find email input
    for (const selector of possibleEmailInputs) {
      const input = page.locator(selector);
      if (await input.isVisible()) {
        emailInput = input;
        console.log(`Found email input with selector: ${selector}`);
        break;
      }
    }

    // Try to find password input
    for (const selector of possiblePasswordInputs) {
      const input = page.locator(selector);
      if (await input.isVisible()) {
        passwordInput = input;
        console.log(`Found password input with selector: ${selector}`);
        break;
      }
    }

    if (emailInput && passwordInput) {
      try {
        await emailInput.fill('admin@momentocake.com.br');
        await passwordInput.fill('G8j5k188');
        
        await page.screenshot({ path: 'test-results/manual-login-filled.png', fullPage: true });

        // Look for submit button
        const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForLoadState('networkidle');
          
          await page.screenshot({ path: 'test-results/manual-after-login.png', fullPage: true });
          
          console.log('After login URL:', page.url());
          
          // Try to navigate to suppliers
          if (!page.url().includes('/login')) {
            await page.goto('http://localhost:3000/suppliers');
            await page.waitForLoadState('networkidle');
            
            await page.screenshot({ path: 'test-results/manual-suppliers-authenticated.png', fullPage: true });
            
            console.log('Suppliers page after auth:', page.url());
          }
        }
      } catch (error) {
        console.log('Login attempt error:', error.message);
      }
    } else {
      console.log('Could not find login form elements');
      
      // Take screenshot of all page elements for debugging
      await page.screenshot({ path: 'test-results/manual-login-debug.png', fullPage: true });
      
      // Try to get page content for debugging
      const pageContent = await page.content();
      console.log('Page contains email input:', pageContent.includes('type="email"'));
      console.log('Page contains password input:', pageContent.includes('type="password"'));
    }
  });

  test('Direct API testing for suppliers', async ({ page }) => {
    console.log('🔌 Testing direct API access...');

    try {
      // Try to access suppliers API directly
      const response = await page.request.get('http://localhost:3000/api/suppliers');
      console.log('Suppliers API status:', response.status());
      console.log('Suppliers API ok:', response.ok());

      if (response.ok()) {
        const data = await response.json();
        console.log('Suppliers data:', data);
      } else {
        console.log('API error:', await response.text());
      }
    } catch (error) {
      console.log('API request error:', error.message);
    }
  });

  test('Check for console errors and network issues', async ({ page }) => {
    console.log('🐛 Checking for console errors...');

    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate to different pages and check for errors
    const testUrls = [
      'http://localhost:3000',
      'http://localhost:3000/login',
      'http://localhost:3000/dashboard',
      'http://localhost:3000/suppliers'
    ];

    for (const url of testUrls) {
      try {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Allow time for any async errors
        
        console.log(`✅ Visited: ${url}`);
      } catch (error) {
        console.log(`❌ Error visiting ${url}:`, error.message);
      }
    }

    console.log('\n📊 ERROR SUMMARY:');
    if (consoleErrors.length > 0) {
      console.log('🚨 Console Errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }

    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No network errors detected');
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/manual-final-state.png', fullPage: true });
  });

});