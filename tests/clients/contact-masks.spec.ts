import { test, expect, Page } from '@playwright/test'

const BASE_URL = 'http://localhost:4000'

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')
  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
}

test.describe('Contact Method Masks & Placeholders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/clients/new`)
    await page.waitForLoadState('load')
  })

  test('phone mask formats correctly as user types', async ({ page }) => {
    // The default contact method type is "phone"
    const contactValueInput = page.locator('.space-y-3 >> nth=0').locator('input[type="tel"]').first()
    await contactValueInput.fill('')
    await contactValueInput.type('11999887766', { delay: 50 })

    const value = await contactValueInput.inputValue()
    // Should be formatted as (11) 99988-7766
    expect(value).toMatch(/^\(\d{2}\) \d{5}-\d{4}$/)
  })

  test('changing contact type to email updates placeholder', async ({ page }) => {
    // Change type select from phone to email
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('email')

    // After changing to email, the input type should be email and placeholder should update
    const contactInput = page.locator('input[type="email"]').last()
    const placeholder = await contactInput.getAttribute('placeholder')
    expect(placeholder).toBe('email@exemplo.com')
  })

  test('email type shows email placeholder', async ({ page }) => {
    // Change contact method type to email
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('email')

    // Verify email input appears with correct placeholder
    const emailInput = page.locator('input[placeholder="email@exemplo.com"]')
    await expect(emailInput).toBeVisible()
  })

  test('whatsapp uses phone mask', async ({ page }) => {
    // Change type to whatsapp
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('whatsapp')

    // Input should use tel type
    const contactInput = page.locator('input[type="tel"]').last()
    await contactInput.fill('')
    await contactInput.type('11999887766', { delay: 50 })

    const value = await contactInput.inputValue()
    // Should use the same phone mask format
    expect(value).toMatch(/^\(\d{2}\) \d{5}-\d{4}$/)
  })

  test('instagram shows correct placeholder', async ({ page }) => {
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('instagram')

    const contactInput = page.locator('input[placeholder="@usuario"]')
    await expect(contactInput).toBeVisible()
  })

  test('linkedin shows correct placeholder', async ({ page }) => {
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('linkedin')

    const contactInput = page.locator('input[placeholder="linkedin.com/in/usuario"]')
    await expect(contactInput).toBeVisible()
  })
})
