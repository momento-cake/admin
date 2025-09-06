/**
 * Admin Authentication Error Handling Test
 * Tests error scenarios for the authentication system
 */

import { test, expect, Page } from '@playwright/test';

const APP_URL = 'https://momentocake-admin-dev.web.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const WRONG_PASSWORD = 'wrongpassword123';
const INVALID_EMAIL = 'invalid@example.com';

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `${name}.png`,
    fullPage: true
  });
  console.log(`📸 Screenshot saved: ${name}.png`);
}

test.describe('Admin Authentication Error Handling', () => {
  test('Test Wrong Password Error Handling', async ({ page }) => {
    console.log('🚨 Testing wrong password error handling...');
    
    await page.goto(`${APP_URL}/login`);
    await page.waitForTimeout(3000);
    
    // Fill with correct email but wrong password
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(WRONG_PASSWORD);
    
    await takeScreenshot(page, 'error-test-wrong-password-filled');
    
    await page.locator('button:has-text("Entrar")').click();
    
    // Wait for error response
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`URL after wrong password: ${currentUrl}`);
    
    await takeScreenshot(page, 'error-test-wrong-password-result');
    
    // Should still be on login page
    expect(currentUrl).toContain('/login');
    
    // Look for error messages
    const pageContent = await page.textContent('body');
    console.log('Page content after wrong password:', pageContent?.substring(0, 500));
    
    console.log('✅ Wrong password test completed');
  });

  test('Test Invalid Email Error Handling', async ({ page }) => {
    console.log('🚨 Testing invalid email error handling...');
    
    await page.goto(`${APP_URL}/login`);
    await page.waitForTimeout(3000);
    
    // Fill with invalid email
    await page.locator('input[type="email"]').fill(INVALID_EMAIL);
    await page.locator('input[type="password"]').fill('anypassword');
    
    await takeScreenshot(page, 'error-test-invalid-email-filled');
    
    await page.locator('button:has-text("Entrar")').click();
    
    // Wait for error response
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`URL after invalid email: ${currentUrl}`);
    
    await takeScreenshot(page, 'error-test-invalid-email-result');
    
    // Should still be on login page
    expect(currentUrl).toContain('/login');
    
    console.log('✅ Invalid email test completed');
  });

  test('Test Form Validation', async ({ page }) => {
    console.log('🔍 Testing form validation...');
    
    await page.goto(`${APP_URL}/login`);
    await page.waitForTimeout(3000);
    
    // Test empty form submission
    await page.locator('button:has-text("Entrar")').click();
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'form-validation-empty');
    
    // Test invalid email format
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('button:has-text("Entrar")').click();
    await page.waitForTimeout(1000);
    
    await takeScreenshot(page, 'form-validation-invalid-format');
    
    console.log('✅ Form validation test completed');
  });
});