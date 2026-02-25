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

test.describe('Addresses Section - Full Page Form', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/clients/new`)
    await page.waitForLoadState('load')
  })

  test('can add an address with label', async ({ page }) => {
    // Click "Adicionar Endereco" button
    const addButton = page.getByRole('button', { name: /Adicionar Endereço/i })
    await addButton.click()

    // Select label preset "Casa"
    const casaButton = page.getByRole('button', { name: 'Casa' })
    await casaButton.click()

    // Fill address fields
    await page.locator('input[placeholder="Rua, Avenida, etc"]').fill('Rua das Flores')
    // Fill numero
    const numeroInputs = page.locator('label:has-text("Numero") + input, label:has-text("Número") + input')
    if (await numeroInputs.count() > 0) {
      await numeroInputs.first().fill('123')
    }

    // Click "Adicionar Endereco" submit button in the form
    const submitButton = page.getByRole('button', { name: /Adicionar Endereço/i }).last()
    await submitButton.click()

    // Verify address appears in the list
    await expect(page.getByText('Rua das Flores')).toBeVisible()
    await expect(page.getByText('Casa')).toBeVisible()
  })

  test('CEP field accepts and formats input', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Adicionar Endereço/i })
    await addButton.click()

    const cepInput = page.locator('input[placeholder="00000-000"]')
    await cepInput.type('01001000', { delay: 50 })

    const value = await cepInput.inputValue()
    // Should be formatted as 01001-000
    expect(value).toMatch(/^\d{5}-\d{3}$/)
  })

  test('can edit and delete addresses', async ({ page }) => {
    // First add an address
    const addButton = page.getByRole('button', { name: /Adicionar Endereço/i })
    await addButton.click()

    await page.locator('input[placeholder="Rua, Avenida, etc"]').fill('Rua Original')

    const submitButton = page.getByRole('button', { name: /Adicionar Endereço/i }).last()
    await submitButton.click()

    // Wait for the address to appear
    await expect(page.getByText('Rua Original')).toBeVisible()

    // Click edit button on the address card
    const editButton = page.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first()
    await editButton.click()

    // Change the address
    const enderecoInput = page.locator('input[placeholder="Rua, Avenida, etc"]')
    await enderecoInput.clear()
    await enderecoInput.fill('Rua Editada')

    const updateButton = page.getByRole('button', { name: /Atualizar Endereço/i })
    await updateButton.click()

    // Verify updated address
    await expect(page.getByText('Rua Editada')).toBeVisible()
    await expect(page.getByText('Rua Original')).not.toBeVisible()

    // Delete the address
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first()
    await deleteButton.click()

    // Address should be gone
    await expect(page.getByText('Rua Editada')).not.toBeVisible()
  })

  test('multiple addresses can be added', async ({ page }) => {
    // Add first address
    let addButton = page.getByRole('button', { name: /Adicionar Endereço/i })
    await addButton.click()

    await page.getByRole('button', { name: 'Casa' }).click()
    await page.locator('input[placeholder="Rua, Avenida, etc"]').fill('Rua Casa')

    let submitButton = page.getByRole('button', { name: /Adicionar Endereço/i }).last()
    await submitButton.click()

    await expect(page.getByText('Rua Casa')).toBeVisible()

    // Add second address
    addButton = page.getByRole('button', { name: /Adicionar Endereço/i })
    await addButton.click()

    await page.getByRole('button', { name: 'Trabalho' }).click()
    await page.locator('input[placeholder="Rua, Avenida, etc"]').fill('Av Trabalho')

    submitButton = page.getByRole('button', { name: /Adicionar Endereço/i }).last()
    await submitButton.click()

    // Both addresses should be visible
    await expect(page.getByText('Rua Casa')).toBeVisible()
    await expect(page.getByText('Av Trabalho')).toBeVisible()
    await expect(page.getByText('Casa')).toBeVisible()
    await expect(page.getByText('Trabalho')).toBeVisible()
  })
})
