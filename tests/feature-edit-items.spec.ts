import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin } from './helpers/loginAsAdmin'

/**
 * Requirement 1: An order's items can be edited even after payments, creating a
 * new active quote version. Raising the total reopens the balance so additional
 * (incremental) payments can be registered.
 *
 * This is an end-to-end check against the live app. Editing only ADDS a new
 * quote version (history-preserving), so it is safe to run against seeded data.
 */

const TARGET = 'PED-0068'
const SCREENSHOT_DIR = 'test-results'

// "R$ 1.234,56" -> 1234.56
function parseBRL(text: string): number {
  const m = text.match(/R\$\s*([\d.]+,\d{2})/)
  const raw = m ? m[1] : text
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

// Read the big active-total figure shown in the detail header.
async function readHeaderTotal(page: Page): Promise<number> {
  const totalEl = page.locator('p.text-2xl.font-bold.tabular-nums').first()
  await expect(totalEl).toBeVisible({ timeout: 15000 })
  const text = (await totalEl.textContent()) ?? ''
  return parseBRL(text)
}

test('atendente can edit items after payment, reopening balance for more payments', async ({
  page,
}) => {
  test.setTimeout(120000)

  // 1. Login and open the orders list.
  await loginAsAdmin(page)
  await page.goto('/orders')
  await page.waitForLoadState('load')

  // Filter to the target order, then open it.
  const search = page.getByPlaceholder(
    'Buscar por número do pedido ou nome do cliente...'
  )
  await expect(search).toBeVisible({ timeout: 15000 })
  await search.fill(TARGET)

  // The number renders in both mobile + desktop layouts; only one set is visible
  // at the current viewport. Pick the visible occurrence and click it.
  const orderCell = page
    .getByText(TARGET, { exact: true })
    .locator('visible=true')
    .first()
  await expect(orderCell).toBeVisible({ timeout: 15000 })
  await orderCell.click()

  // We should land on the detail page.
  await page.waitForURL('**/orders/**', { timeout: 20000 })
  // Detail header shows the order number in a large mono code element.
  await expect(
    page.locator('code.text-lg', { hasText: TARGET })
  ).toBeVisible({ timeout: 15000 })

  // 2. Capture the current active total from the detail header.
  const totalBefore = await readHeaderTotal(page)
  expect(totalBefore).toBeGreaterThan(0)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/edit-items-01-before.png`,
    fullPage: true,
  })

  // 3. Open "Editar Itens" (Orçamento tab is the default tab).
  await page.getByRole('button', { name: 'Editar Itens' }).click()

  const dialog = page.getByRole('dialog', { name: 'Editar Itens do Pedido' })
  await expect(dialog).toBeVisible({ timeout: 10000 })

  // Read the dialog's live Total preview (the bold "Total" row inside the dialog).
  const dialogTotalRow = dialog.locator('div.font-bold', { hasText: 'Total' })
  await expect(dialogTotalRow).toBeVisible()
  const readDialogTotal = async () => parseBRL((await dialogTotalRow.textContent()) ?? '')
  const dialogTotalBefore = await readDialogTotal()

  // Increase the first item's quantity (first spinbutton in the dialog == first
  // item quantity). Multiply by 3 to guarantee a meaningful increase.
  const firstQty = dialog.getByRole('spinbutton').first()
  await expect(firstQty).toBeVisible()
  const currentQtyStr = await firstQty.inputValue()
  const currentQty = parseFloat(currentQtyStr.replace(',', '.')) || 1
  const newQty = Math.max(2, Math.round(currentQty * 3))
  await firstQty.fill('')
  await firstQty.fill(String(newQty))
  await firstQty.blur()

  // The dialog Total preview must increase after raising the quantity.
  await expect
    .poll(readDialogTotal, { timeout: 8000 })
    .toBeGreaterThan(dialogTotalBefore)
  const dialogTotalAfter = await readDialogTotal()
  expect(dialogTotalAfter).toBeGreaterThan(dialogTotalBefore)

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/edit-items-02-dialog-increased.png`,
    fullPage: true,
  })

  // Save -> POST orcamento + PUT ativar.
  await dialog.getByRole('button', { name: 'Salvar Alterações' }).click()

  // 4. Dialog closes and the header active total INCREASED vs step 2.
  await expect(dialog).toBeHidden({ timeout: 20000 })

  await expect
    .poll(async () => readHeaderTotal(page), { timeout: 25000 })
    .toBeGreaterThan(totalBefore)
  const totalAfter = await readHeaderTotal(page)
  expect(totalAfter).toBeGreaterThan(totalBefore)

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/edit-items-03-after-save.png`,
    fullPage: true,
  })

  // 5. Pagamento tab: positive Saldo + "Registrar pagamento" available.
  await page.getByRole('tab', { name: 'Pagamento' }).click()

  const paymentCard = page
    .locator('div', { has: page.getByText('Pagamentos', { exact: true }) })
    .first()
  await expect(page.getByText('Pagamentos', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  })

  // The Saldo figure is the value under the "Saldo" label in the summary grid.
  const saldoBlock = page
    .locator('div', { has: page.getByText('Saldo', { exact: true }) })
    .last()
  const saldoText = (await saldoBlock.textContent()) ?? ''
  const saldo = parseBRL(saldoText)
  expect(saldo).toBeGreaterThan(0)

  // Incremental payment must be possible: the register button is present only
  // when saldo (Total - Pago) > 0.
  await expect(
    page.getByRole('button', { name: 'Registrar pagamento' })
  ).toBeVisible({ timeout: 10000 })

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/edit-items-04-payment-reopened.png`,
    fullPage: true,
  })

  // eslint-disable-next-line no-console
  console.log(
    `[feature-edit-items] header total before=${totalBefore} after=${totalAfter}; dialog preview before=${dialogTotalBefore} after=${dialogTotalAfter}; saldo=${saldo}`
  )
})
