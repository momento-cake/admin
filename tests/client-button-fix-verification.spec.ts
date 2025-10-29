import { test, expect } from '@playwright/test'

/**
 * Test: Verify "Adicionar Pessoa" and "Adicionar Data" buttons work correctly
 *
 * This test verifies that the fix for the ClientFormModal component works correctly.
 * The buttons should display forms when clicked and allow adding items to lists.
 */

test.describe('ClientFormModal - Adicionar Pessoa and Adicionar Data Buttons', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@momentocake.com.br')
    await page.fill('input[type="password"]', 'G8j5k188')
    await page.click('button[type="submit"]')

    // Wait for successful login by checking for dashboard elements
    await page.waitForSelector('text=Dashboard', { timeout: 15000 })
    console.log('Successfully logged in and dashboard loaded')

    // Wait for page to settle
    await page.waitForLoadState('load')
  })

  test('should display and submit "Adicionar Pessoa" form successfully', async ({ page }) => {
    // Click on Clientes in the sidebar navigation
    const clientsLink = page.locator('a:has-text("Clientes"), button:has-text("Clientes")')
    await expect(clientsLink.first()).toBeVisible({ timeout: 5000 })
    await clientsLink.first().click()
    await page.waitForLoadState('load')
    console.log('Navigated to clients via navigation link')

    // Take screenshot of clients page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/clients-page.png',
      fullPage: true
    })

    // Find and click "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente"), button:has-text("New Client"), button:has-text("Adicionar Cliente")')
    await expect(novoClienteButton.first()).toBeVisible({ timeout: 10000 })
    await novoClienteButton.first().click()
    console.log('Clicked "Novo Cliente" button')

    // Wait for modal to appear - check for the modal header
    await expect(page.locator('h2:has-text("Novo Cliente")')).toBeVisible({ timeout: 5000 })
    console.log('Modal opened successfully')

    // Take screenshot of modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/modal-opened.png',
      fullPage: true
    })

    // Scroll to "Adicionar Pessoa" section
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")')
    await adicionarPessoaButton.scrollIntoViewIfNeeded()

    // Verify "Adicionar Pessoa" button is visible
    await expect(adicionarPessoaButton).toBeVisible({ timeout: 5000 })
    console.log('"Adicionar Pessoa" button is visible')

    // Click "Adicionar Pessoa" button
    await adicionarPessoaButton.click({ force: true })
    console.log('Clicked "Adicionar Pessoa" button')

    // Wait a moment for form to appear
    await page.waitForTimeout(500)

    // Take screenshot after clicking button
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-click-adicionar-pessoa.png',
      fullPage: true
    })

    // Verify the form card appears (has gray background)
    const formCard = page.locator('.bg-gray-50').last()
    await expect(formCard).toBeVisible({ timeout: 5000 })
    console.log('Form card is visible')

    // Fill in the name field - look for input with placeholder that contains "Nome" or is of type text
    const nameInput = formCard.locator('input[type="text"]').first()
    await nameInput.fill('João Silva')
    console.log('Filled name: João Silva')

    // Select relationship type from the dropdown within the form card
    const relationshipSelect = formCard.locator('select').first()
    await relationshipSelect.selectOption({ value: 'child' })
    console.log('Selected relationship: child')

    // Optionally fill email
    const emailInput = formCard.locator('input[type="email"]')
    if (await emailInput.count() > 0) {
      await emailInput.fill('joao@example.com')
      console.log('Filled email: joao@example.com')
    }

    // Optionally fill phone
    const phoneInput = formCard.locator('input[type="tel"]')
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('(11) 99999-9999')
      console.log('Filled phone: (11) 99999-9999')
    }

    // Take screenshot before submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/form-filled-pessoa.png',
      fullPage: true
    })

    // Click the form's "Adicionar Pessoa" button (inside the form)
    const submitPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').last()
    await submitPessoaButton.click()
    console.log('Clicked form submit button')

    // Wait a moment for the person to be added
    await page.waitForTimeout(1000)

    // Take screenshot after submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-submit-pessoa.png',
      fullPage: true
    })

    // Verify the person was added to the list
    await expect(page.locator('text=João Silva')).toBeVisible({ timeout: 5000 })
    console.log('Successfully verified "João Silva" appears in the list')

    // Verify the relationship is shown
    await expect(page.locator('text=Filho(a)')).toBeVisible({ timeout: 2000 })
    console.log('Successfully verified relationship "Filho(a)" is shown')
  })

  test('should display and submit "Adicionar Data" form successfully', async ({ page }) => {
    // Click on Clientes in the sidebar navigation
    const clientsLink = page.locator('a:has-text("Clientes"), button:has-text("Clientes")')
    await expect(clientsLink.first()).toBeVisible({ timeout: 5000 })
    await clientsLink.first().click()
    await page.waitForLoadState('load')
    console.log('Navigated to clients via navigation link')

    // Find and click "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente"), button:has-text("New Client"), button:has-text("Adicionar Cliente")')
    await expect(novoClienteButton.first()).toBeVisible({ timeout: 10000 })
    await novoClienteButton.first().click()
    console.log('Clicked "Novo Cliente" button')

    // Wait for modal to appear - check for the modal header
    await expect(page.locator('h2:has-text("Novo Cliente")')).toBeVisible({ timeout: 5000 })
    console.log('Modal opened successfully')

    // Scroll to "Adicionar Data" section
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")')
    await adicionarDataButton.scrollIntoViewIfNeeded()

    // Verify "Adicionar Data" button is visible
    await expect(adicionarDataButton).toBeVisible({ timeout: 5000 })
    console.log('"Adicionar Data" button is visible')

    // Click "Adicionar Data" button
    await adicionarDataButton.click({ force: true })
    console.log('Clicked "Adicionar Data" button')

    // Wait a moment for form to appear
    await page.waitForTimeout(500)

    // Take screenshot after clicking button
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-click-adicionar-data.png',
      fullPage: true
    })

    // Verify the form card appears (has gray background)
    const formCard = page.locator('.bg-gray-50').last()
    await expect(formCard).toBeVisible({ timeout: 5000 })
    console.log('Form card is visible')

    // Fill in date (future date)
    const dateInput = formCard.locator('input[type="date"]').first()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const dateString = futureDate.toISOString().split('T')[0]
    await dateInput.fill(dateString)
    console.log(`Filled date: ${dateString}`)

    // Select date type
    const typeSelect = formCard.locator('select').first()
    await typeSelect.selectOption({ value: 'birthday' })
    console.log('Selected type: birthday')

    // Fill description
    const descriptionInput = formCard.locator('input[type="text"]').first()
    await descriptionInput.fill('Test Birthday')
    console.log('Filled description: Test Birthday')

    // Take screenshot before submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/form-filled-data.png',
      fullPage: true
    })

    // Click the form's "Adicionar Data" button (inside the form)
    const submitDataButton = page.locator('button:has-text("Adicionar Data")').last()
    await submitDataButton.click()
    console.log('Clicked form submit button')

    // Wait a moment for the date to be added
    await page.waitForTimeout(1000)

    // Take screenshot after submitting
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-submit-data.png',
      fullPage: true
    })

    // Verify the date was added to the list
    await expect(page.locator('text=Test Birthday')).toBeVisible({ timeout: 5000 })
    console.log('Successfully verified "Test Birthday" appears in the list')

    // Verify the date type is shown
    await expect(page.locator('text=Aniversário')).toBeVisible({ timeout: 2000 })
    console.log('Successfully verified date type "Aniversário" is shown')
  })

  test('should show console logs for debugging button clicks', async ({ page }) => {
    // Capture console logs
    const consoleLogs: string[] = []
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Navigate to clients via navigation link
    const clientsLink = page.locator('a:has-text("Clientes"), button:has-text("Clientes")')
    await clientsLink.first().click()
    await page.waitForLoadState('load')

    const novoClienteButton = page.locator('button:has-text("Novo Cliente"), button:has-text("New Client")')
    await novoClienteButton.first().click()
    await page.waitForSelector('text=Novo Cliente, text=New Client', { timeout: 5000 })

    // Click "Adicionar Pessoa" button
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")')
    await adicionarPessoaButton.scrollIntoViewIfNeeded()
    await adicionarPessoaButton.click({ force: true })
    await page.waitForTimeout(500)

    // Check console logs for the expected message
    const hasExpectedLog = consoleLogs.some(log =>
      log.includes('RelatedPersonsSection: Add button clicked')
    )

    console.log('Console logs captured:', consoleLogs)
    console.log('Expected log found:', hasExpectedLog)

    // Click "Adicionar Data" button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")')
    await adicionarDataButton.scrollIntoViewIfNeeded()
    await adicionarDataButton.click({ force: true })
    await page.waitForTimeout(500)

    // Check console logs for the expected message
    const hasExpectedDataLog = consoleLogs.some(log =>
      log.includes('SpecialDatesSection: Add button clicked')
    )

    console.log('Console logs after clicking Data button:', consoleLogs)
    console.log('Expected data log found:', hasExpectedDataLog)
  })
})
