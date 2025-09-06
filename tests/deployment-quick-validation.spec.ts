import { test, expect, Page } from '@playwright/test';

/**
 * Quick Firebase Deployment Validation Test Suite
 * 
 * Optimized tests for the deployed Momento Cake admin application at:
 * https://momentocake-admin-dev.web.app
 */

const DEPLOYMENT_URL = 'https://momentocake-admin-dev.web.app';

test.describe('Firebase Deployment Quick Validation', () => {
  
  test.describe('Application Health Check', () => {
    
    test('application loads and shows login page', async ({ page }) => {
      // Navigate to deployed application
      const response = await page.goto(DEPLOYMENT_URL);
      
      // Verify successful response
      expect(response?.status()).toBe(200);
      
      // Wait for basic content to load
      await page.waitForLoadState('domcontentloaded');
      
      // Check for login form elements
      await expect(page.locator('text=Momento Cake')).toBeVisible();
      await expect(page.locator('text=Fazer Login')).toBeVisible();
      await expect(page.locator('input[placeholder*="email"], input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
      
      // Take screenshot for documentation
      await page.screenshot({ 
        path: 'deployment-login-page.png',
        fullPage: true 
      });
    });

    test('Firebase configuration is working', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Verify we're on the correct Firebase hosting domain
      expect(page.url()).toContain('momentocake-admin-dev');
      
      // Check that no critical Firebase errors are logged
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && 
            (msg.text().includes('Firebase') || 
             msg.text().includes('auth') ||
             msg.text().includes('firestore'))) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000); // Wait for initial Firebase loading
      
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('Authentication Flow', () => {
    
    test('login form is interactive', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[placeholder*="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.locator('button:has-text("Entrar")').first();
      
      // Test form interaction
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword123');
      
      // Verify form can be filled
      expect(await emailInput.inputValue()).toBe('test@example.com');
      expect(await passwordInput.inputValue()).toBe('testpassword123');
      expect(await loginButton.isEnabled()).toBeTruthy();
      
      // Take screenshot with filled form
      await page.screenshot({ 
        path: 'deployment-login-filled.png',
        fullPage: true 
      });
    });

    test('first access button is functional', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      const firstAccessButton = page.locator('button:has-text("Primeiro Acesso")');
      await expect(firstAccessButton).toBeVisible();
      await expect(firstAccessButton).toBeEnabled();
      
      // Click first access button
      await firstAccessButton.click();
      
      // Wait a moment for any navigation or modal
      await page.waitForTimeout(1000);
      
      // Take screenshot after clicking
      await page.screenshot({ 
        path: 'deployment-first-access.png',
        fullPage: true 
      });
    });
  });

  test.describe('Responsive Design', () => {
    
    test('mobile layout renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Check mobile responsive elements
      await expect(page.locator('text=Momento Cake')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'deployment-mobile-375.png',
        fullPage: true 
      });
      
      // Verify no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(375);
    });

    test('tablet layout renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Check tablet responsive elements
      await expect(page.locator('text=Momento Cake')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Take tablet screenshot
      await page.screenshot({ 
        path: 'deployment-tablet-768.png',
        fullPage: true 
      });
    });

    test('desktop layout renders correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Check desktop responsive elements
      await expect(page.locator('text=Momento Cake')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Take desktop screenshot
      await page.screenshot({ 
        path: 'deployment-desktop-1920.png',
        fullPage: true 
      });
    });
  });

  test.describe('Performance Check', () => {
    
    test('page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds (generous for deployment)
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`Page load time: ${loadTime}ms`);
    });

    test('critical resources load successfully', async ({ page }) => {
      const failedRequests = [];
      
      page.on('response', response => {
        if (response.status() >= 400 && 
            (response.url().includes('.js') || 
             response.url().includes('.css') ||
             response.url().includes('firebase'))) {
          failedRequests.push(`${response.status()}: ${response.url()}`);
        }
      });
      
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Wait for resources
      
      expect(failedRequests).toHaveLength(0);
    });
  });

  test.describe('Accessibility Basics', () => {
    
    test('page has proper semantic structure', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Check basic accessibility features
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      
      const hasLang = await page.locator('html[lang]').count() > 0;
      expect(hasLang).toBeTruthy();
      
      // Check for form labels
      const emailInput = page.locator('input[type="email"]').first();
      const emailLabel = page.locator('label, text="Email"');
      expect(await emailLabel.count()).toBeGreaterThan(0);
    });

    test('keyboard navigation works', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('domcontentloaded');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      // Should focus on first interactive element
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON'].includes(focusedElement || '')).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    
    test('handles non-existent routes gracefully', async ({ page }) => {
      const response = await page.goto(`${DEPLOYMENT_URL}/non-existent-page`);
      
      // Should either redirect or show proper error page
      const status = response?.status();
      expect([200, 404].includes(status || 0)).toBeTruthy();
      
      // Take screenshot of error handling
      await page.screenshot({ 
        path: 'deployment-404-handling.png',
        fullPage: true 
      });
    });
  });
});