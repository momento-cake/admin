import { test, expect, Page } from '@playwright/test'
import { loginAsAdmin } from './helpers/loginAsAdmin'

/**
 * Feature (Requirement 2): "Delete as Cancel"
 *
 * Removing an unneeded order is done by CANCELLING it through a confirmation
 * modal, not a silent hard-delete. In the orders list a "Cancelar pedido"
 * action opens a confirmation dialog; confirming sets the order status to
 * CANCELADO. Already-cancelled orders no longer offer the cancel action.
 *
 * Verified UI facts (from src/components/pedidos/PedidoList.tsx +
 * CancelPedidoDialog.tsx + PedidoStatusFlow.tsx):
 *  - Cancel button aria-label: "Cancelar pedido" (rendered only when status !== CANCELADO)
 *  - Delete button aria-label: "Excluir pedido"
 *  - Dialog title: "Cancelar pedido {numeroPedido}", confirm btn "Confirmar Cancelamento"
 *  - First preset reason: "Cliente desistiu / solicitou cancelamento"
 *  - Success toast: "Pedido cancelado"
 *  - Both mobile + desktop layouts render -> aria-labels can appear twice.
 *  - Detail page (/orders/{id}) shows status badge + "Voltar para Rascunho" button
 *    for a CANCELADO order (CANCELADO -> RASCUNHO transition).
 */

const TARGET = 'PED-0076'
const CANCEL_REASON = 'Cliente desistiu / solicitou cancelamento'
const ALREADY_CANCELLED = 'PED-0081'

const SHOTS = 'test-results'

// Filter the list to a single order via the search box and wait for the
// filtered row to be the ONLY order shown.
//
// CRITICAL: the search is debounced (300ms) and triggers a network refetch.
// Until that settles the OLD (unfiltered) rows are still in the DOM. If we
// interact too early we hit the wrong row. So we wait until the desktop table
// contains exactly one order row whose code is `numero`.
async function filterTo(page: Page, numero: string) {
  const search = page.getByPlaceholder(
    'Buscar por número do pedido ou nome do cliente...',
  )
  await search.click()
  await search.fill('')
  await search.fill(numero)

  // Wait until the desktop table holds exactly one order row, and it is ours.
  await expect
    .poll(
      async () =>
        page.evaluate((num) => {
          const codes = Array.from(
            document.querySelectorAll('table tbody code'),
          ).map((c) => (c.textContent || '').trim())
          // settled state: exactly one row, and it matches the target
          return codes.length === 1 && codes[0] === num ? 'ok' : codes.join(',')
        }, numero),
      { timeout: 15000, message: `list should filter to a single row: ${numero}` },
    )
    .toBe('ok')

  // Small settle so React commits the row's action buttons.
  await page.waitForTimeout(400)
}

// The single visible "Cancelar pedido" button (desktop layout) after filtering.
function visibleCancelButton(page: Page) {
  return page
    .getByRole('button', { name: 'Cancelar pedido' })
    .locator('visible=true')
}

// Click a status filter chip (e.g. "Cancelado", "Todos").
// Each chip is a <button> whose accessible name is "<label> <count>" (the count
// span is part of the name), so we match by prefix (non-exact), not exact.
async function clickStatusTab(page: Page, label: string) {
  await page
    .getByRole('button', { name: new RegExp(`^${label}\\b`) })
    .first()
    .click()
  await page.waitForTimeout(900)
}

test.describe('Order removal is cancellation, not hard-delete', () => {
  test.setTimeout(120000)

  test('cancel via modal sets CANCELADO and hides cancel action', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    // Desktop viewport so the desktop table (hidden md:block) is the visible
    // layout; the mobile card layout (block md:hidden) stays CSS-hidden.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/orders')
    await page.waitForLoadState('load')
    // Wait for the list to render at least one order row.
    await expect(
      page.getByPlaceholder(
        'Buscar por número do pedido ou nome do cliente...',
      ),
    ).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}/cancel-01-orders-list.png`, fullPage: true })

    // --- Assertion 1: a normal (non-cancelled) order exposes "Cancelar pedido" ---
    // Default tab is "Todos" which includes non-cancelled orders, so the cancel
    // action must be present somewhere in the list.
    const cancelButtons = page.getByRole('button', { name: 'Cancelar pedido' })
    const cancelCount = await cancelButtons.count()
    expect(cancelCount, 'at least one row should offer "Cancelar pedido"').toBeGreaterThan(0)

    // --- Assertion 3: cancel TARGET via the confirmation modal ---
    // Decide whether the target is cancellable; if not, pick a fallback.
    let target = TARGET
    await filterTo(page, target)

    // The list is now filtered to exactly one row (filterTo guarantees this).
    // If that row has no visible cancel action (already cancelled / missing),
    // fall back to another non-cancelled test order.
    if ((await visibleCancelButton(page).count()) === 0) {
      const fallbacks = ['PED-0071', 'PED-0072', 'PED-0073', 'PED-0074']
      let picked: string | null = null
      for (const fb of fallbacks) {
        await filterTo(page, fb)
        if ((await visibleCancelButton(page).count()) > 0) {
          picked = fb
          break
        }
      }
      if (!picked) {
        throw new Error(
          `Could not find a cancellable target order (tried ${TARGET} and ${fallbacks.join(', ')})`,
        )
      }
      console.log(`[info] ${TARGET} not cancellable; using fallback ${picked}`)
      target = picked
    }

    await page.screenshot({ path: `${SHOTS}/cancel-02-target-filtered.png`, fullPage: true })

    // Open the cancel dialog. Both layouts render the button (one CSS-hidden);
    // the list is filtered to a single row so the visible button is the target's.
    await visibleCancelButton(page).first().click()

    // --- Assertion: dialog appears with the expected title + confirm button ---
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(
      dialog.getByText(`Cancelar pedido ${target}`, { exact: true }),
    ).toBeVisible()
    const confirmBtn = dialog.getByRole('button', { name: 'Confirmar Cancelamento' })
    await expect(confirmBtn).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/cancel-03-dialog-open.png`, fullPage: true })

    // Pick the first preset reason.
    await dialog.getByRole('button', { name: CANCEL_REASON, exact: true }).click()

    // Confirm.
    await confirmBtn.click()

    // --- Assertion: success toast "Pedido cancelado" ---
    await expect(page.getByText('Pedido cancelado', { exact: true })).toBeVisible({
      timeout: 15000,
    })
    // Dialog should close.
    await expect(dialog).toBeHidden({ timeout: 10000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SHOTS}/cancel-04-after-confirm.png`, fullPage: true })

    // --- Assertion 4: order now appears under "Cancelado" tab with status "Cancelado" ---
    await clickStatusTab(page, 'Cancelado')
    await filterTo(page, target)
    await expect(
      page.getByText(target, { exact: true }).locator('visible=true').first(),
    ).toBeVisible({ timeout: 15000 })
    // Status badge text "Cancelado" must be present in the filtered list.
    await expect(
      page.getByText('Cancelado', { exact: true }).locator('visible=true').first(),
    ).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/cancel-05-cancelado-tab.png`, fullPage: true })

    // --- Assertion 5: cancelled target row shows "Excluir pedido" but NOT "Cancelar pedido" ---
    await expect(
      page.getByRole('button', { name: 'Cancelar pedido' }),
      `${target} (now cancelled) must NOT offer "Cancelar pedido"`,
    ).toHaveCount(0)
    await expect(
      page
        .getByRole('button', { name: 'Excluir pedido' })
        .locator('visible=true')
        .first(),
      `${target} (now cancelled) should still offer "Excluir pedido"`,
    ).toBeVisible()

    // --- Assertion 6: independent already-cancelled reference order PED-0081 ---
    await filterTo(page, ALREADY_CANCELLED)
    await expect(
      page.getByText(ALREADY_CANCELLED, { exact: true }).locator('visible=true').first(),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByRole('button', { name: 'Cancelar pedido' }),
      `${ALREADY_CANCELLED} (already cancelled) must NOT offer "Cancelar pedido"`,
    ).toHaveCount(0)
    await expect(
      page
        .getByRole('button', { name: 'Excluir pedido' })
        .locator('visible=true')
        .first(),
      `${ALREADY_CANCELLED} should still offer "Excluir pedido"`,
    ).toBeVisible()
    await page.screenshot({
      path: `${SHOTS}/cancel-06-already-cancelled.png`,
      fullPage: true,
    })

    // --- CLEANUP: revert target back to RASCUNHO so seed data is restored ---
    try {
      // Open the target detail page. Re-filter then click its row.
      await clickStatusTab(page, 'Cancelado')
      await filterTo(page, target)
      // Click the order number text (row click navigates to /orders/{id}).
      await page
        .getByText(target, { exact: true })
        .locator('visible=true')
        .first()
        .click()
      await page.waitForLoadState('load')
      // Detail header confirms we are on the right order.
      await expect(
        page.getByRole('heading', { name: `Pedido ${target}` }),
      ).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(800)

      const revertBtn = page.getByRole('button', { name: 'Voltar para Rascunho' })
      await expect(revertBtn.first()).toBeVisible({ timeout: 10000 })
      await revertBtn.first().click()

      // Direct PUT transition -> toast "Status alterado para Rascunho".
      await expect(
        page.getByText('Status alterado para Rascunho', { exact: true }),
      ).toBeVisible({ timeout: 15000 })
      await page.waitForTimeout(1500)

      // Status badge on detail should now read "Rascunho".
      await expect(page.getByText('Rascunho', { exact: true }).first()).toBeVisible({
        timeout: 10000,
      })
      await page.screenshot({
        path: `${SHOTS}/cancel-07-reverted-rascunho.png`,
        fullPage: true,
      })
      console.log(`[cleanup] ${target} reverted to Rascunho successfully`)
    } catch (err) {
      // Cleanup failure must be reported but should not fail the feature assertions.
      console.error(
        `[cleanup] FAILED to revert ${target} to Rascunho: ${(err as Error).message}`,
      )
      await page.screenshot({
        path: `${SHOTS}/cancel-07-revert-FAILED.png`,
        fullPage: true,
      })
    }
  })
})
