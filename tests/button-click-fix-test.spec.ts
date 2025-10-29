import { test, expect } from '@playwright/test'

test.describe('Novo Cliente Modal - Button Click Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3002/dashboard')

    // Wait for page to load
    await page.waitForLoadState('load')

    // Find and click the "Novo Cliente" button
    // This should open the ClientFormModal
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")')
    await novoClienteButton.click()

    // Wait for modal to appear
    await page.waitForSelector('text="Novo Cliente"')
  })

  test('should open RelatedPersonsSection form when clicking "Adicionar Pessoa" button', async ({ page }) => {
    // Scroll to RelatedPersonsSection
    const relatedPersonsSection = page.locator('text="Pessoas Relacionadas"')
    await relatedPersonsSection.scrollIntoViewIfNeeded()

    // Click the "Adicionar Pessoa" button
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")')

    // Log to verify button is clickable
    console.log('Clicking Adicionar Pessoa button')
    await adicionarPessoaButton.click()

    // Verify form appears
    await page.waitForSelector('input[placeholder="Nome completo"]')

    // Verify the form is visible
    const nameInput = page.locator('input[placeholder="Nome completo"]')
    await expect(nameInput).toBeVisible()

    console.log('✓ RelatedPersonsSection form opened successfully')
  })

  test('should open SpecialDatesSection form when clicking "Adicionar Data" button', async ({ page }) => {
    // Scroll to SpecialDatesSection
    const specialDatesSection = page.locator('text="Datas Especiais"')
    await specialDatesSection.scrollIntoViewIfNeeded()

    // Click the "Adicionar Data" button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")')

    // Log to verify button is clickable
    console.log('Clicking Adicionar Data button')
    await adicionarDataButton.click()

    // Verify form appears
    await page.waitForSelector('input[placeholder="Ex: Aniversário do João, Aniversário de Casamento"]')

    // Verify the form is visible
    const descriptionInput = page.locator('input[placeholder="Ex: Aniversário do João, Aniversário de Casamento"]')
    await expect(descriptionInput).toBeVisible()

    console.log('✓ SpecialDatesSection form opened successfully')
  })

  test('should add a related person and submit form', async ({ page }) => {
    // Click "Adicionar Pessoa" button
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")')
    await adicionarPessoaButton.click()

    // Wait for form
    await page.waitForSelector('input[placeholder="Nome completo"]')

    // Fill in the form
    const nameInput = page.locator('input[placeholder="Nome completo"]')
    await nameInput.fill('João Silva')

    // Select relationship type
    const relationshipSelect = page.locator('select').first()
    await relationshipSelect.selectOption('child')

    // Submit the form
    const submitButton = page.locator('button:has-text("Adicionar Pessoa")').last()
    console.log('Submitting RelatedPerson form')
    await submitButton.click()

    // Verify person was added (should see the person card)
    await page.waitForSelector('text="João Silva"')
    const personCard = page.locator('text="João Silva"')
    await expect(personCard).toBeVisible()

    console.log('✓ Related person added successfully')
  })

  test('should add a special date and submit form', async ({ page }) => {
    // Click "Adicionar Data" button
    const adicionarDataButton = page.locator('button:has-text("Adicionar Data")')
    await adicionarDataButton.click()

    // Wait for form
    await page.waitForSelector('input[placeholder="Ex: Aniversário do João, Aniversário de Casamento"]')

    // Fill in the date
    const dateInput = page.locator('input[type="date"]').first()
    await dateInput.fill('2025-12-25')

    // Fill in description
    const descriptionInput = page.locator('input[placeholder="Ex: Aniversário do João, Aniversário de Casamento"]')
    await descriptionInput.fill('Natal 2025')

    // Submit the form
    const submitButton = page.locator('button:has-text("Adicionar Data")').last()
    console.log('Submitting SpecialDate form')
    await submitButton.click()

    // Verify date was added
    await page.waitForSelector('text="Natal 2025"')
    const dateCard = page.locator('text="Natal 2025"')
    await expect(dateCard).toBeVisible()

    console.log('✓ Special date added successfully')
  })
})
