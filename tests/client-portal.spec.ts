import { test, expect, Page, APIRequestContext } from '@playwright/test'

const BASE_URL = 'http://localhost:4000'

// Test data for orders created during beforeAll
interface TestOrderInfo {
  id: string
  publicToken: string
  numeroPedido: string
}

let orderAguardando: TestOrderInfo
let orderConfirmado: TestOrderInfo
let orderRascunho: TestOrderInfo
let orderEntrega: TestOrderInfo
let orderRetirada: TestOrderInfo
let orderWithNotes: TestOrderInfo
let orderToConfirm: TestOrderInfo

// Auth cookie captured after login
let authCookie: string

/**
 * Login via UI, capture the auth-token cookie, and return it.
 */
async function loginAndGetAuthCookie(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')

  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard (URL may have trailing slash)
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  const cookies = await page.context().cookies()
  const authTokenCookie = cookies.find((c) => c.name === 'auth-token')
  if (!authTokenCookie) {
    throw new Error('auth-token cookie not found after login')
  }
  return authTokenCookie.value
}

/**
 * Create a test pedido via the admin API.
 */
async function createTestOrder(
  request: APIRequestContext,
  cookie: string,
  overrides: {
    status?: string
    clienteNome?: string
    entregaTipo?: 'ENTREGA' | 'RETIRADA'
    observacoesCliente?: string
    dataEntrega?: string
  } = {}
): Promise<TestOrderInfo> {
  const entrega =
    overrides.entregaTipo === 'RETIRADA'
      ? {
          tipo: 'RETIRADA' as const,
          custoPorKm: 4.5,
          taxaExtra: 0,
          freteTotal: 0,
          enderecoRetiradaId: 'store-1',
          enderecoRetiradaNome: 'Loja Principal',
        }
      : {
          tipo: 'ENTREGA' as const,
          custoPorKm: 4.5,
          taxaExtra: 5,
          freteTotal: 25,
          distanciaKm: 5,
          enderecoEntrega: {
            id: 'addr-test-1',
            label: 'Casa',
            cep: '01001-000',
            estado: 'SP',
            cidade: 'Sao Paulo',
            bairro: 'Centro',
            endereco: 'Rua Teste',
            numero: '100',
          },
        }

  const body = {
    clienteId: 'test-client-e2e',
    clienteNome: overrides.clienteNome || 'Cliente Teste E2E',
    clienteTelefone: '11999998888',
    status: overrides.status || 'RASCUNHO',
    orcamentos: [
      {
        itens: [
          {
            nome: 'Bolo de Chocolate',
            descricao: 'Bolo de chocolate com cobertura',
            precoUnitario: 80,
            quantidade: 1,
            total: 80,
          },
          {
            nome: 'Brigadeiro (cento)',
            precoUnitario: 45,
            quantidade: 2,
            total: 90,
          },
        ],
        desconto: 10,
        descontoTipo: 'valor',
        acrescimo: 0,
      },
    ],
    entrega,
    dataEntrega: overrides.dataEntrega || '2026-04-15',
    observacoesCliente: overrides.observacoesCliente || undefined,
  }

  const response = await request.post(`${BASE_URL}/api/pedidos/`, {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth-token=${cookie}`,
    },
    data: body,
    timeout: 30000,
  })

  const json = await response.json()
  if (!json.success) {
    throw new Error(`Failed to create test order: ${JSON.stringify(json)}`)
  }

  return {
    id: json.data.id,
    publicToken: json.data.publicToken,
    numeroPedido: json.data.numeroPedido,
  }
}

/**
 * Soft-delete a test pedido via the admin API.
 */
async function deleteTestOrder(
  request: APIRequestContext,
  cookie: string,
  orderId: string
): Promise<void> {
  try {
    await request.delete(`${BASE_URL}/api/pedidos/${orderId}/`, {
      headers: {
        Cookie: `auth-token=${cookie}`,
      },
      timeout: 30000,
    })
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

test.describe('Client Portal E2E Tests', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    // Login and capture auth cookie
    const context = await browser.newContext()
    const page = await context.newPage()
    authCookie = await loginAndGetAuthCookie(page)
    const request = context.request

    // Create test orders sequentially (Firestore transaction counter needs sequential access)
    orderAguardando = await createTestOrder(request, authCookie, {
      status: 'AGUARDANDO_APROVACAO',
      clienteNome: 'Maria Teste Aguardando',
    })
    orderConfirmado = await createTestOrder(request, authCookie, {
      status: 'CONFIRMADO',
      clienteNome: 'Joao Teste Confirmado',
    })
    orderRascunho = await createTestOrder(request, authCookie, {
      status: 'RASCUNHO',
      clienteNome: 'Ana Teste Rascunho',
    })
    orderEntrega = await createTestOrder(request, authCookie, {
      status: 'AGUARDANDO_APROVACAO',
      clienteNome: 'Pedro Teste Entrega',
      entregaTipo: 'ENTREGA',
    })
    orderRetirada = await createTestOrder(request, authCookie, {
      status: 'AGUARDANDO_APROVACAO',
      clienteNome: 'Lucia Teste Retirada',
      entregaTipo: 'RETIRADA',
    })
    orderWithNotes = await createTestOrder(request, authCookie, {
      status: 'AGUARDANDO_APROVACAO',
      clienteNome: 'Carlos Teste Notas',
      observacoesCliente: 'Sem lactose, por favor. Entregar depois das 14h.',
    })
    orderToConfirm = await createTestOrder(request, authCookie, {
      status: 'AGUARDANDO_APROVACAO',
      clienteNome: 'Fernanda Teste Confirmar',
    })

    await page.close()
    await context.close()
  })

  test.afterAll(async ({ browser }) => {
    // Cleanup test orders
    const context = await browser.newContext()
    const request = context.request

    const allOrders = [
      orderAguardando,
      orderConfirmado,
      orderRascunho,
      orderEntrega,
      orderRetirada,
      orderWithNotes,
      orderToConfirm,
    ]

    await Promise.all(
      allOrders
        .filter((o) => o?.id)
        .map((o) => deleteTestOrder(request, authCookie, o.id))
    )

    await context.close()
  })

  // ==========================================================================
  // Portal Access Tests (no auth)
  // ==========================================================================

  test.describe('Portal Access', () => {
    test('loads page for AGUARDANDO_APROVACAO order', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderAguardando.publicToken}`)
      await page.waitForLoadState('load')

      // Should show the order details, not an error
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })
      await expect(page.locator(`text=${orderAguardando.numeroPedido}`)).toBeVisible()
      await expect(page.locator('text=Maria Teste Aguardando')).toBeVisible()
    })

    test('loads page for CONFIRMADO order with confirmed state', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderConfirmado.publicToken}`)
      await page.waitForLoadState('load')

      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=Joao Teste Confirmado')).toBeVisible()

      // Should show confirmed banner
      await expect(page.locator('text=Pedido Confirmado!')).toBeVisible()
    })

    test('shows not available for RASCUNHO order', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderRascunho.publicToken}`)
      await page.waitForLoadState('load')

      // Should show error/unavailable message (403 from API triggers error in page)
      await expect(
        page.getByRole('heading', { name: /não está disponível/ })
      ).toBeVisible({ timeout: 10000 })
    })

    test('shows not found for invalid token', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/this-is-a-completely-invalid-token-12345`)
      await page.waitForLoadState('load')

      // Should show not found message
      await expect(
        page.getByRole('heading', { name: /não encontrado/ })
      ).toBeVisible({ timeout: 10000 })
    })
  })

  // ==========================================================================
  // Order Content Display Tests (no auth)
  // ==========================================================================

  test.describe('Order Content Display', () => {
    test('displays order items with names, quantities, and prices', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderAguardando.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Check items are displayed
      await expect(page.getByText('Bolo de Chocolate', { exact: true })).toBeVisible()
      await expect(page.getByText('Brigadeiro (cento)', { exact: true })).toBeVisible()

      // Check quantity x price breakdown appears (e.g., "1 x R$ 80,00")
      await expect(page.getByText(/1 x R\$/)).toBeVisible()
      await expect(page.getByText(/2 x R\$/)).toBeVisible()

      // Check subtotal section exists
      await expect(page.getByText('Subtotal')).toBeVisible()
      await expect(page.getByText('Total', { exact: true })).toBeVisible()
    })

    test('shows delivery info for ENTREGA orders', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderEntrega.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should display frete (freight) cost line
      await expect(page.locator('text=Frete')).toBeVisible()
    })

    test('shows pickup info for RETIRADA orders', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderRetirada.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should display "Retirada" with "Gratis" in the totals section
      await expect(page.getByText('Grátis')).toBeVisible()
    })

    test('displays client notes when present', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderWithNotes.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should display notes section
      await expect(page.locator('text=Sem lactose, por favor')).toBeVisible()
    })

    test('displays delivery date', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderAguardando.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Data de entrega should be displayed (15/04/2026)
      await expect(page.locator('text=15/04/2026')).toBeVisible()
    })

    test('totals display correctly with discount', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderAguardando.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Subtotal = 80 + 90 = 170
      // Desconto = 10
      // Items have discount visible
      await expect(page.locator('text=Desconto')).toBeVisible()
    })
  })

  // ==========================================================================
  // Confirmation Flow Tests (no auth)
  // ==========================================================================

  test.describe('Confirmation Flow', () => {
    test('AGUARDANDO_APROVACAO order shows confirm button', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderAguardando.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should show the "Confirmar Pedido" button
      await expect(page.locator('button:has-text("Confirmar Pedido")')).toBeVisible()
    })

    test('CONFIRMADO order does NOT show confirm button', async ({ page }) => {
      await page.goto(`${BASE_URL}/pedido/${orderConfirmado.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should NOT show the confirm button
      await expect(page.locator('button:has-text("Confirmar Pedido")')).not.toBeVisible()

      // But should show the confirmed banner
      await expect(page.locator('text=Pedido Confirmado!')).toBeVisible()
    })

    test('clicking confirm changes status to CONFIRMADO', async ({ page }) => {
      // Use the dedicated orderToConfirm for this test
      await page.goto(`${BASE_URL}/pedido/${orderToConfirm.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should show confirm button
      const confirmButton = page.locator('button:has-text("Confirmar Pedido")')
      await expect(confirmButton).toBeVisible()

      // Click confirm and wait for API response
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes('/confirmar') && resp.status() === 200,
          { timeout: 15000 }
        ),
        confirmButton.click(),
      ])

      // Verify the API returned success
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data.status).toBe('CONFIRMADO')

      // Reload the page to see confirmed state (avoids hydration issues in dev mode)
      await page.reload()
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should show confirmed banner and no confirm button
      await expect(page.locator('text=Pedido Confirmado!')).toBeVisible()
      await expect(page.locator('button:has-text("Confirmar Pedido")')).not.toBeVisible()
    })

    test('refreshing after confirmation still shows CONFIRMADO', async ({ page }) => {
      // Load the page (orderToConfirm was confirmed in the previous test)
      await page.goto(`${BASE_URL}/pedido/${orderToConfirm.publicToken}`)
      await page.waitForLoadState('load')
      await expect(page.getByRole('heading', { name: 'Momento Cake' })).toBeVisible({ timeout: 10000 })

      // Should still show confirmed state
      await expect(page.locator('text=Pedido Confirmado!')).toBeVisible()
      await expect(page.locator('button:has-text("Confirmar Pedido")')).not.toBeVisible()
    })
  })

  // ==========================================================================
  // Admin Share Tests (requires login)
  // ==========================================================================

  test.describe('Admin Share Button', () => {
    test('share button visible for AGUARDANDO_APROVACAO order', async ({ page }) => {
      // Login as admin
      await page.goto(`${BASE_URL}/login`)
      await page.waitForLoadState('load')
      await page.fill('input[type="email"]', 'admin@momentocake.com.br')
      await page.fill('input[type="password"]', 'G8j5k188')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })

      // Navigate to the AGUARDANDO_APROVACAO order detail page
      await page.goto(`${BASE_URL}/orders/${orderAguardando.id}`)
      await page.waitForLoadState('load')

      // Should see the "Compartilhar" share button
      await expect(page.locator('button:has-text("Compartilhar")')).toBeVisible({ timeout: 10000 })
    })

    test('share button dropdown shows copy and WhatsApp options', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`)
      await page.waitForLoadState('load')
      await page.fill('input[type="email"]', 'admin@momentocake.com.br')
      await page.fill('input[type="password"]', 'G8j5k188')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })

      // Navigate to order
      await page.goto(`${BASE_URL}/orders/${orderAguardando.id}`)
      await page.waitForLoadState('load')

      // Click share button to open dropdown
      const shareButton = page.locator('button:has-text("Compartilhar")')
      await expect(shareButton).toBeVisible({ timeout: 10000 })
      await shareButton.click()

      // Should see dropdown items
      await expect(page.locator('text=Copiar Link')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Enviar via WhatsApp')).toBeVisible()
    })

    test('share button NOT visible for CONFIRMADO order', async ({ page }) => {
      // Login
      await page.goto(`${BASE_URL}/login`)
      await page.waitForLoadState('load')
      await page.fill('input[type="email"]', 'admin@momentocake.com.br')
      await page.fill('input[type="password"]', 'G8j5k188')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })

      // Navigate to the CONFIRMADO order detail page
      await page.goto(`${BASE_URL}/orders/${orderConfirmado.id}`)
      await page.waitForLoadState('load')

      // Wait for page content to load
      await expect(page.locator('text=Joao Teste Confirmado')).toBeVisible({ timeout: 10000 })

      // Share button should NOT be visible for confirmed orders
      await expect(page.locator('button:has-text("Compartilhar")')).not.toBeVisible()
    })
  })
})
