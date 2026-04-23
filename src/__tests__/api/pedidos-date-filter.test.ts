/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Firebase admin mock ----------------------------------------------------
// Chainable query: collection().where().where().orderBy().get()
function makeQueryMock(docs: any[]) {
  const query: any = {
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    get: vi.fn(async () => ({
      docs: docs.map((d) => ({
        id: d.id,
        data: () => {
          const { id: _id, ...rest } = d
          return rest
        },
      })),
    })),
  }
  return query
}

let docsFixture: any[] = []
const mockCollection = vi.fn(() => makeQueryMock(docsFixture))

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  adminAuth: {},
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP') },
}))

// ---- api-auth mock ---------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' }
let currentAuth: MockAuth | null = null

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth')
  return {
    ...actual,
    getAuthFromRequest: vi.fn(async () => currentAuth),
  }
})

// Import after mocks
import { GET } from '@/app/api/pedidos/route'

// ---- Helpers ---------------------------------------------------------------
function tsFromDate(d: Date) {
  // Minimal Timestamp-like object — GET route uses p.dataEntrega as-is for
  // filtering, so expose both toDate() and _seconds to mirror real shapes.
  return {
    toDate: () => d,
    _seconds: Math.floor(d.getTime() / 1000),
  }
}

function pedido(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    isActive: true,
    status: 'CONFIRMADO',
    numeroPedido: id.toUpperCase(),
    clienteId: 'c1',
    clienteNome: 'Teste',
    orcamentos: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    createdAt: tsFromDate(new Date(2026, 3, 1)),
    updatedAt: tsFromDate(new Date(2026, 3, 1)),
    ...overrides,
  }
}

function makeRequest(url: string) {
  return new NextRequest(url, { method: 'GET' })
}

// ---- Tests ----------------------------------------------------------------
describe('GET /api/pedidos — dataEntrega date filter', () => {
  beforeEach(() => {
    mockCollection.mockClear()
    docsFixture = []
    currentAuth = { uid: 'admin-1', role: 'admin' }
  })

  it('returns only pedidos whose dataEntrega falls within [dateFrom, dateTo]', async () => {
    docsFixture = [
      pedido('in-range', { dataEntrega: tsFromDate(new Date(2026, 3, 15)) }),
      pedido('before', { dataEntrega: tsFromDate(new Date(2026, 2, 20)) }),
      pedido('after', { dataEntrega: tsFromDate(new Date(2026, 4, 5)) }),
      pedido('edge-start', { dataEntrega: tsFromDate(new Date(2026, 3, 1)) }),
      pedido('edge-end', { dataEntrega: tsFromDate(new Date(2026, 3, 30, 23, 59)) }),
    ]

    const res = await GET(
      makeRequest('http://localhost:4000/api/pedidos?dateFrom=2026-04-01&dateTo=2026-04-30'),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    const ids = (data.data as Array<{ id: string }>).map((p) => p.id).sort()
    expect(ids).toEqual(['edge-end', 'edge-start', 'in-range'])
  })

  it('excludes pedidos without dataEntrega when a date filter is active', async () => {
    docsFixture = [
      pedido('with-date', { dataEntrega: tsFromDate(new Date(2026, 3, 10)) }),
      pedido('no-date'), // dataEntrega omitted
    ]

    const res = await GET(
      makeRequest('http://localhost:4000/api/pedidos?dateFrom=2026-04-01&dateTo=2026-04-30'),
    )
    const data = await res.json()

    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe('with-date')
  })

  it('does not filter by date when neither dateFrom nor dateTo is set', async () => {
    docsFixture = [
      pedido('a', { dataEntrega: tsFromDate(new Date(2025, 0, 1)) }),
      pedido('b'), // no dataEntrega
      pedido('c', { dataEntrega: tsFromDate(new Date(2027, 11, 31)) }),
    ]

    const res = await GET(makeRequest('http://localhost:4000/api/pedidos'))
    const data = await res.json()

    expect(data.data).toHaveLength(3)
  })

  it('accepts only dateFrom (open-ended upper bound)', async () => {
    docsFixture = [
      pedido('before', { dataEntrega: tsFromDate(new Date(2026, 2, 1)) }),
      pedido('after', { dataEntrega: tsFromDate(new Date(2027, 0, 1)) }),
    ]

    const res = await GET(
      makeRequest('http://localhost:4000/api/pedidos?dateFrom=2026-04-01'),
    )
    const data = await res.json()

    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe('after')
  })

  it('accepts only dateTo (open-ended lower bound)', async () => {
    docsFixture = [
      pedido('before', { dataEntrega: tsFromDate(new Date(2026, 2, 1)) }),
      pedido('after', { dataEntrega: tsFromDate(new Date(2027, 0, 1)) }),
    ]

    const res = await GET(
      makeRequest('http://localhost:4000/api/pedidos?dateTo=2026-06-30'),
    )
    const data = await res.json()

    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe('before')
  })

  it('returns 401 when unauthenticated', async () => {
    currentAuth = null
    const res = await GET(
      makeRequest('http://localhost:4000/api/pedidos?dateFrom=2026-04-01&dateTo=2026-04-30'),
    )
    expect(res.status).toBe(401)
  })
})
