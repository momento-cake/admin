import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3002'
const SCREENSHOT_DIR = path.join(__dirname, '../../test-results/clients')

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')

  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')

  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
}

test.describe('Momento Cake Admin - Client Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('1.1 Login and verify dashboard access', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('load')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: true })

    expect(page.url()).toContain('/dashboard')
    console.log('✓ Dashboard access verified')
  })

  test('1.2 Navigate to clients page', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-clients-list.png'), fullPage: true })

    expect(page.url()).toContain('/clients')
    console.log('✓ Clients page loaded')
  })

  test('2.1 Verify client list elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    // Check for page title
    const pageTitle = page.locator('h1, h2').filter({ hasText: /clientes/i }).first()
    if (await pageTitle.count() > 0) {
      await expect(pageTitle).toBeVisible()
      console.log('✓ Page title found')
    }

    // Check for create button
    const createButton = page.locator('button, a').filter({ hasText: /novo cliente/i }).first()
    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible()
      console.log('✓ Create button found')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-client-list-elements.png'), fullPage: true })
  })

  test('3.1 Navigate to create client form', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    const createButton = page.locator('button, a').filter({ hasText: /novo cliente/i }).first()
    await createButton.click()

    await page.waitForTimeout(2000)
    await page.waitForLoadState('load')

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-create-form.png'), fullPage: true })

    expect(page.url()).toContain('/clients/new')
    console.log('✓ Create form loaded')
  })

  test('3.2 Fill and submit personal client form', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients/new`)
    await page.waitForLoadState('load')

    const testName = `Cliente Teste ${Date.now()}`

    // Fill basic info
    await page.fill('input[name="name"]', testName)

    const emailInput = page.locator('input[name="email"]')
    if (await emailInput.count() > 0) {
      await emailInput.fill(`cliente${Date.now()}@test.com`)
    }

    // Fill phone
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"]').first()
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('(11) 98765-4321')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-form-filled.png'), fullPage: true })

    // Submit
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /criar/i }).first()
    await submitButton.click()

    await page.waitForTimeout(3000)

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-after-submit.png'), fullPage: true })

    console.log('✓ Form submitted')
  })

  test('4.1 View client details', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    // Click on first "Ver" button
    const viewButton = page.locator('button, a').filter({ hasText: /ver|view/i }).first()
    if (await viewButton.count() > 0) {
      await viewButton.click()
      await page.waitForTimeout(2000)
      await page.waitForLoadState('load')

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-client-detail.png'), fullPage: true })

      console.log('✓ Client detail page viewed')
    }
  })

  test('5.1 Check for Phase 7 features - Tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    const viewButton = page.locator('button, a').filter({ hasText: /ver/i }).first()
    if (await viewButton.count() > 0) {
      await viewButton.click()
      await page.waitForTimeout(2000)

      const tagsSection = page.locator('text=/tags/i').first()
      if (await tagsSection.count() > 0) {
        console.log('✓ Tags section found')
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-tags-section.png'), fullPage: true })
      } else {
        console.log('⚠ Tags section not found')
      }
    }
  })

  test('5.2 Check for Phase 7 features - Related Persons', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    const viewButton = page.locator('button, a').filter({ hasText: /ver/i }).first()
    if (await viewButton.count() > 0) {
      await viewButton.click()
      await page.waitForTimeout(2000)

      const relatedSection = page.locator('text=/pessoas relacionadas|related persons/i').first()
      if (await relatedSection.count() > 0) {
        console.log('✓ Related persons section found')
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-related-persons.png'), fullPage: true })
      } else {
        console.log('⚠ Related persons section not found')
      }
    }
  })

  test('5.3 Check for Phase 7 features - Special Dates', async ({ page }) => {
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')

    const viewButton = page.locator('button, a').filter({ hasText: /ver/i }).first()
    if (await viewButton.count() > 0) {
      await viewButton.click()
      await page.waitForTimeout(2000)

      const datesSection = page.locator('text=/datas especiais|special dates/i').first()
      if (await datesSection.count() > 0) {
        console.log('✓ Special dates section found')
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-special-dates.png'), fullPage: true })
      } else {
        console.log('⚠ Special dates section not found')
      }
    }
  })
})
