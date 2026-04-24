/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- In-memory Firestore mock ---------------------------------------------
type DocData = Record<string, any>
const store = new Map<string, DocData>()

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop()!,
    get: vi.fn(async () => {
      const data = store.get(path)
      return {
        exists: data !== undefined,
        data: () => data,
        id: path.split('/').pop()!,
      }
    }),
    update: vi.fn(async (payload: DocData) => {
      const existing = store.get(path) ?? {}
      store.set(path, { ...existing, ...payload })
    }),
    set: vi.fn(async (payload: DocData) => {
      store.set(path, payload)
    }),
  }
}

const collectionSpy = vi.fn((name: string) => ({
  doc: (id: string) => makeDocRef(`${name}/${id}`),
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (n: string) => collectionSpy(n) },
  adminAuth: {},
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2026-04-20T12:00:00.000Z'),
      seconds: Math.floor(Date.UTC(2026, 3, 20, 12) / 1000),
      nanoseconds: 0,
    })),
    fromDate: (d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    }),
  },
}))

// ---- api-auth mock --------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' }
let currentAuth: MockAuth | null = null

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth')
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) }
})

// ---- Imports after mocks --------------------------------------------------
import { POST as postPagamento } from '@/app/api/pedidos/[id]/pagamentos/route'
import { DELETE as deletePagamento } from '@/app/api/pedidos/[id]/pagamentos/[pagamentoId]/route'
import { PUT as putPedido } from '@/app/api/pedidos/[id]/route'

// ---- Fixtures -------------------------------------------------------------
function tsFromDate(d: Date) {
  return {
    toDate: () => d,
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
  }
}

function seedPedido(id: string, overrides: DocData = {}) {
  const base = {
    numeroPedido: id,
    clienteId: 'c1',
    clienteNome: 'Maria',
    status: 'CONFIRMADO',
    isActive: true,
    orcamentos: [
      {
        id: 'o1',
        versao: 1,
        isAtivo: true,
        status: 'APROVADO',
        itens: [],
        subtotal: 450,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        total: 450,
        criadoEm: tsFromDate(new Date(2026, 3, 1)),
        criadoPor: 'admin-1',
      },
    ],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [],
    totalPago: 0,
    dataVencimento: tsFromDate(new Date(2026, 3, 28)),
    dataEntrega: tsFromDate(new Date(2026, 3, 28)),
    statusPagamento: 'PENDENTE',
    createdAt: tsFromDate(new Date(2026, 3, 1)),
    updatedAt: tsFromDate(new Date(2026, 3, 1)),
    createdBy: 'admin-1',
  }
  store.set(`pedidos/${id}`, { ...base, ...overrides })
}

function postReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/pedidos/${id}/pagamentos`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function delReq(id: string, pagamentoId: string) {
  return new NextRequest(
    `http://localhost:4000/api/pedidos/${id}/pagamentos/${pagamentoId}`,
    { method: 'DELETE' }
  )
}

function putReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/pedidos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// ---- Tests ----------------------------------------------------------------
describe('POST /api/pedidos/[id]/pagamentos', () => {
  beforeEach(() => {
    store.clear()
    collectionSpy.mockClear()
    currentAuth = { uid: 'admin-1', role: 'admin' }
  })

  it('returns 401 when unauthenticated', async () => {
    seedPedido('p1')
    currentAuth = null
    const res = await postPagamento(postReq('p1', { data: '2026-04-20', valor: 100, metodo: 'PIX' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is producao (no orders:update)', async () => {
    seedPedido('p1')
    currentAuth = { uid: 'u1', role: 'producao' }
    const res = await postPagamento(postReq('p1', { data: '2026-04-20', valor: 100, metodo: 'PIX' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(403)
  })

  it('allows atendente (has orders:update by default)', async () => {
    seedPedido('p1')
    currentAuth = { uid: 'u1', role: 'atendente' }
    const res = await postPagamento(postReq('p1', { data: '2026-04-20', valor: 100, metodo: 'PIX' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(201)
  })

  it('returns 400 for invalid body (negative valor)', async () => {
    seedPedido('p1')
    const res = await postPagamento(postReq('p1', { data: '2026-04-20', valor: -10, metodo: 'PIX' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for future date', async () => {
    seedPedido('p1')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 2)
    const res = await postPagamento(
      postReq('p1', { data: tomorrow.toISOString(), valor: 100, metodo: 'PIX' }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when pedido does not exist', async () => {
    const res = await postPagamento(
      postReq('missing', { data: '2026-04-20', valor: 100, metodo: 'PIX' }),
      { params: Promise.resolve({ id: 'missing' }) }
    )
    expect(res.status).toBe(404)
  })

  it('registers a partial payment: status → PARCIAL, totalPago correct', async () => {
    seedPedido('p1') // total = 450
    const res = await postPagamento(
      postReq('p1', { data: '2026-04-20', valor: 150, metodo: 'PIX' }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.totalPago).toBe(150)
    expect(body.data.statusPagamento).toBe('PARCIAL')

    const stored = store.get('pedidos/p1')!
    expect(stored.pagamentos).toHaveLength(1)
    expect(stored.pagamentos[0].metodo).toBe('PIX')
    expect(stored.pagamentos[0].valor).toBe(150)
    expect(stored.totalPago).toBe(150)
    expect(stored.statusPagamento).toBe('PARCIAL')
  })

  it('marks status=PAGO when the payment covers the remaining balance', async () => {
    seedPedido('p1', {
      pagamentos: [
        {
          id: 'existing',
          data: tsFromDate(new Date(2026, 3, 10)),
          valor: 300,
          metodo: 'PIX',
          createdAt: tsFromDate(new Date(2026, 3, 10)),
          createdBy: 'u',
        },
      ],
      totalPago: 300,
      statusPagamento: 'PARCIAL',
    })
    const res = await postPagamento(
      postReq('p1', { data: '2026-04-20', valor: 150, metodo: 'DINHEIRO' }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.totalPago).toBe(450)
    expect(body.data.statusPagamento).toBe('PAGO')
  })

  it('persists comprovante metadata when provided', async () => {
    seedPedido('p1')
    const res = await postPagamento(
      postReq('p1', {
        data: '2026-04-20',
        valor: 100,
        metodo: 'PIX',
        comprovanteUrl: 'https://storage.example/x.pdf',
        comprovantePath: 'pedidos/p1/comprovantes/x.pdf',
        comprovanteTipo: 'pdf',
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/p1')!
    expect(stored.pagamentos[0].comprovanteUrl).toBe('https://storage.example/x.pdf')
    expect(stored.pagamentos[0].comprovantePath).toBe('pedidos/p1/comprovantes/x.pdf')
    expect(stored.pagamentos[0].comprovanteTipo).toBe('pdf')
  })

  it('uses the provided pagamentoId when given (to match uploaded receipt)', async () => {
    seedPedido('p1')
    const fixedId = '11111111-1111-4111-8111-111111111111'
    const res = await postPagamento(
      postReq('p1', {
        data: '2026-04-20',
        valor: 100,
        metodo: 'PIX',
        pagamentoId: fixedId,
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/p1')!
    expect(stored.pagamentos[0].id).toBe(fixedId)
  })
})

// ---------------------------------------------------------------------------

describe('DELETE /api/pedidos/[id]/pagamentos/[pagamentoId]', () => {
  beforeEach(() => {
    store.clear()
    currentAuth = { uid: 'admin-1', role: 'admin' }
  })

  it('returns 403 for atendente (orders:delete denied)', async () => {
    seedPedido('p1', {
      pagamentos: [
        {
          id: 'pay-1',
          data: tsFromDate(new Date()),
          valor: 100,
          metodo: 'PIX',
          createdAt: tsFromDate(new Date()),
          createdBy: 'u',
        },
      ],
      totalPago: 100,
    })
    currentAuth = { uid: 'u1', role: 'atendente' }
    const res = await deletePagamento(delReq('p1', 'pay-1'), {
      params: Promise.resolve({ id: 'p1', pagamentoId: 'pay-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('removes the pagamento and recomputes totals', async () => {
    seedPedido('p1', {
      pagamentos: [
        {
          id: 'pay-1',
          data: tsFromDate(new Date()),
          valor: 150,
          metodo: 'PIX',
          createdAt: tsFromDate(new Date()),
          createdBy: 'u',
        },
        {
          id: 'pay-2',
          data: tsFromDate(new Date()),
          valor: 300,
          metodo: 'DINHEIRO',
          createdAt: tsFromDate(new Date()),
          createdBy: 'u',
        },
      ],
      totalPago: 450,
      statusPagamento: 'PAGO',
    })
    const res = await deletePagamento(delReq('p1', 'pay-2'), {
      params: Promise.resolve({ id: 'p1', pagamentoId: 'pay-2' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.removed.id).toBe('pay-2')
    expect(body.data.totalPago).toBe(150)
    expect(body.data.statusPagamento).toBe('PARCIAL')
    const stored = store.get('pedidos/p1')!
    expect(stored.pagamentos).toHaveLength(1)
  })

  it('returns 404 for unknown pagamentoId', async () => {
    seedPedido('p1')
    const res = await deletePagamento(delReq('p1', 'nope'), {
      params: Promise.resolve({ id: 'p1', pagamentoId: 'nope' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown pedido', async () => {
    const res = await deletePagamento(delReq('nope', 'pay-1'), {
      params: Promise.resolve({ id: 'nope', pagamentoId: 'pay-1' }),
    })
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------

describe('PUT /api/pedidos/[id] — ENTREGUE gate', () => {
  beforeEach(() => {
    store.clear()
    currentAuth = { uid: 'admin-1', role: 'admin' }
  })

  it('returns 409 when trying to ENTREGUE an unpaid pedido', async () => {
    seedPedido('p1') // total=450, totalPago=0
    const res = await putPedido(putReq('p1', { status: 'ENTREGUE' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/saldo em aberto/i)
    expect(body.details.saldo).toBe(450)
  })

  it('returns 409 when partially paid', async () => {
    seedPedido('p1', { totalPago: 200 })
    const res = await putPedido(putReq('p1', { status: 'ENTREGUE' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(409)
  })

  it('allows ENTREGUE when totalPago >= total', async () => {
    seedPedido('p1', { totalPago: 450, statusPagamento: 'PAGO' })
    const res = await putPedido(putReq('p1', { status: 'ENTREGUE' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
  })

  it('does not gate non-ENTREGUE transitions', async () => {
    seedPedido('p1') // unpaid
    const res = await putPedido(putReq('p1', { status: 'EM_PRODUCAO' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
  })

  it('accepts AGUARDANDO_PAGAMENTO as a valid status', async () => {
    seedPedido('p1')
    const res = await putPedido(putReq('p1', { status: 'AGUARDANDO_PAGAMENTO' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
  })
})
