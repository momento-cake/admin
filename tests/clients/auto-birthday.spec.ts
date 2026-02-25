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

async function addRelatedPerson(page: Page, name: string, birthDate?: string) {
  // Click "Adicionar Pessoa" button
  const addPersonButton = page.getByRole('button', { name: /Adicionar Pessoa/i })
  await addPersonButton.click()

  // Fill name
  await page.locator('input[placeholder="Nome completo"]').fill(name)

  // Fill birth date if provided
  if (birthDate) {
    await page.locator('input[type="date"]').first().fill(birthDate)
  }

  // Submit
  const submitButton = page.getByRole('button', { name: /Adicionar Pessoa/i }).last()
  await submitButton.click()
}

test.describe('Auto-Create Birthday Special Dates', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(`${BASE_URL}/clients/new`)
    await page.waitForLoadState('load')
  })

  test('adding related person with birthdate creates birthday special date', async ({ page }) => {
    // Add a related person with a birth date
    await addRelatedPerson(page, 'Maria Silva', '1990-05-15')

    // Verify the person appears in the related persons list
    await expect(page.getByText('Maria Silva')).toBeVisible()

    // Scroll down to the special dates section
    const specialDatesSection = page.getByText('Datas Especiais')
    await specialDatesSection.scrollIntoViewIfNeeded()

    // Verify a birthday special date was auto-created
    await expect(page.getByText(/Aniversário de Maria Silva/i)).toBeVisible()
  })

  test('removing related person removes associated birthday', async ({ page }) => {
    // Add a related person with a birth date
    await addRelatedPerson(page, 'Pedro Santos', '1985-12-25')

    // Verify the person and birthday exist
    await expect(page.getByText('Pedro Santos')).toBeVisible()
    await expect(page.getByText(/Aniversário de Pedro Santos/i)).toBeVisible()

    // Remove the related person - find the trash button in the related persons section
    const relatedSection = page.locator('div:has(> h3:text("Pessoas Relacionadas"))')
    const deleteButton = relatedSection.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first()
    await deleteButton.click()

    // Verify the person is removed
    await expect(page.getByText('Pedro Santos')).not.toBeVisible()

    // Verify the birthday special date is also removed
    await expect(page.getByText(/Aniversário de Pedro Santos/i)).not.toBeVisible()
  })

  test('editing related person birthdate updates the special date', async ({ page }) => {
    // Add a related person with a birth date
    await addRelatedPerson(page, 'Ana Oliveira', '1995-03-10')

    // Verify auto-birthday was created
    await expect(page.getByText(/Aniversário de Ana Oliveira/i)).toBeVisible()

    // Edit the related person - click edit button
    const relatedSection = page.locator('div:has(> h3:text("Pessoas Relacionadas"))')
    const editButton = relatedSection.locator('button').filter({ has: page.locator('svg.lucide-edit-2') }).first()
    await editButton.click()

    // Change birth date
    const dateInput = page.locator('input[type="date"]').first()
    await dateInput.clear()
    await dateInput.fill('1995-08-20')

    // Submit update
    const updateButton = page.getByRole('button', { name: /Atualizar Pessoa/i })
    await updateButton.click()

    // The birthday special date should still exist (now with the updated date)
    await expect(page.getByText(/Aniversário de Ana Oliveira/i)).toBeVisible()
  })

  test('adding related person without birthdate does not create special date', async ({ page }) => {
    // Add a related person WITHOUT birth date
    await addRelatedPerson(page, 'Carlos Souza')

    // Verify the person appears
    await expect(page.getByText('Carlos Souza')).toBeVisible()

    // No birthday should be auto-created for this person
    await expect(page.getByText(/Aniversário de Carlos Souza/i)).not.toBeVisible()
  })
})
