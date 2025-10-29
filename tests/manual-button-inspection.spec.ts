import { test, expect } from '@playwright/test'

test('Manual inspection - scroll to Adicionar Pessoa section', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')
  await page.click('button[type="submit"]')
  await page.waitForSelector('text=Dashboard', { timeout: 15000 })

  // Navigate to clients
  const clientsLink = page.locator('a:has-text("Clientes")')
  await clientsLink.first().click()
  await page.waitForLoadState('load')

  // Open modal
  const novoClienteButton = page.locator('button:has-text("Novo Cliente")')
  await novoClienteButton.first().click()
  await expect(page.locator('h2:has-text("Novo Cliente")')).toBeVisible({ timeout: 5000 })

  //  Screenshot of initial modal view
  await page.screenshot({
    path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/modal-initial.png',
    fullPage: true
  })

  // Scroll down in the modal to see "Pessoas Relacionadas" section
  const modalContent = page.locator('.max-h-\\[90vh\\]').first()
  await modalContent.evaluate(el => el.scrollTop = el.scrollHeight)
  await page.waitForTimeout(1000)

  // Screenshot after scrolling
  await page.screenshot({
    path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/modal-scrolled.png',
    fullPage: true
  })

  // Check if "Adicionar Pessoa" button is visible
  const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")')
  console.log('Adicionar Pessoa button count:', await adicionarPessoaButton.count())

  if (await adicionarPessoaButton.count() > 0) {
    await adicionarPessoaButton.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/adicionar-pessoa-button-visible.png',
      fullPage: true
    })

    // Click the button
    await adicionarPessoaButton.click({ force: true })
    console.log('Clicked Adicionar Pessoa button')
    await page.waitForTimeout(2000)

    // Screenshot after clicking
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-clicking-adicionar-pessoa.png',
      fullPage: true
    })

    // Check if form appeared
    const formVisible = await page.locator('.bg-gray-50').count()
    console.log('Gray background forms found:', formVisible)
  }

  // Pause for manual inspection
  await page.pause()
})
