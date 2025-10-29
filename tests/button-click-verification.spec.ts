import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive test suite for "Adicionar Pessoa" and "Adicionar Data" buttons
 * in the Novo Cliente modal.
 *
 * Tests verify:
 * 1. Button click detection
 * 2. Form display
 * 3. Data submission
 * 4. Console log verification
 */

const BASE_URL = 'http://localhost:3002'
const ADMIN_EMAIL = 'admin@momentocake.com.br'
const ADMIN_PASSWORD = 'G8j5k188'

// Helper function to login
async function login(page: Page) {
  console.log('Navigating to login page...')
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')

  console.log('Filling in login credentials...')
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)

  console.log('Clicking login button...')
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL(/.*dashboard.*/, { timeout: 10000 })
  console.log('Successfully logged in')
}

// Helper function to open Novo Cliente modal
async function openNovoClienteModal(page: Page) {
  console.log('Navigating to dashboard...')
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('load')

  // Wait for the page to fully load
  await page.waitForTimeout(2000)

  console.log('Looking for Clientes sidebar menu...')
  // Click on the Clientes menu item in the sidebar
  const clientesMenuItem = page.locator('a:has-text("Clientes"), button:has-text("Clientes")').first()
  const isVisible = await clientesMenuItem.isVisible().catch(() => false)

  if (isVisible) {
    console.log('Clicking Clientes menu item...')
    await clientesMenuItem.click()
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)
  } else {
    console.log('Clientes menu not found, trying direct navigation...')
  }

  console.log('Looking for Novo Cliente or Adicionar Cliente button...')
  // Try both button texts
  const clientButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar Cliente")').first()

  console.log('Waiting for client button to be visible...')
  await clientButton.waitFor({ state: 'visible', timeout: 10000 })

  console.log('Clicking client button...')
  await clientButton.click()

  // Wait for modal to appear - it has a fixed inset-0 class and bg-black/50
  console.log('Waiting for modal to appear...')
  await page.waitForSelector('.fixed.inset-0', { timeout: 10000 })

  // Also verify the modal header is visible
  await page.waitForSelector('h2:has-text("Novo Cliente"), h2:has-text("Editar Cliente")').catch(() => {})
  console.log('Modal opened successfully')
}

test.describe('Novo Cliente Modal - Button Click Verification', () => {
  let consoleLogs: string[] = []

  test.beforeEach(async ({ page }) => {
    // Capture console logs
    consoleLogs = []
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
      console.log('Browser console:', text)
    })

    // Login before each test
    await login(page)
  })

  test('Test 1 - Adicionar Pessoa Button: Click detection and form display', async ({ page }) => {
    console.log('\n=== Test 1: Adicionar Pessoa Button ===')

    // Open the Novo Cliente modal
    await openNovoClienteModal(page)

    // Take screenshot of initial modal state
    await page.screenshot({
      path: 'test-results/modal-initial-state.png',
      fullPage: true
    })

    // Find the "Adicionar Pessoa" button
    console.log('Looking for Adicionar Pessoa button...')
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first()

    // Wait for button to be visible
    await adicionarPessoaButton.waitFor({ state: 'visible', timeout: 10000 })
    console.log('Adicionar Pessoa button found and visible')

    // Take screenshot before clicking
    await page.screenshot({
      path: 'test-results/before-adicionar-pessoa-click.png',
      fullPage: true
    })

    // Click the button
    console.log('Clicking Adicionar Pessoa button...')
    await adicionarPessoaButton.click()

    // Wait a moment for any state changes
    await page.waitForTimeout(1000)

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-results/after-adicionar-pessoa-click.png',
      fullPage: true
    })

    // Verify console log was generated
    console.log('Checking console logs...')
    console.log('All console logs:', consoleLogs)

    const hasCorrectLog = consoleLogs.some(log =>
      log.includes('RelatedPersonsSection: Add button clicked')
    )

    if (!hasCorrectLog) {
      console.error('ERROR: Expected console log not found!')
      console.error('Expected: "RelatedPersonsSection: Add button clicked"')
      console.error('Received logs:', consoleLogs)
    }

    expect(hasCorrectLog).toBeTruthy()
    console.log('✓ Console log verified: Button click was detected')

    // Verify the form appears with expected fields
    console.log('Verifying form fields appear...')

    // Wait for the form to appear and scroll it into view
    await page.waitForTimeout(500)

    // Name field (required) - use a more specific selector
    const nameInput = page.locator('input[placeholder="Nome completo"]').first()

    // Scroll the input into view
    await nameInput.scrollIntoViewIfNeeded().catch(() => console.log('Field already in view'))

    await expect(nameInput).toBeVisible({ timeout: 10000 })
    console.log('✓ Name input field is visible')

    // Relationship dropdown (required)
    const relationshipSelect = page.locator('select').filter({ hasText: /Filho|Pai|Irmão/ })
    await expect(relationshipSelect).toBeVisible()
    console.log('✓ Relationship select is visible')

    // Email field
    const emailInput = page.locator('input[type="email"][placeholder*="email"]')
    await expect(emailInput).toBeVisible()
    console.log('✓ Email input field is visible')

    // Phone field
    const phoneInput = page.locator('input[type="tel"]')
    await expect(phoneInput).toBeVisible()
    console.log('✓ Phone input field is visible')

    // Birth date field
    const birthDateInput = page.locator('input[type="date"]')
    await expect(birthDateInput).toBeVisible()
    console.log('✓ Birth date input field is visible')

    // Notes textarea
    const notesTextarea = page.locator('textarea[placeholder*="Observações"]')
    await expect(notesTextarea).toBeVisible()
    console.log('✓ Notes textarea is visible')

    console.log('✓ All form fields are present and visible')
  })

  test('Test 2 - Adicionar Pessoa Button: Fill and submit form', async ({ page }) => {
    console.log('\n=== Test 2: Fill and Submit Related Person Form ===')

    // Open the Novo Cliente modal
    await openNovoClienteModal(page)

    // Click Adicionar Pessoa button
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first()
    await adicionarPessoaButton.waitFor({ state: 'visible', timeout: 10000 })
    await adicionarPessoaButton.click()
    await page.waitForTimeout(500)

    // Fill in the form with test data
    console.log('Filling in related person form...')

    await page.fill('input[placeholder="Nome completo"]', 'João da Silva')
    console.log('✓ Filled name: João da Silva')

    // Select relationship
    const relationshipSelect = page.locator('select').filter({ hasText: /Filho|Pai|Irmão/ })
    await relationshipSelect.selectOption('child')
    console.log('✓ Selected relationship: child')

    await page.fill('input[type="email"][placeholder*="email"]', 'joao@example.com')
    console.log('✓ Filled email: joao@example.com')

    await page.fill('input[type="tel"]', '(11) 98765-4321')
    console.log('✓ Filled phone: (11) 98765-4321')

    await page.fill('input[type="date"]', '2000-05-15')
    console.log('✓ Filled birth date: 2000-05-15')

    await page.fill('textarea[placeholder*="Observações"]', 'Filho mais velho')
    console.log('✓ Filled notes: Filho mais velho')

    // Take screenshot before submission
    await page.screenshot({
      path: 'test-results/related-person-form-filled.png',
      fullPage: true
    })

    // Click the submit button (Adicionar Pessoa within the form)
    console.log('Clicking submit button...')
    const submitButton = page.locator('button[type="submit"]:has-text("Adicionar Pessoa")')
    await submitButton.click()

    // Wait for form to close
    await page.waitForTimeout(1000)

    // Take screenshot after submission
    await page.screenshot({
      path: 'test-results/after-person-submission.png',
      fullPage: true
    })

    // Verify the person appears in the list
    console.log('Verifying person was added to list...')
    const personCard = page.locator('text=João da Silva')
    await expect(personCard).toBeVisible()
    console.log('✓ Person added successfully and appears in list')
  })

  test('Test 3 - Adicionar Data Button: Click detection and form display', async ({ page }) => {
    console.log('\n=== Test 3: Adicionar Data Button ===')

    // Open the Novo Cliente modal
    await openNovoClienteModal(page)

    // Scroll to find the Special Dates section
    console.log('Scrolling to Special Dates section...')
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(500)

    // Find the "Adicionar Data" button
    console.log('Looking for Adicionar Data button...')
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")').first()

    // Wait for button to be visible
    await adicionarDataButton.waitFor({ state: 'visible', timeout: 10000 })
    console.log('Adicionar Data button found and visible')

    // Take screenshot before clicking
    await page.screenshot({
      path: 'test-results/before-adicionar-data-click.png',
      fullPage: true
    })

    // Click the button
    console.log('Clicking Adicionar Data button...')
    await adicionarDataButton.click()

    // Wait a moment for any state changes
    await page.waitForTimeout(1000)

    // Take screenshot after clicking
    await page.screenshot({
      path: 'test-results/after-adicionar-data-click.png',
      fullPage: true
    })

    // Verify console log was generated
    console.log('Checking console logs...')
    console.log('All console logs:', consoleLogs)

    const hasCorrectLog = consoleLogs.some(log =>
      log.includes('SpecialDatesSection: Add button clicked')
    )

    if (!hasCorrectLog) {
      console.error('ERROR: Expected console log not found!')
      console.error('Expected: "SpecialDatesSection: Add button clicked"')
      console.error('Received logs:', consoleLogs)
    }

    expect(hasCorrectLog).toBeTruthy()
    console.log('✓ Console log verified: Button click was detected')

    // Verify the form appears with expected fields
    console.log('Verifying form fields appear...')

    // Date field (required)
    const dateInput = page.locator('label:has-text("Data *")').locator('..').locator('input[type="date"]')
    await expect(dateInput).toBeVisible()
    console.log('✓ Date input field is visible')

    // Type dropdown (required)
    const typeSelect = page.locator('select').filter({ hasText: /Aniversário|Casamento/ })
    await expect(typeSelect).toBeVisible()
    console.log('✓ Type select is visible')

    // Description field (required)
    const descriptionInput = page.locator('input[placeholder*="Aniversário"]')
    await expect(descriptionInput).toBeVisible()
    console.log('✓ Description input field is visible')

    // Notes textarea
    const notesTextarea = page.locator('textarea[placeholder*="Observações"]').last()
    await expect(notesTextarea).toBeVisible()
    console.log('✓ Notes textarea is visible')

    console.log('✓ All form fields are present and visible')
  })

  test('Test 4 - Adicionar Data Button: Fill and submit form', async ({ page }) => {
    console.log('\n=== Test 4: Fill and Submit Special Date Form ===')

    // Open the Novo Cliente modal
    await openNovoClienteModal(page)

    // Scroll to find the Special Dates section
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(500)

    // Click Adicionar Data button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")').first()
    await adicionarDataButton.waitFor({ state: 'visible', timeout: 10000 })
    await adicionarDataButton.click()
    await page.waitForTimeout(500)

    // Fill in the form with test data
    console.log('Filling in special date form...')

    // Fill date field
    const dateInput = page.locator('label:has-text("Data *")').locator('..').locator('input[type="date"]')
    await dateInput.fill('2024-12-25')
    console.log('✓ Filled date: 2024-12-25')

    // Select type
    const typeSelect = page.locator('select').filter({ hasText: /Aniversário|Casamento/ })
    await typeSelect.selectOption('birthday')
    console.log('✓ Selected type: birthday')

    await page.fill('input[placeholder*="Aniversário"]', 'Aniversário da Maria')
    console.log('✓ Filled description: Aniversário da Maria')

    const notesTextarea = page.locator('textarea[placeholder*="Observações"]').last()
    await notesTextarea.fill('Preparar bolo de chocolate')
    console.log('✓ Filled notes: Preparar bolo de chocolate')

    // Take screenshot before submission
    await page.screenshot({
      path: 'test-results/special-date-form-filled.png',
      fullPage: true
    })

    // Click the submit button (Adicionar Data within the form)
    console.log('Clicking submit button...')
    const submitButton = page.locator('button[type="submit"]:has-text("Adicionar Data")')
    await submitButton.click()

    // Wait for form to close
    await page.waitForTimeout(1000)

    // Take screenshot after submission
    await page.screenshot({
      path: 'test-results/after-date-submission.png',
      fullPage: true
    })

    // Verify the date appears in the list
    console.log('Verifying date was added to list...')
    const dateCard = page.locator('text=Aniversário da Maria')
    await expect(dateCard).toBeVisible()
    console.log('✓ Special date added successfully and appears in list')
  })

  test('Test 5 - Button Click Propagation: Verify no unwanted form submission', async ({ page }) => {
    console.log('\n=== Test 5: Button Click Propagation ===')

    // Open the Novo Cliente modal
    await openNovoClienteModal(page)

    // Get initial modal state
    const modalBefore = await page.locator('role=dialog').isVisible()
    expect(modalBefore).toBeTruthy()
    console.log('✓ Modal is open')

    // Click Adicionar Pessoa button
    console.log('Clicking Adicionar Pessoa button...')
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first()
    await adicionarPessoaButton.click()
    await page.waitForTimeout(500)

    // Modal should still be open
    const modalAfterPersonClick = await page.locator('role=dialog').isVisible()
    expect(modalAfterPersonClick).toBeTruthy()
    console.log('✓ Modal remains open after Adicionar Pessoa click')

    // Cancel the person form
    await page.locator('button:has-text("Cancelar")').first().click()
    await page.waitForTimeout(500)

    // Scroll to Special Dates section
    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(500)

    // Click Adicionar Data button
    console.log('Clicking Adicionar Data button...')
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")').first()
    await adicionarDataButton.click()
    await page.waitForTimeout(500)

    // Modal should still be open
    const modalAfterDataClick = await page.locator('role=dialog').isVisible()
    expect(modalAfterDataClick).toBeTruthy()
    console.log('✓ Modal remains open after Adicionar Data click')

    // Verify console logs show both button clicks
    const hasPersonLog = consoleLogs.some(log =>
      log.includes('RelatedPersonsSection: Add button clicked')
    )
    const hasDateLog = consoleLogs.some(log =>
      log.includes('SpecialDatesSection: Add button clicked')
    )

    expect(hasPersonLog).toBeTruthy()
    expect(hasDateLog).toBeTruthy()
    console.log('✓ Both button clicks were properly detected via console logs')
    console.log('✓ No unwanted form submission occurred')
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `test-results/failure-${testInfo.title.replace(/\s+/g, '-')}.png`,
        fullPage: true
      })
      console.error(`Test failed: ${testInfo.title}`)
      console.error('Console logs at time of failure:', consoleLogs)
    }
  })
})

// Additional test suite for edge cases
test.describe('Edge Cases and Validation', () => {
  test('Test 6 - Multiple button clicks: Verify idempotency', async ({ page }) => {
    console.log('\n=== Test 6: Multiple Button Clicks ===')

    await login(page)
    await openNovoClienteModal(page)

    // Click Adicionar Pessoa button multiple times rapidly
    console.log('Clicking Adicionar Pessoa button multiple times...')
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first()
    await adicionarPessoaButton.click()
    await adicionarPessoaButton.click()
    await adicionarPessoaButton.click()

    await page.waitForTimeout(1000)

    // Verify only one form is displayed
    const formCount = await page.locator('input[placeholder="Nome completo"]').count()
    expect(formCount).toBe(1)
    console.log('✓ Only one form displayed despite multiple clicks')
  })

  test('Test 7 - Button visibility: Verify button hides when form is open', async ({ page }) => {
    console.log('\n=== Test 7: Button Visibility ===')

    await login(page)
    await openNovoClienteModal(page)

    // Verify Adicionar Pessoa button is visible initially
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first()
    await expect(adicionarPessoaButton).toBeVisible()
    console.log('✓ Adicionar Pessoa button is visible initially')

    // Click the button
    await adicionarPessoaButton.click()
    await page.waitForTimeout(500)

    // Verify button is no longer visible
    await expect(adicionarPessoaButton).not.toBeVisible()
    console.log('✓ Adicionar Pessoa button is hidden when form is open')

    // Cancel the form
    await page.locator('button:has-text("Cancelar")').first().click()
    await page.waitForTimeout(500)

    // Verify button is visible again
    await expect(adicionarPessoaButton).toBeVisible()
    console.log('✓ Adicionar Pessoa button is visible again after form is cancelled')
  })
})
