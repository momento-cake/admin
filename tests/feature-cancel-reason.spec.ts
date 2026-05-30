import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin } from './helpers/loginAsAdmin'

/**
 * Requirement 3 — Cancellation reason gating.
 *
 * Validates:
 *  - UI: "Confirmar Cancelamento" disabled until a reason is picked.
 *  - UI: all 5 preset reasons visible; "Outro" reveals a required textarea.
 *  - Real cancel with "Outro" persists & displays the reason on the detail page.
 *  - Server gate: PUT /api/pedidos/{id} {status:CANCELADO} with no reason -> 400.
 *  - Cleanup: revert the order back to RASCUNHO.
 */

const REASON_TEXTS = [
  'Cliente desistiu / solicitou cancelamento',
  'Pedido duplicado / erro no cadastro',
  'Pagamento não realizado',
  'Indisponibilidade de produção',
  'Outro',
]

const PRIMARY_ORDER = 'PED-0071'
const FALLBACK_ORDER = 'PED-0072'

const confirmBtn = (page: Page) =>
  page.getByRole('button', { name: 'Confirmar Cancelamento' })

/**
 * Server-side search (300ms debounce) for an exact order number, then waits
 * for the list to settle to the filtered result. Returns the desktop table
 * row (scoped) for that order, or null if missing.
 */
async function filterToOrder(page: Page, numero: string) {
  const search = page.getByPlaceholder(
    'Buscar por número do pedido ou nome do cliente...',
  )
  await search.fill('')
  await page.waitForTimeout(400)
  await search.fill(numero)

  // Wait until the debounced server search has narrowed the list so the
  // target is the ONLY order code rendered in the desktop table.
  const desktopTable = page.locator('table')
  // Scope to the table row whose code cell equals the order number.
  const row = desktopTable
    .getByRole('row')
    .filter({ has: page.getByText(numero, { exact: true }) })
  try {
    await expect(row).toHaveCount(1, { timeout: 10_000 })
    await expect(row).toBeVisible({ timeout: 5_000 })
  } catch {
    return null
  }
  return row
}

/**
 * Returns the row's "Cancelar pedido" trigger, scoped to that row, or null
 * if the order is missing or already cancelled (no cancel action rendered).
 */
async function findCancellableRow(page: Page, numero: string) {
  const row = await filterToOrder(page, numero)
  if (!row) return null
  const cancelBtn = row.getByRole('button', { name: 'Cancelar pedido' })
  if ((await cancelBtn.count()) === 0) return null
  return cancelBtn
}

test('Requirement 3: cancellation reason gating, persistence, and 400 gate', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // --- 1. Login ---
  await loginAsAdmin(page)
  await page.goto('/orders')
  await page.waitForLoadState('load')

  // Resolve which seeded order to use.
  let orderNumber = PRIMARY_ORDER
  let cancelBtn = await findCancellableRow(page, PRIMARY_ORDER)
  if (!cancelBtn) {
    console.log(
      `[info] ${PRIMARY_ORDER} not available/cancellable, falling back to ${FALLBACK_ORDER}`,
    )
    orderNumber = FALLBACK_ORDER
    cancelBtn = await findCancellableRow(page, FALLBACK_ORDER)
  }
  expect(
    cancelBtn,
    `No cancellable test order found (${PRIMARY_ORDER}/${FALLBACK_ORDER})`,
  ).not.toBeNull()
  console.log(`[info] Using order ${orderNumber}`)

  // --- 2. UI gating ---
  await cancelBtn!.click()

  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText(`Cancelar pedido ${orderNumber}`),
  ).toBeVisible()
  await expect(
    dialog.getByText('Motivo do cancelamento', { exact: true }),
  ).toBeVisible()

  // Confirm disabled before any reason is selected.
  await expect(confirmBtn(page)).toBeDisabled()

  // All 5 reason options visible.
  for (const text of REASON_TEXTS) {
    await expect(
      dialog.getByRole('button', { name: text, exact: true }),
    ).toBeVisible()
  }

  await page.screenshot({
    path: 'test-results/cancel-reason-01-dialog-initial.png',
    fullPage: true,
  })

  // Pick "Outro" -> textarea appears, confirm still disabled.
  await dialog.getByRole('button', { name: 'Outro', exact: true }).click()
  const outroTextarea = page.locator('#cancel-motivo-outro')
  await expect(outroTextarea).toBeVisible()
  await expect(confirmBtn(page)).toBeDisabled()

  await page.screenshot({
    path: 'test-results/cancel-reason-02-outro-empty.png',
    fullPage: true,
  })

  // --- 3. Real cancel with Outro ---
  const uniqueReason = `E2E motivo livre ${Date.now()}`
  await outroTextarea.fill(uniqueReason)
  await expect(confirmBtn(page)).toBeEnabled()

  await page.screenshot({
    path: 'test-results/cancel-reason-03-outro-filled-enabled.png',
    fullPage: true,
  })

  await confirmBtn(page).click()

  // Dialog closes after success.
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })

  // Open the order detail. Re-filter then click the scoped row.
  const detailRow = await filterToOrder(page, orderNumber)
  expect(detailRow, 'Order row not found after cancel').not.toBeNull()
  await detailRow!.getByText(orderNumber, { exact: true }).click()

  await page.waitForURL(/\/orders\/[^/]+\/?$/, { timeout: 15_000 })
  const orderUrl = page.url()
  const idMatch = orderUrl.match(/\/orders\/([^/?#]+)/)
  expect(idMatch, `Could not parse order id from URL: ${orderUrl}`).not.toBeNull()
  const orderId = idMatch![1]
  console.log(`[info] Order id = ${orderId}`)

  // "Pedido Cancelado" card with reason + typed text + timestamp.
  const cancelCard = page
    .locator('div')
    .filter({ hasText: 'Pedido Cancelado' })
    .last()
  await expect(page.getByText('Pedido Cancelado')).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Motivo:')).toBeVisible()
  // OUTRO -> the category label "Outro" is shown next to Motivo.
  await expect(page.getByText(/Motivo:\s*Outro/i)).toBeVisible()
  // The free-text typed reason is rendered on its own line.
  await expect(page.getByText(uniqueReason)).toBeVisible()
  // Timestamp line.
  await expect(page.getByText(/Cancelado em/i)).toBeVisible()

  // Status badge shows "Cancelado".
  await expect(page.getByText('Cancelado', { exact: true }).first()).toBeVisible()

  await page.screenshot({
    path: 'test-results/cancel-reason-04-detail-cancelled.png',
    fullPage: true,
  })

  // --- 4. Server gate: re-cancel with NO reason must be rejected (400) ---
  const res = await page.request.put(
    `http://localhost:4000/api/pedidos/${orderId}`,
    { data: { status: 'CANCELADO' } },
  )
  expect(
    res.status(),
    `Expected 400 from cancel-without-reason gate, got ${res.status()}`,
  ).toBe(400)
  const body = await res.json()
  const errText = JSON.stringify(body).toLowerCase()
  expect(errText).toContain('motivo do cancelamento')
  console.log(`[info] 400 gate body: ${JSON.stringify(body)}`)

  // --- 5. Cleanup: revert CANCELADO -> RASCUNHO ---
  let cleanupOk = false
  try {
    await page.goto(`/orders/${orderId}`)
    await page.waitForLoadState('load')
    const revertBtn = page.getByRole('button', {
      name: /Voltar para Rascunho/i,
    })
    await expect(revertBtn).toBeVisible({ timeout: 15_000 })
    await revertBtn.click()
    // Status should leave Cancelado.
    await expect(
      page.getByText('Pedido Cancelado'),
    ).toBeHidden({ timeout: 15_000 })
    cleanupOk = true
    await page.screenshot({
      path: 'test-results/cancel-reason-05-reverted.png',
      fullPage: true,
    })
  } catch (e) {
    console.log(`[warn] Cleanup (revert to RASCUNHO) failed: ${String(e)}`)
  }
  console.log(`[info] Cleanup succeeded: ${cleanupOk}`)
})
