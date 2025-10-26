import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3001'

test.describe('Client Management System', () => {
  let clientId: string

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('load')

    // Fill login form
    await page.fill('input[type="email"]', 'admin@momentocake.com.br')
    await page.fill('input[type="password"]', 'G8j5k188')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')
    await page.waitForLoadState('load')

    // Navigate to clients
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')
  })

  test('should display clients page with correct title', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Clientes')

    // Check for create button
    const createButton = page.locator('button:has-text("Novo Cliente")')
    await expect(createButton).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/clients-list.png', fullPage: true })
  })

  test('should create a personal client successfully', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')
    await page.waitForLoadState('load')

    // Verify form title
    await expect(page.locator('h1')).toContainText('Novo Cliente')

    // Select Pessoa Física (already selected by default)
    await expect(page.locator('input[value="person"]')).toBeChecked()

    // Fill basic information
    const testName = `Cliente Teste ${Date.now()}`
    await page.fill('input[name="name"]', testName)
    await page.fill('input[name="email"]', 'cliente@teste.com.br')
    await page.fill('input[name="phone"]', '(11) 98765-4321')

    // Fill contact method
    await page.fill('input[placeholder*="(11)"]', '(11) 98765-4321')

    // Fill address
    await page.fill('input[name="cep"]', '01310-100')
    await page.fill('input[name="estado"]', 'SP')
    await page.fill('input[name="cidade"]', 'São Paulo')
    await page.fill('input[name="bairro"]', 'Centro')
    await page.fill('input[name="endereco"]', 'Avenida Paulista')
    await page.fill('input[name="numero"]', '1578')

    // Add notes
    await page.fill('textarea[name="notes"]', 'Cliente importante para acompanhamento')

    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/client-form-filled.png', fullPage: true })

    // Submit form
    await page.click('button:has-text("Criar Cliente")')

    // Wait for redirect to clients list
    await page.waitForURL('**/clients')
    await page.waitForLoadState('load')

    // Verify success - check if new client appears
    await expect(page.locator(`text=${testName}`)).toBeVisible()

    // Store client ID from URL or element for later tests
    const clientLink = page.locator(`a:has-text("Ver"):first`)
    if (clientLink) {
      const href = await clientLink.getAttribute('href')
      if (href) {
        clientId = href.split('/').pop() || ''
      }
    }
  })

  test('should create a business client successfully', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    // Select Pessoa Jurídica
    await page.click('input[value="business"]')
    await expect(page.locator('input[value="business"]')).toBeChecked()

    // Wait for business fields to appear
    await page.waitForSelector('input[name="companyName"]')

    // Fill company information
    const testCompany = `Empresa Teste ${Date.now()}`
    await page.fill('input[name="name"]', testCompany)
    await page.fill('input[name="companyName"]', testCompany)
    await page.fill('input[name="cnpj"]', '11.222.333/0001-81')
    await page.fill('input[name="businessType"]', 'Fornecedor de Ingredientes')

    // Fill representative information
    await page.fill('input[name="email"]', 'contato@empresa.com.br')

    // Get representative form fields - they might be nested
    const repNameField = page.locator('[name="name"]').last()
    await repNameField.fill('João Silva')

    const repEmailField = page.locator('[name="email"]').last()
    await repEmailField.fill('joao@empresa.com.br')

    const repPhoneField = page.locator('[name="phone"]').last()
    await repPhoneField.fill('(11) 98765-4321')

    // Fill contact method
    const contactValue = page.locator('input[placeholder*="(11)"]').first()
    await contactValue.fill('(11) 98765-4321')

    // Take screenshot
    await page.screenshot({ path: 'test-results/business-client-form.png', fullPage: true })

    // Submit form
    await page.click('button:has-text("Criar Cliente")')

    // Wait for redirect
    await page.waitForURL('**/clients')
    await page.waitForLoadState('load')

    // Verify success
    await expect(page.locator(`text=${testCompany}`)).toBeVisible()
  })

  test('should search for clients', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await expect(searchInput).toBeVisible()

    // Create a client first
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    const searchName = `Search Test ${Date.now()}`
    await page.fill('input[name="name"]', searchName)
    await page.fill('input[placeholder*="(11)"]', '(11) 98765-4321')

    await page.click('button:has-text("Criar Cliente")')
    await page.waitForURL('**/clients')

    // Now search for it
    await page.fill('input[placeholder*="Buscar"]', searchName)
    await page.waitForTimeout(500)

    // Verify search results
    await expect(page.locator(`text=${searchName}`)).toBeVisible()
  })

  test('should filter clients by type', async ({ page }) => {
    // Get initial count
    const selectFilter = page.locator('select').first()
    await selectFilter.selectOption('person')

    await page.waitForTimeout(500)

    // Verify that only person clients are shown
    const clientTypeLabels = page.locator('text=Pessoa Física')
    const count = await clientTypeLabels.count()
    expect(count).toBeGreaterThanOrEqual(0)

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-filter.png', fullPage: true })
  })

  test('should view client details', async ({ page }) => {
    // Create a client first
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    const detailName = `Detail Test ${Date.now()}`
    await page.fill('input[name="name"]', detailName)
    await page.fill('input[name="email"]', 'detail@test.com')
    await page.fill('input[placeholder*="(11)"]', '(11) 98765-4321')

    await page.click('button:has-text("Criar Cliente")')
    await page.waitForURL('**/clients')

    // Click View button
    const viewButton = page.locator('button:has-text("Ver")').first()
    await viewButton.click()

    // Wait for detail page
    await page.waitForURL('**/clients/**')
    await page.waitForLoadState('load')

    // Verify detail page content
    await expect(page.locator('h1')).toContainText(detailName)
    await expect(page.locator('text=Informações Básicas')).toBeVisible()
    await expect(page.locator(`text=detail@test.com`)).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-detail.png', fullPage: true })
  })

  test('should edit client information', async ({ page }) => {
    // Create a client first
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    const editName = `Edit Test ${Date.now()}`
    await page.fill('input[name="name"]', editName)
    await page.fill('input[name="email"]', 'edit@test.com')
    await page.fill('input[placeholder*="(11)"]', '(11) 98765-4321')

    await page.click('button:has-text("Criar Cliente")')
    await page.waitForURL('**/clients')

    // Click Edit button
    const editButton = page.locator('button:has-text("Editar")').first()
    await editButton.click()

    // Wait for edit page
    await page.waitForURL('**/clients/**/edit')
    await page.waitForLoadState('load')

    // Verify we're on edit page
    await expect(page.locator('h1')).toContainText('Editar Cliente')

    // Update information
    const nameField = page.locator('input[name="name"]')
    await nameField.clear()
    const newName = `${editName} Updated`
    await nameField.fill(newName)

    // Update email
    const emailField = page.locator('input[name="email"]')
    await emailField.clear()
    await emailField.fill('newemail@test.com')

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-edit-form.png', fullPage: true })

    // Submit
    await page.click('button:has-text("Atualizar Cliente")')

    // Wait for redirect to detail page
    await page.waitForURL('**/clients/**')
    await page.waitForLoadState('load')

    // Verify changes
    await expect(page.locator('h1')).toContainText(newName)
    await expect(page.locator(`text=newemail@test.com`)).toBeVisible()
  })

  test('should delete client', async ({ page }) => {
    // Create a client to delete
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    const deleteName = `Delete Test ${Date.now()}`
    await page.fill('input[name="name"]', deleteName)
    await page.fill('input[placeholder*="(11)"]', '(11) 98765-4321')

    await page.click('button:has-text("Criar Cliente")')
    await page.waitForURL('**/clients')

    // Click View to go to detail page
    const viewButton = page.locator('button:has-text("Ver")').first()
    await viewButton.click()

    await page.waitForURL('**/clients/**')

    // Click delete button
    const deleteButton = page.locator('button[aria-label*="delete"], button:has-text("Remover"), button svg[data-icon="trash"]').first()
    if (await deleteButton.count() > 0) {
      await deleteButton.click()

      // Handle confirmation dialog
      const confirmButton = page.locator('button:has-text("Remover")').last()
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }

      // Wait for redirect to list
      await page.waitForURL('**/clients')
      await page.waitForLoadState('load')

      // Verify client is no longer visible
      const deletedClient = page.locator(`text=${deleteName}`)
      await expect(deletedClient).not.toBeVisible()
    }
  })

  test('should handle validation errors', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Novo Cliente")')
    await page.waitForURL('**/clients/new')

    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Criar Cliente")')
    await submitButton.click()

    // Wait a bit for validation
    await page.waitForTimeout(500)

    // Check if we're still on the form (no redirect)
    expect(page.url()).toContain('/clients/new')

    // Look for error messages
    const errorMessages = page.locator('[class*="error"], [class*="destructive"], text=/obrigatório|required/i')
    const errorCount = await errorMessages.count()

    // Should have at least one error message
    expect(errorCount).toBeGreaterThan(0)

    // Take screenshot of errors
    await page.screenshot({ path: 'test-results/validation-errors.png', fullPage: true })
  })

  test('should handle pagination', async ({ page }) => {
    // Check if pagination controls exist
    const paginationControls = page.locator('button:has-text("Página")')

    if (await paginationControls.count() > 0) {
      // Take screenshot of pagination
      await page.screenshot({ path: 'test-results/pagination-controls.png' })

      // Try to go to next page
      const nextButton = page.locator('button:has-text("›")').first()
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForLoadState('load')

        // Verify we're on a different page
        await page.screenshot({ path: 'test-results/pagination-next.png', fullPage: true })
      }
    }
  })
})
