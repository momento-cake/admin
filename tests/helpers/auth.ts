import { Page, expect } from '@playwright/test';

/**
 * Authentication helper functions for E2E tests
 */

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with admin credentials
   */
  async loginAsAdmin() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');

    // Fill login form
    await this.page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await this.page.fill('input[type="password"]', 'G8j5k188');
    
    // Submit form
    await this.page.click('button[type="submit"]');
    await this.page.waitForLoadState('networkidle');
    
    // Verify login success - should be on dashboard or redirect to intended page
    await expect(this.page).not.toHaveURL('/login');
  }

  /**
   * Logout
   */
  async logout() {
    // Look for user menu or logout button
    const userMenu = this.page.locator('[data-testid="user-menu"], [aria-label="User menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await this.page.locator('[data-testid="logout"], text="Sair", text="Logout"').click();
    } else {
      // Direct logout button
      await this.page.locator('[data-testid="logout"], text="Sair", text="Logout"').click();
    }
    
    await this.page.waitForLoadState('networkidle');
    await expect(this.page).toHaveURL('/login');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we're on login page
      if (this.page.url().includes('/login')) {
        return false;
      }
      
      // Check for authenticated user indicators
      const userIndicators = [
        '[data-testid="user-menu"]',
        '[data-testid="user-avatar"]',
        '[aria-label="User menu"]'
      ];
      
      for (const indicator of userIndicators) {
        const element = this.page.locator(indicator);
        if (await element.isVisible({ timeout: 1000 })) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Navigate with authentication check
   */
  async navigateAuthenticated(path: string) {
    await this.page.goto(path);
    
    // If redirected to login, login and try again
    if (this.page.url().includes('/login')) {
      await this.loginAsAdmin();
      await this.page.goto(path);
    }
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Setup authenticated state for test
   */
  async setupAuth() {
    if (!(await this.isAuthenticated())) {
      await this.loginAsAdmin();
    }
  }
}

/**
 * Test utilities for authentication
 */
export const authUtils = {
  /**
   * Skip authentication for tests that don't need it
   */
  skipAuth: (page: Page) => {
    // Mock authentication state if needed
    return page.addInitScript(() => {
      // Add any client-side auth mocking here if needed
    });
  },

  /**
   * Mock user session data
   */
  mockUserSession: (page: Page, userData: any = {}) => {
    return page.addInitScript((user) => {
      // Mock user session in local storage or context
      localStorage.setItem('user', JSON.stringify({
        uid: 'test-admin',
        email: 'admin@momentocake.com.br',
        displayName: 'Admin User',
        ...user
      }));
    }, userData);
  }
};