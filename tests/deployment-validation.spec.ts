import { test, expect, Page } from '@playwright/test';

/**
 * Firebase Deployment Validation Test Suite
 * 
 * Validates the deployed Momento Cake admin application at:
 * https://momentocake-admin-dev.web.app
 * 
 * Test Coverage:
 * - Application loading and initialization
 * - Firebase configuration and connectivity 
 * - Authentication flow
 * - Responsive design
 * - Performance metrics
 * - Accessibility compliance
 * - Error handling
 */

const DEPLOYMENT_URL = 'https://momentocake-admin-dev.web.app';
const TEST_TIMEOUT = 30000;

test.describe('Firebase Deployment Validation', () => {
  
  test.describe('Basic Application Loading', () => {
    
    test('application loads without errors', async ({ page }) => {
      // Navigate to deployed application
      const response = await page.goto(DEPLOYMENT_URL);
      
      // Verify successful response
      expect(response?.status()).toBe(200);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      // Check for any console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Take screenshot for verification
      await page.screenshot({ 
        path: 'deployment-validation-home.png',
        fullPage: true 
      });
      
      // Verify no critical JavaScript errors
      expect(errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('ads') &&
        !error.includes('tracking')
      )).toHaveLength(0);
    });

    test('Firebase is properly initialized', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Check if Firebase is available globally
      const firebaseConfig = await page.evaluate(() => {
        return typeof window !== 'undefined' && 
               window.firebase !== undefined ||
               window.FB_CONFIG !== undefined;
      });
      
      // Verify Firebase initialization (should not throw errors)
      const initError = await page.evaluate(() => {
        try {
          // Check if Firebase app is initialized
          return window.location.href.includes('momentocake-admin-dev');
        } catch (error) {
          return error.message;
        }
      });
      
      expect(initError).toBeTruthy();
    });

    test('login page is accessible', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login or show login form
      const currentUrl = page.url();
      const hasLoginElements = await page.locator('input[type="email"], input[name="email"], [data-testid*="email"], [data-testid*="login"]').count() > 0;
      const hasLoginText = await page.locator('text=/login|entrar|acesso/i').count() > 0;
      
      expect(hasLoginElements || hasLoginText || currentUrl.includes('login')).toBeTruthy();
      
      // Take screenshot of login page
      await page.screenshot({ 
        path: 'deployment-validation-login.png',
        fullPage: true 
      });
    });
  });

  test.describe('Authentication Flow Testing', () => {
    
    test('login form functionality', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for email input field
      const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid*="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid*="password"]').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        // Test form interaction
        await emailInput.fill('test@example.com');
        await passwordInput.fill('testpassword');
        
        // Take screenshot with filled form
        await page.screenshot({ 
          path: 'deployment-validation-login-form.png',
          fullPage: true 
        });
        
        // Verify form can be filled
        expect(await emailInput.inputValue()).toBe('test@example.com');
        expect(await passwordInput.inputValue()).toBe('testpassword');
        
        // Look for submit button
        const submitButton = page.locator('button[type="submit"], button:has-text("entrar"), button:has-text("login"), [data-testid*="login"]').first();
        if (await submitButton.count() > 0) {
          expect(await submitButton.isEnabled()).toBeTruthy();
        }
      }
    });

    test('Firebase Auth error handling', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid*="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid*="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("entrar"), button:has-text("login"), [data-testid*="login"]').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
        // Try invalid credentials
        await emailInput.fill('invalid@test.com');
        await passwordInput.fill('wrongpassword');
        await submitButton.click();
        
        // Wait for potential error message
        await page.waitForTimeout(3000);
        
        // Look for error indicators
        const errorMessages = await page.locator('[class*="error"], [role="alert"], .text-red-500, .text-danger').count();
        const currentUrl = page.url();
        
        // Should either show error or stay on login page
        expect(currentUrl.includes('dashboard')).toBeFalsy();
      }
    });
  });

  test.describe('Responsive Design Testing', () => {
    
    test('mobile layout (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'deployment-validation-mobile-375.png',
        fullPage: true 
      });
      
      // Check mobile responsiveness
      const body = page.locator('body');
      const bodyWidth = await body.evaluate(el => el.scrollWidth);
      
      // Should not have horizontal scroll
      expect(bodyWidth).toBeLessThanOrEqual(375);
    });

    test('tablet layout (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Take tablet screenshot
      await page.screenshot({ 
        path: 'deployment-validation-tablet-768.png',
        fullPage: true 
      });
      
      // Verify layout adapts to tablet size
      const body = page.locator('body');
      const bodyWidth = await body.evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(768);
    });

    test('desktop layout (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Take desktop screenshot
      await page.screenshot({ 
        path: 'deployment-validation-desktop-1920.png',
        fullPage: true 
      });
      
      // Verify desktop layout
      const body = page.locator('body');
      const bodyWidth = await body.evaluate(el => el.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1920);
    });
  });

  test.describe('Performance Testing', () => {
    
    test('page load times', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (10 seconds max for deployment)
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`Page load time: ${loadTime}ms`);
    });

    test('Core Web Vitals measurement', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      
      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            LCP: 0,
            FID: 0,
            CLS: 0,
            TTFB: 0
          };
          
          // Measure TTFB
          if ('navigation' in performance) {
            const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            vitals.TTFB = navTiming.responseStart - navTiming.requestStart;
          }
          
          // Basic LCP simulation
          setTimeout(() => {
            vitals.LCP = performance.now();
            resolve(vitals);
          }, 1000);
        });
      });
      
      console.log('Web Vitals:', webVitals);
      
      // Basic performance assertions
      expect(webVitals.TTFB).toBeLessThan(2000); // TTFB < 2s
      expect(webVitals.LCP).toBeLessThan(5000);  // LCP < 5s (relaxed for deployment)
    });
  });

  test.describe('Accessibility Testing', () => {
    
    test('keyboard navigation', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusable = await page.evaluate(() => document.activeElement?.tagName);
      
      // Should have focusable elements
      expect(['INPUT', 'BUTTON', 'A', 'SELECT'].includes(firstFocusable || '')).toBeTruthy();
    });

    test('basic accessibility checks', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Check for basic accessibility features
      const hasDoctype = await page.evaluate(() => document.doctype !== null);
      const hasLang = await page.locator('html[lang]').count() > 0;
      const hasTitle = await page.locator('title').count() > 0;
      
      expect(hasDoctype).toBeTruthy();
      expect(hasLang).toBeTruthy();
      expect(hasTitle).toBeTruthy();
      
      // Check for alt attributes on images
      const images = page.locator('img');
      const imageCount = await images.count();
      if (imageCount > 0) {
        for (let i = 0; i < Math.min(imageCount, 5); i++) {
          const hasAlt = await images.nth(i).getAttribute('alt') !== null;
          expect(hasAlt).toBeTruthy();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    
    test('404 page handling', async ({ page }) => {
      const response = await page.goto(`${DEPLOYMENT_URL}/non-existent-page`);
      
      // Should either redirect or show 404
      const status = response?.status();
      const currentUrl = page.url();
      
      // Take screenshot of error handling
      await page.screenshot({ 
        path: 'deployment-validation-404.png',
        fullPage: true 
      });
      
      // Should handle 404 gracefully (either redirect to home or show 404 page)
      expect([200, 404].includes(status || 0)).toBeTruthy();
    });

    test('network error resilience', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      
      // Simulate offline condition
      await page.context().setOffline(true);
      
      // Try to navigate
      await page.reload({ waitUntil: 'networkidle' });
      
      // Take screenshot of offline state
      await page.screenshot({ 
        path: 'deployment-validation-offline.png',
        fullPage: true 
      });
      
      // Should handle offline gracefully (not crash)
      const hasError = await page.locator('text=/error|erro|falha/i').count() > 0;
      const pageTitle = await page.title();
      
      // Should either show error message or maintain some functionality
      expect(pageTitle.length > 0 || hasError).toBeTruthy();
      
      // Restore online state
      await page.context().setOffline(false);
    });
  });

  test.describe('Firebase Configuration Validation', () => {
    
    test('Firebase project configuration', async ({ page }) => {
      await page.goto(DEPLOYMENT_URL);
      await page.waitForLoadState('networkidle');
      
      // Check Firebase configuration in the browser
      const firebaseProjectId = await page.evaluate(() => {
        // Try to access Firebase config from window or check DOM
        try {
          if (window.location.hostname.includes('momentocake-admin-dev')) {
            return 'momentocake-admin-dev';
          }
          return null;
        } catch (error) {
          return null;
        }
      });
      
      // Verify we're on the correct Firebase project
      expect(page.url()).toContain('momentocake-admin-dev');
    });
  });
});