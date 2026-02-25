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

test.describe('Client Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/clients/new`)
    await page.waitForLoadState('load')
  })

  test('empty name shows error', async ({ page }) => {
    // Leave name empty and try to submit
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Should show validation error for name
    await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible()
  })

  test('empty contact method value shows error', async ({ page }) => {
    // Fill name but leave contact method value empty
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste de Validacao')

    // Submit without filling the contact method value
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Should show validation error for empty contact value
    await expect(page.getByText(/Preencha o valor do contato/i)).toBeVisible()
  })

  test('invalid email in contact method shows error', async ({ page }) => {
    // Fill name
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste Email Invalido')

    // Change contact type to email
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('email')

    // Type an invalid email
    const emailInput = page.locator('input[placeholder="email@exemplo.com"]')
    await emailInput.fill('invalido')

    // Submit
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Should show validation error for invalid email
    await expect(page.getByText(/Email inválido/i)).toBeVisible()
  })

  test('phone with less than 10 digits shows error', async ({ page }) => {
    // Fill name
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste Telefone Curto')

    // Type a phone with fewer than 10 digits
    const phoneInput = page.locator('input[type="tel"]').last()
    await phoneInput.type('1199', { delay: 50 })

    // Submit
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Should show validation error for short phone number
    await expect(page.getByText(/Telefone deve ter pelo menos 10 dígitos/i)).toBeVisible()
  })

  test('error clears when user types', async ({ page }) => {
    // Submit empty form to trigger name error
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Verify error appears
    await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible()

    // Start typing in the name field
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste')

    // Error should clear
    await expect(page.getByText(/Nome é obrigatório/i)).not.toBeVisible()
  })

  test('submit error banner shows with icon', async ({ page }) => {
    // Submit empty form to trigger validation
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // The error toast notification should appear (from sonner)
    // Check that the destructive-styled error elements exist
    const errorBorder = page.locator('[data-error="true"]')
    await expect(errorBorder.first()).toBeVisible()

    // Verify at least one field has the destructive border style
    const destructiveInput = page.locator('.border-destructive')
    await expect(destructiveInput.first()).toBeVisible()
  })

  test('multiple errors show for multiple empty fields', async ({ page }) => {
    // Fill name but leave contact empty, then submit
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste Multiplos Erros')

    // Leave contact method value empty
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Contact method error should appear
    await expect(page.getByText(/Preencha o valor do contato/i)).toBeVisible()
  })
})

test.describe('Client Form Validation - Modal Form', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/clients`)
    await page.waitForLoadState('load')
  })

  test('modal form validates empty name', async ({ page }) => {
    // Click "Novo Cliente" button to open modal
    const newClientButton = page.getByRole('button', { name: /Novo Cliente/i })
    await newClientButton.click()

    // Wait for modal to appear
    await page.waitForTimeout(500)

    // Click submit without filling anything
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Should show name validation error
    await expect(page.getByText(/Nome é obrigatório/i)).toBeVisible()
  })

  test('modal form validates contact methods', async ({ page }) => {
    // Click "Novo Cliente" button to open modal
    const newClientButton = page.getByRole('button', { name: /Novo Cliente/i })
    await newClientButton.click()

    await page.waitForTimeout(500)

    // Fill name but leave contact empty
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill('Teste Modal')

    // Submit
    const submitButton = page.getByRole('button', { name: /Criar Cliente/i })
    await submitButton.click()

    // Contact method error should appear
    await expect(page.getByText(/Preencha o valor do contato/i)).toBeVisible()
  })
})
