/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- Firebase admin mock ----------------------------------------------------
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

import { GET } from '@/app/api/pedidos/resumo/route'

// ---- Helpers ---------------------------------------------------------------
function tsFromDate(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
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
    totalPago: 0,
    createdAt: tsFromDate(new Date(2026, 4, 1)),
    updatedAt: tsFromDate(new Date(2026, 4, 1)),
    ...overrides,
  }
}

function makeRequest(url: string) {
  return new NextRequest(url, { method: 'GET' })
}

function ids(data: any): string[] {
  return (data.data as Array<{ id: string }>).map((p) => p.id).sort()
}

describe('GET /api/pedidos/resumo', () => {
  beforeEach(() => {
    mockCollection.mockClear()
    docsFixture = []
    currentAuth = { uid: 'admin-1', role: 'admin' }
  })

  it('returns dated orders whose dataEntrega is within [from, to]', async () => {
    docsFixture = [
      pedido('in', { dataEntrega: tsFromDate(new Date(2026, 4, 20)) }),
      pedido('before', { dataEntrega: tsFromDate(new Date(2026, 4, 10)) }),
      pedido('after', { dataEntrega: tsFromDate(new Date(2026, 5, 1)) }),
      pedido('edge-start', { dataEntrega: tsFromDate(new Date(2026, 4, 19, 0, 0)) }),
      pedido('edge-end', { dataEntrega: tsFromDate(new Date(2026, 4, 23, 23, 59)) }),
    ]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(ids(data)).toEqual(['edge-end', 'edge-start', 'in'])
  })

  it('includes undated OPEN orders (for the "sem-data" bucket) regardless of range', async () => {
    docsFixture = [
      pedido('dated', { dataEntrega: tsFromDate(new Date(2026, 4, 20)) }),
      pedido('undated-open', { dataEntrega: null, status: 'AGUARDANDO_APROVACAO' }),
    ]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    const data = await res.json()
    expect(ids(data)).toEqual(['dated', 'undated-open'])
  })

  it('excludes a CANCELADO order even when its dataEntrega is within range', async () => {
    docsFixture = [
      pedido('ok', { dataEntrega: tsFromDate(new Date(2026, 4, 20)) }),
      pedido('cancel-in-range', { dataEntrega: tsFromDate(new Date(2026, 4, 20)), status: 'CANCELADO' }),
    ]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    const data = await res.json()
    expect(ids(data)).toEqual(['ok'])
  })

  it('excludes undated orders that are cancelled or already delivered', async () => {
    docsFixture = [
      pedido('undated-cancel', { dataEntrega: null, status: 'CANCELADO' }),
      pedido('undated-delivered', { dataEntrega: null, status: 'ENTREGUE' }),
      pedido('undated-open', { dataEntrega: null, status: 'CONFIRMADO' }),
    ]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    const data = await res.json()
    expect(ids(data)).toEqual(['undated-open'])
  })

  it('returns 400 when from/to are missing', async () => {
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo'))
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    currentAuth = null
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the role cannot view orders', async () => {
    currentAuth = { uid: 'prod-1', role: 'producao' }
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    expect(res.status).toBe(403)
  })

  it('handles an ISO-string dataEntrega', async () => {
    docsFixture = [pedido('iso', { dataEntrega: '2026-05-20' })]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    const data = await res.json()
    expect(ids(data)).toEqual(['iso'])
  })

  it('returns an empty result for an inverted range (from > to)', async () => {
    docsFixture = [pedido('mid', { dataEntrega: tsFromDate(new Date(2026, 4, 20)) })]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-23&to=2026-05-19'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data).toEqual([])
  })

  it('does not 500 on a malformed "from" date', async () => {
    docsFixture = [pedido('x', { dataEntrega: tsFromDate(new Date(2026, 4, 20)) })]
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=garbage&to=2026-05-30'))
    expect(res.status).toBe(200)
  })

  it('returns 500 when the query throws', async () => {
    mockCollection.mockImplementationOnce(() => {
      throw new Error('firestore down')
    })
    const res = await GET(makeRequest('http://localhost:4000/api/pedidos/resumo?from=2026-05-19&to=2026-05-23'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.success).toBe(false)
  })
})
