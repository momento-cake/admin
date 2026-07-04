/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- In-memory Firestore mock (supports doc get/update/set + runTransaction)
type DocData = Record<string, any>
const store = new Map<string, DocData>()
let genCounter = 0

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop()!,
    __path: path,
    get: vi.fn(async () => ({
      exists: store.has(path),
      data: () => store.get(path),
      id: path.split('/').pop()!,
    })),
    update: vi.fn(async (payload: DocData) => {
      store.set(path, { ...(store.get(path) ?? {}), ...payload })
    }),
    set: vi.fn(async (payload: DocData) => {
      store.set(path, payload)
    }),
  }
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id?: string) => makeDocRef(`${name}/${id ?? `gen-${++genCounter}`}`),
    }),
    runTransaction: async (cb: (t: any) => Promise<any>) =>
      cb({
        get: (ref: any) => ref.get(),
        set: (ref: any, payload: any) => ref.set(payload),
      }),
  },
  adminAuth: {},
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    now: vi.fn(() => ({ __ts: 'NOW' })),
    fromDate: (d: Date) => ({ __ts: d.getTime(), toDate: () => d }),
  },
}))

// ---- api-auth mock ---------------------------------------------------------
let currentAuth: { uid: string; role: 'admin' | 'atendente' | 'producao' } | null = null
vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth')
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) }
})

import { POST } from '@/app/api/pedidos/route'

function postReq(body: unknown) {
  return new NextRequest('http://localhost:4000/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const createBody = (dataEntrega?: string) => ({
  clienteId: 'c1',
  clienteNome: 'Maria',
  entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
  orcamentos: [{ itens: [{ nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }] }],
  ...(dataEntrega ? { dataEntrega } : {}),
})

describe('POST /api/pedidos — dataEntrega in the past (back-dated orders)', () => {
  beforeEach(() => {
    store.clear()
    genCounter = 0
    currentAuth = { uid: 'atendente-1', role: 'atendente' }
  })

  it('accepts a past delivery date and persists it (201)', async () => {
    const pastDate = '2020-01-15T00:00:00.000Z'
    const res = await POST(postReq(createBody(pastDate)))
    expect(res.status).toBe(201)

    const stored = store.get('pedidos/gen-1')!
    expect(stored.dataEntrega).toBe(pastDate)
  })

  it('derives dataVencimento from a past dataEntrega (not forced to future)', async () => {
    const pastDate = '2020-01-15T00:00:00.000Z'
    const res = await POST(postReq(createBody(pastDate)))
    expect(res.status).toBe(201)

    const stored = store.get('pedidos/gen-1')!
    // dataVencimento defaults to dataEntrega when present — so it is allowed to be in the past.
    expect(stored.dataVencimento).toEqual({
      __ts: new Date(pastDate).getTime(),
      toDate: expect.any(Function),
    })
  })

  it('still accepts a future delivery date (201)', async () => {
    const futureDate = '2099-12-31T00:00:00.000Z'
    const res = await POST(postReq(createBody(futureDate)))
    expect(res.status).toBe(201)

    const stored = store.get('pedidos/gen-1')!
    expect(stored.dataEntrega).toBe(futureDate)
  })
})
