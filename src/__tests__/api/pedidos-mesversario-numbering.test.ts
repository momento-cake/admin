/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---- In-memory Firestore mock (doc get/update/set + runTransaction) --------
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
    set: vi.fn(async (payload: DocData, opts?: { merge?: boolean }) => {
      if (opts?.merge) {
        store.set(path, { ...(store.get(path) ?? {}), ...payload })
      } else {
        store.set(path, payload)
      }
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

const baseBody = (extra: Record<string, unknown> = {}) => ({
  clienteId: 'c1',
  clienteNome: 'Maria',
  entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
  orcamentos: [{ itens: [{ nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }] }],
  ...extra,
})

describe('POST /api/pedidos — MES vs PED numbering', () => {
  beforeEach(() => {
    store.clear()
    genCounter = 0
    currentAuth = { uid: 'atendente-1', role: 'atendente' }
  })

  it('numbers a normal order PED-XXXX from the default counter', async () => {
    const res = await POST(postReq(baseBody()))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.numeroPedido).toBe('PED-0001')
    // The default counter was used, not the mesversario one.
    expect(store.get('pedidoCounters/counter')!.lastNumber).toBe(1)
    expect(store.has('pedidoCounters/mesversario')).toBe(false)
  })

  it('numbers a milestone order MES-XXXX from the mesversario counter', async () => {
    const res = await POST(postReq(baseBody({ mesversarioId: 'm1', mesNumero: 3 })))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.numeroPedido).toBe('MES-0001')
    // The mesversario counter was used, and the default counter is untouched.
    expect(store.get('pedidoCounters/mesversario')!.lastNumber).toBe(1)
    expect(store.has('pedidoCounters/counter')).toBe(false)
  })

  it('persists the back-reference fields on a milestone order', async () => {
    await POST(postReq(baseBody({ mesversarioId: 'm1', mesNumero: 3 })))
    const stored = store.get('pedidos/gen-1')!
    expect(stored.mesversarioId).toBe('m1')
    expect(stored.mesNumero).toBe(3)
  })

  it('stores null back-reference fields on a normal order', async () => {
    await POST(postReq(baseBody()))
    const stored = store.get('pedidos/gen-1')!
    expect(stored.mesversarioId).toBeNull()
    expect(stored.mesNumero).toBeNull()
  })

  it('keeps the two counters independent across mixed creates', async () => {
    await POST(postReq(baseBody())) // PED-0001
    await POST(postReq(baseBody({ mesversarioId: 'm1', mesNumero: 1 }))) // MES-0001
    await POST(postReq(baseBody())) // PED-0002
    await POST(postReq(baseBody({ mesversarioId: 'm2', mesNumero: 2 }))) // MES-0002

    expect(store.get('pedidoCounters/counter')!.lastNumber).toBe(2)
    expect(store.get('pedidoCounters/mesversario')!.lastNumber).toBe(2)
  })

  it('rejects mesNumero out of range (400)', async () => {
    const res = await POST(postReq(baseBody({ mesversarioId: 'm1', mesNumero: 13 })))
    expect(res.status).toBe(400)
  })
})
