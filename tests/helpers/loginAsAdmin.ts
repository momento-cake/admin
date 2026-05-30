import { Page, expect } from '@playwright/test'

/**
 * Logs in as the master admin and waits for the dashboard.
 * Uses the verified selectors from CLAUDE.md (input[type=email/password]).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('load')
  await page.locator('input[type="email"]').fill('admin@momentocake.com.br')
  await page.locator('input[type="password"]').fill('G8j5k188')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard/**', { timeout: 20000 })
  await expect(page).toHaveURL(/\/dashboard/)
}
