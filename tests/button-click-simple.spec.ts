import { test, expect, Page } from '@playwright/test'

/**
 * Simplified test to verify "Adicionar Pessoa" and "Adicionar Data" buttons
 * are clickable and triggering the expected behavior.
 *
 * This test focuses on:
 * 1. Button click detection via console logs
 * 2. Verifying buttons don't cause unwanted form submission
 * 3. Visual verification via screenshots
 */

const BASE_URL = 'http://localhost:3002'
const ADMIN_EMAIL = 'admin@momentocake.com.br'
const ADMIN_PASSWORD = 'G8j5k188'

test.describe('Novo Cliente Modal - Button Functionality Verification', () => {
  let consoleLogs: string[] = []

  test.beforeEach(async ({ page }) => {
    // Capture console logs
    consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      console.log('Browser console:', text)
    })

    // Login
    console.log('Logging in...')
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('load')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*dashboard.*/, { timeout: 10000 })

    // Navigate to clients page and open modal
    console.log('Opening Novo Cliente modal...')
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    // Click Clientes menu
    const clientesMenu = page.locator('a:has-text("Clientes"), button:has-text("Clientes")').first()
    if (await clientesMenu.isVisible()) {
      await clientesMenu.click()
      await page.waitForLoadState('load')
      await page.waitForTimeout(2000)
    }

    // Click Novo Cliente button
    const novoClienteBtn = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar Cliente")').first()
    await novoClienteBtn.waitFor({ state: 'visible', timeout: 10000 })
    await novoClienteBtn.click()
    await page.waitForSelector('.fixed.inset-0', { timeout: 10000 })
    console.log('Modal opened')
  })

  test('✓ Adicionar Pessoa button click is detected and logged', async ({ page }) => {
    console.log('\n=== Testing Adicionar Pessoa Button ===')

    // Clear previous logs
    consoleLogs = []

    // Take screenshot before clicking
    await page.screenshot({
      path: 'test-results/adicionar-pessoa-before-click.png',
      fullPage: true
    })

    // Find and click the Adicionar Pessoa button
    const adicionarPessoaBtn = page.locator('button:has-text("Adicionar Pessoa")').first()

    // Scroll to button if needed
    await adicionarPessoaBtn.scrollIntoViewIfNeeded()

    // Verify button is visible
    await expect(adicionarPessoaBtn).toBeVisible()
    console.log('✓ Adicionar Pessoa button is visible')

    // Click the button
    await adicionarPessoaBtn.click()
    await page.waitForTimeout(1000)

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-results/adicionar-pessoa-after-click.png',
      fullPage: true
    })

    // Verify console log was generated
    const hasLog = consoleLogs.some(log =>
      log.includes('RelatedPersonsSection: Add button clicked')
    )

    console.log('Console logs captured:', consoleLogs.filter(log =>
      log.includes('RelatedPersonsSection') || log.includes('button clicked')
    ))

    expect(hasLog).toBeTruthy()
    console.log('✓ Button click was detected via console log')

    // Verify modal is still open (no unwanted form submission)
    const modalStillOpen = await page.locator('.fixed.inset-0').isVisible()
    expect(modalStillOpen).toBeTruthy()
    console.log('✓ Modal remains open (no unwanted form submission)')
  })

  test('✓ Adicionar Data button click is detected and logged', async ({ page }) => {
    console.log('\n=== Testing Adicionar Data Button ===')

    // Clear previous logs
    consoleLogs = []

    // Scroll down to find Datas Especiais section
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)

    // Take screenshot before clicking
    await page.screenshot({
      path: 'test-results/adicionar-data-before-click.png',
      fullPage: true
    })

    // Find and click the Adicionar Data button
    const adicionarDataBtn = page.locator('button:has-text("Adicionar Data")').first()

    // Scroll to button if needed
    await adicionarDataBtn.scrollIntoViewIfNeeded()

    // Verify button is visible
    await expect(adicionarDataBtn).toBeVisible()
    console.log('✓ Adicionar Data button is visible')

    // Click the button
    await adicionarDataBtn.click()
    await page.waitForTimeout(1000)

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-results/adicionar-data-after-click.png',
      fullPage: true
    })

    // Verify console log was generated
    const hasLog = consoleLogs.some(log =>
      log.includes('SpecialDatesSection: Add button clicked')
    )

    console.log('Console logs captured:', consoleLogs.filter(log =>
      log.includes('SpecialDatesSection') || log.includes('button clicked')
    ))

    expect(hasLog).toBeTruthy()
    console.log('✓ Button click was detected via console log')

    // Verify modal is still open (no unwanted form submission)
    const modalStillOpen = await page.locator('.fixed.inset-0').isVisible()
    expect(modalStillOpen).toBeTruthy()
    console.log('✓ Modal remains open (no unwanted form submission)')
  })

  test('✓ Both buttons work correctly in sequence', async ({ page }) => {
    console.log('\n=== Testing Both Buttons in Sequence ===')

    // Clear logs
    consoleLogs = []

    // Test Adicionar Pessoa
    console.log('Testing Adicionar Pessoa button...')
    const adicionarPessoaBtn = page.locator('button:has-text("Adicionar Pessoa")').first()
    await adicionarPessoaBtn.scrollIntoViewIfNeeded()
    await adicionarPessoaBtn.click()
    await page.waitForTimeout(500)

    const hasPessoaLog = consoleLogs.some(log =>
      log.includes('RelatedPersonsSection: Add button clicked')
    )
    expect(hasPessoaLog).toBeTruthy()
    console.log('✓ Adicionar Pessoa click detected')

    // Cancel the form if it appeared
    const cancelBtn = page.locator('button:has-text("Cancelar")').first()
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click()
      await page.waitForTimeout(500)
    }

    // Test Adicionar Data
    console.log('Testing Adicionar Data button...')
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)

    const adicionarDataBtn = page.locator('button:has-text("Adicionar Data")').first()
    await adicionarDataBtn.scrollIntoViewIfNeeded()
    await adicionarDataBtn.click()
    await page.waitForTimeout(500)

    const hasDataLog = consoleLogs.some(log =>
      log.includes('SpecialDatesSection: Add button clicked')
    )
    expect(hasDataLog).toBeTruthy()
    console.log('✓ Adicionar Data click detected')

    // Verify modal is still open
    const modalStillOpen = await page.locator('.fixed.inset-0').isVisible()
    expect(modalStillOpen).toBeTruthy()
    console.log('✓ Modal remains open throughout both button clicks')

    // Final screenshot
    await page.screenshot({
      path: 'test-results/both-buttons-tested.png',
      fullPage: true
    })

    console.log('\n=== Summary ===')
    console.log('✓ Both buttons are clickable')
    console.log('✓ Both buttons trigger console logs correctly')
    console.log('✓ No unwanted form submission occurred')
    console.log('✓ Modal remains functional throughout testing')
  })
})
