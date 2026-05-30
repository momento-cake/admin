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
import { PUT as putPedido } from '@/app/api/pedidos/[id]/route'

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
        subtotal: 200,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        total: 200,
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

function putReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/pedidos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('PUT /api/pedidos/[id] — cancellation gate', () => {
  beforeEach(() => {
    store.clear()
    collectionSpy.mockClear()
    currentAuth = { uid: 'atendente-1', role: 'atendente' }
  })

  it('rejects CANCELADO without a cancelamento (400)', async () => {
    seedPedido('p1')
    const res = await putPedido(putReq('p1', { status: 'CANCELADO' }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('motivo do cancelamento')
  })

  it('rejects CANCELADO with an empty motivo (400)', async () => {
    seedPedido('p1')
    const res = await putPedido(
      putReq('p1', { status: 'CANCELADO', cancelamento: { categoria: 'OUTRO', motivo: '   ' } }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('cancels with a preset reason and stamps canceladoEm/canceladoPor', async () => {
    seedPedido('p1')
    const res = await putPedido(
      putReq('p1', {
        status: 'CANCELADO',
        cancelamento: {
          categoria: 'CLIENTE_DESISTIU',
          motivo: 'Cliente desistiu / solicitou cancelamento',
        },
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(200)
    const stored = store.get('pedidos/p1')!
    expect(stored.status).toBe('CANCELADO')
    expect(stored.cancelamento.categoria).toBe('CLIENTE_DESISTIU')
    expect(stored.cancelamento.motivo).toBe('Cliente desistiu / solicitou cancelamento')
    expect(stored.cancelamento.canceladoPor).toBe('atendente-1')
    expect(stored.cancelamento.canceladoEm).toBe('SERVER_TS')
  })

  it('cancels with an OUTRO free-text reason', async () => {
    seedPedido('p1')
    const res = await putPedido(
      putReq('p1', {
        status: 'CANCELADO',
        cancelamento: { categoria: 'OUTRO', motivo: 'Fora da área de cobertura' },
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(200)
    const stored = store.get('pedidos/p1')!
    expect(stored.cancelamento.categoria).toBe('OUTRO')
    expect(stored.cancelamento.motivo).toBe('Fora da área de cobertura')
  })

  it('does not require a reason for non-cancel updates', async () => {
    seedPedido('p1')
    const res = await putPedido(
      putReq('p1', { status: 'EM_PRODUCAO' }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(200)
    const stored = store.get('pedidos/p1')!
    expect(stored.status).toBe('EM_PRODUCAO')
    expect(stored.cancelamento).toBeUndefined()
  })

  it('returns 403 for producao (no orders:update)', async () => {
    seedPedido('p1')
    currentAuth = { uid: 'u1', role: 'producao' }
    const res = await putPedido(
      putReq('p1', {
        status: 'CANCELADO',
        cancelamento: { categoria: 'OUTRO', motivo: 'x' },
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(403)
  })
})
