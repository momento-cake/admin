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
import { PUT } from '@/app/api/pedidos/[id]/route'

const IMG_A = {
  url: 'https://x.test/images/gallery/pedido-referencias/a.jpg',
  storagePath: 'images/gallery/pedido-referencias/a.jpg',
  legenda: 'Topo',
  width: 800,
  height: 600,
}
const IMG_NO_META = {
  url: 'https://x.test/images/gallery/pedido-referencias/b.jpg',
  storagePath: 'images/gallery/pedido-referencias/b.jpg',
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost:4000/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}
function putReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/pedidos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const createBody = (imagensReferencia?: unknown) => ({
  clienteId: 'c1',
  clienteNome: 'Maria',
  entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
  orcamentos: [{ itens: [{ nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }] }],
  ...(imagensReferencia ? { imagensReferencia } : {}),
})

describe('POST /api/pedidos — reference images', () => {
  beforeEach(() => {
    store.clear()
    genCounter = 0
    currentAuth = { uid: 'atendente-1', role: 'atendente' }
  })

  it('persists a stamped, null-safe imagensReferencia array', async () => {
    const res = await POST(postReq(createBody([IMG_A, IMG_NO_META])))
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/gen-1')!
    expect(stored.imagensReferencia).toHaveLength(2)

    const [a, b] = stored.imagensReferencia
    expect(a.url).toBe(IMG_A.url)
    expect(a.legenda).toBe('Topo')
    expect(a.uploadedBy).toBe('atendente-1')
    expect(a.uploadedAt).toEqual({ __ts: 'NOW' })
    expect(typeof a.id).toBe('string')

    // Absent optional fields must be null, never undefined (Firestore rejects undefined).
    expect(b.legenda).toBeNull()
    expect(b.width).toBeNull()
    expect(b.height).toBeNull()
    expect('legenda' in b).toBe(true)
    expect(b.legenda).not.toBeUndefined()
  })

  it('defaults to an empty array when no images are sent', async () => {
    const res = await POST(postReq(createBody()))
    expect(res.status).toBe(201)
    const stored = store.get('pedidos/gen-1')!
    expect(stored.imagensReferencia).toEqual([])
  })

  it('rejects an invalid image (400)', async () => {
    const res = await POST(postReq(createBody([{ url: 'bad', storagePath: '' }])))
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/pedidos/[id] — reference images', () => {
  beforeEach(() => {
    store.clear()
    genCounter = 0
    currentAuth = { uid: 'editor-1', role: 'atendente' }
  })

  function seed() {
    store.set('pedidos/p1', {
      numeroPedido: 'PED-0001',
      status: 'CONFIRMADO',
      isActive: true,
      orcamentos: [],
      entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
      imagensReferencia: [
        {
          id: 'img-existing',
          url: IMG_A.url,
          storagePath: IMG_A.storagePath,
          legenda: 'Antiga',
          width: 800,
          height: 600,
          uploadedAt: { __ts: 'ORIGINAL' },
          uploadedBy: 'orig-user',
        },
      ],
    })
  }

  it('preserves uploadedAt/uploadedBy for existing images and stamps new ones', async () => {
    seed()
    const res = await PUT(
      putReq('p1', {
        imagensReferencia: [
          { id: 'img-existing', url: IMG_A.url, storagePath: IMG_A.storagePath, legenda: 'Atualizada' },
          IMG_NO_META,
        ],
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    )
    expect(res.status).toBe(200)
    const stored = store.get('pedidos/p1')!
    expect(stored.imagensReferencia).toHaveLength(2)

    const existing = stored.imagensReferencia.find((i: any) => i.id === 'img-existing')
    expect(existing.legenda).toBe('Atualizada')
    expect(existing.uploadedAt).toEqual({ __ts: 'ORIGINAL' }) // preserved
    expect(existing.uploadedBy).toBe('orig-user') // preserved

    const added = stored.imagensReferencia.find((i: any) => i.id !== 'img-existing')
    expect(added.uploadedBy).toBe('editor-1')
    expect(added.uploadedAt).toEqual({ __ts: 'NOW' })
    expect(added.legenda).toBeNull()
    expect(added.width).toBeNull()
  })

  it('clears all images when sent an empty array', async () => {
    seed()
    const res = await PUT(putReq('p1', { imagensReferencia: [] }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(200)
    expect(store.get('pedidos/p1')!.imagensReferencia).toEqual([])
  })

  it('returns 403 for producao (no orders:update)', async () => {
    seed()
    currentAuth = { uid: 'u', role: 'producao' }
    const res = await PUT(putReq('p1', { imagensReferencia: [IMG_NO_META] }), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(res.status).toBe(403)
  })
})
