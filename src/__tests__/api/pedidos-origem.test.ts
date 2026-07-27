/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- In-memory Firestore mock (supports doc get/set + runTransaction) -------
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
    set: vi.fn(async (payload: DocData, opts?: { merge?: boolean }) => {
      store.set(path, opts?.merge ? { ...(store.get(path) ?? {}), ...payload } : payload)
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
        set: (ref: any, payload: any, opts?: any) => ref.set(payload, opts),
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

const createBody = (extra: Record<string, unknown> = {}) => ({
  clienteId: 'c1',
  clienteNome: 'Maria',
  entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
  orcamentos: [{ itens: [{ nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }] }],
  ...extra,
})

describe('POST /api/pedidos — origem', () => {
  beforeEach(() => {
    store.clear()
    genCounter = 0
    currentAuth = { uid: 'atendente-1', role: 'atendente' }
  })

  it('defaults origem to LOJA when not provided', async () => {
    const res = await POST(postReq(createBody()))
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/gen-1')!
    expect(stored.origem).toBe('LOJA')
  })

  it('respects an explicit ONLINE origem', async () => {
    const res = await POST(postReq(createBody({ origem: 'ONLINE' })))
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/gen-1')!
    expect(stored.origem).toBe('ONLINE')
  })

  it('respects an explicit LOJA origem', async () => {
    const res = await POST(postReq(createBody({ origem: 'LOJA' })))
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/gen-1')!
    expect(stored.origem).toBe('LOJA')
  })

  it('rejects an invalid origem value (400)', async () => {
    const res = await POST(postReq(createBody({ origem: 'MARKETPLACE' })))
    expect(res.status).toBe(400)
  })
})
