/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- In-memory Firestore mock -------------------------------------------------
type DocData = Record<string, any>;
const store = new Map<string, DocData>();
let genCounter = 0;

function makeDocRef(collectionName: string, id: string) {
  const path = `${collectionName}/${id}`;
  return {
    id,
    __path: path,
    get: vi.fn(async () => ({
      exists: store.has(path),
      id,
      data: () => store.get(path),
    })),
    update: vi.fn(async (payload: DocData) => {
      store.set(path, { ...(store.get(path) ?? {}), ...payload });
    }),
    set: vi.fn(async (payload: DocData) => {
      store.set(path, payload);
    }),
  };
}

function makeQuery(collectionName: string, filters: Array<[string, string, any]>) {
  const api: any = {
    where: (field: string, op: string, value: any) =>
      makeQuery(collectionName, [...filters, [field, op, value]]),
    orderBy: () => api,
    get: vi.fn(async () => {
      const docs = [...store.entries()]
        .filter(([path]) => path.startsWith(`${collectionName}/`))
        .filter(([, data]) =>
          filters.every(([field, , value]) => data[field] === value)
        )
        .map(([path, data]) => ({
          id: path.split('/').pop()!,
          data: () => data,
        }));
      return { docs, empty: docs.length === 0 };
    }),
  };
  return api;
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id?: string) => makeDocRef(name, id ?? `gen-${++genCounter}`),
      where: (field: string, op: string, value: any) =>
        makeQuery(name, [[field, op, value]]),
    }),
  },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    now: vi.fn(() => ({ __ts: 'NOW' })),
    fromDate: (d: Date) => ({ __ts: d.getTime(), toDate: () => d }),
  },
}));

// ---- api-auth mock ------------------------------------------------------------
let currentAuth: { uid: string; role: 'admin' | 'atendente' | 'producao' } | null = null;
vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { GET as listGET, POST } from '@/app/api/mesversarios/route';
import { GET as detailGET, PUT as detailPUT, DELETE } from '@/app/api/mesversarios/[id]/route';
import { PUT as mesPUT } from '@/app/api/mesversarios/[id]/meses/[numero]/route';
import { GET as dashboardGET } from '@/app/api/mesversarios/dashboard/route';

function req(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost:4000${url}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: { 'content-type': 'application/json' },
  });
}

/** A request whose body is not valid JSON, to exercise the 500 catch path. */
function badReq(url: string, method: string) {
  return new NextRequest(`http://localhost:4000${url}`, {
    method,
    body: 'not-json{',
    headers: { 'content-type': 'application/json' },
  });
}

const validCreate = {
  clienteId: 'c1',
  clienteNome: 'Maria',
  clienteTelefone: '119',
  relatedPersonId: 'rp1',
  bebeNome: 'João',
  dataNascimento: '2025-01-15',
};

function seedMesversario(id: string, overrides: DocData = {}) {
  store.set(`mesversarios/${id}`, {
    clienteId: 'c1',
    clienteNome: 'Maria',
    relatedPersonId: 'rp1',
    bebeNome: 'João',
    dataNascimento: '2025-01-15',
    status: 'ATIVO',
    meses: [
      { numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' },
      { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
    ],
    isActive: true,
    createdAt: { __ts: 1 },
    updatedAt: { __ts: 1 },
    createdBy: 'u1',
    lastModifiedBy: 'u1',
    ...overrides,
  });
}

describe('/api/mesversarios', () => {
  beforeEach(() => {
    store.clear();
    genCounter = 0;
    currentAuth = { uid: 'atendente-1', role: 'atendente' };
  });

  describe('POST', () => {
    it('creates a mesversario with 12 server-generated months', async () => {
      const res = await POST(req('/api/mesversarios', 'POST', validCreate));
      expect(res.status).toBe(201);
      const stored = store.get('mesversarios/gen-1')!;
      expect(stored.meses).toHaveLength(12);
      expect(stored.meses[0].status).toBe('PENDENTE');
      expect(stored.status).toBe('ATIVO');
      expect(stored.isActive).toBe(true);
      expect(stored.createdBy).toBe('atendente-1');
    });

    it('rejects an invalid payload with 400', async () => {
      const res = await POST(req('/api/mesversarios', 'POST', { clienteId: '' }));
      expect(res.status).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await POST(req('/api/mesversarios', 'POST', validCreate));
      expect(res.status).toBe(401);
    });

    it('returns 403 without orders:create permission', async () => {
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await POST(req('/api/mesversarios', 'POST', validCreate));
      expect(res.status).toBe(403);
    });

    it('returns 500 on a malformed body', async () => {
      const res = await POST(badReq('/api/mesversarios', 'POST'));
      expect(res.status).toBe(500);
    });
  });

  describe('GET list', () => {
    it('returns active mesversarios', async () => {
      seedMesversario('m1');
      seedMesversario('m2');
      const res = await listGET(req('/api/mesversarios', 'GET'));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
    });

    it('filters by status', async () => {
      seedMesversario('m1', { status: 'ATIVO' });
      seedMesversario('m2', { status: 'CONCLUIDO' });
      const res = await listGET(req('/api/mesversarios?status=CONCLUIDO', 'GET'));
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].status).toBe('CONCLUIDO');
    });

    it('returns 403 without orders:view', async () => {
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await listGET(req('/api/mesversarios', 'GET'));
      expect(res.status).toBe(403);
    });
  });

  describe('GET list — auth', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await listGET(req('/api/mesversarios', 'GET'));
      expect(res.status).toBe(401);
    });
  });

  describe('GET detail', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await detailGET(req('/api/mesversarios/m1', 'GET'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 without orders:view', async () => {
      seedMesversario('m1');
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await detailGET(req('/api/mesversarios/m1', 'GET'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(403);
    });

    it('returns a single mesversario', async () => {
      seedMesversario('m1');
      const res = await detailGET(req('/api/mesversarios/m1', 'GET'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.id).toBe('m1');
    });

    it('returns 404 when not found', async () => {
      const res = await detailGET(req('/api/mesversarios/nope', 'GET'), {
        params: Promise.resolve({ id: 'nope' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT detail', () => {
    it('updates status and observacoes', async () => {
      seedMesversario('m1');
      const res = await detailPUT(
        req('/api/mesversarios/m1', 'PUT', { status: 'CONCLUIDO', observacoes: 'fim' }),
        { params: Promise.resolve({ id: 'm1' }) }
      );
      expect(res.status).toBe(200);
      const stored = store.get('mesversarios/m1')!;
      expect(stored.status).toBe('CONCLUIDO');
      expect(stored.observacoes).toBe('fim');
      expect(stored.lastModifiedBy).toBe('atendente-1');
    });

    it('returns 404 when missing', async () => {
      const res = await detailPUT(req('/api/mesversarios/x', 'PUT', { status: 'CONCLUIDO' }), {
        params: Promise.resolve({ id: 'x' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 400 for an invalid status', async () => {
      seedMesversario('m1');
      const res = await detailPUT(req('/api/mesversarios/m1', 'PUT', { status: 'BANANA' }), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await detailPUT(req('/api/mesversarios/m1', 'PUT', { status: 'CONCLUIDO' }), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 without orders:update', async () => {
      seedMesversario('m1');
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await detailPUT(req('/api/mesversarios/m1', 'PUT', { status: 'CONCLUIDO' }), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(403);
    });

    it('returns 500 on a malformed body', async () => {
      const res = await detailPUT(badReq('/api/mesversarios/m1', 'PUT'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('soft-deletes (isActive false)', async () => {
      seedMesversario('m1');
      currentAuth = { uid: 'admin-1', role: 'admin' }; // atendente lacks orders:delete
      const res = await DELETE(req('/api/mesversarios/m1', 'DELETE'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(200);
      expect(store.get('mesversarios/m1')!.isActive).toBe(false);
    });

    it('returns 403 without orders:delete', async () => {
      seedMesversario('m1');
      currentAuth = { uid: 'a', role: 'atendente' };
      const res = await DELETE(req('/api/mesversarios/m1', 'DELETE'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await DELETE(req('/api/mesversarios/m1', 'DELETE'), {
        params: Promise.resolve({ id: 'm1' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 404 when the mesversario is missing', async () => {
      currentAuth = { uid: 'admin-1', role: 'admin' };
      const res = await DELETE(req('/api/mesversarios/nope', 'DELETE'), {
        params: Promise.resolve({ id: 'nope' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT month', () => {
    it('updates a single month status and acordo', async () => {
      seedMesversario('m1');
      const res = await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', {
          status: 'ACORDADO',
          acordo: { tema: 'Ursinhos', sabor: 'Chocolate' },
        }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      expect(res.status).toBe(200);
      const stored = store.get('mesversarios/m1')!;
      const mes2 = stored.meses.find((m: any) => m.numero === 2);
      const mes1 = stored.meses.find((m: any) => m.numero === 1);
      expect(mes2.status).toBe('ACORDADO');
      expect(mes2.acordo.tema).toBe('Ursinhos');
      expect(mes1.status).toBe('ENTREGUE'); // untouched
    });

    it('links a pedido and moves the month to PEDIDO_CRIADO', async () => {
      seedMesversario('m1');
      const res = await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', {
          pedidoId: 'ped-1',
          pedidoNumero: 'PED-0001',
        }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      expect(res.status).toBe(200);
      const mes2 = store.get('mesversarios/m1')!.meses.find((m: any) => m.numero === 2);
      expect(mes2.pedidoId).toBe('ped-1');
      expect(mes2.pedidoNumero).toBe('PED-0001');
      expect(mes2.status).toBe('PEDIDO_CRIADO');
    });

    it('stamps the back-reference onto the linked pedido document', async () => {
      seedMesversario('m1');
      store.set('pedidos/ped-1', { numeroPedido: 'PED-0001', mesversarioId: null, mesNumero: null });
      await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', {
          pedidoId: 'ped-1',
          pedidoNumero: 'PED-0001',
        }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      const pedido = store.get('pedidos/ped-1')!;
      expect(pedido.mesversarioId).toBe('m1');
      expect(pedido.mesNumero).toBe(2);
    });

    it('skips the back-reference gracefully when the pedido doc is missing', async () => {
      seedMesversario('m1');
      // No pedidos/ped-1 seeded — the route must not throw.
      const res = await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', {
          pedidoId: 'ped-1',
          pedidoNumero: 'PED-0001',
        }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      expect(res.status).toBe(200);
      expect(store.has('pedidos/ped-1')).toBe(false);
    });

    it('unlinks a pedido: clears the month link and back-reference, status → ACORDADO', async () => {
      store.set('mesversarios/m1', {
        clienteId: 'c1',
        clienteNome: 'Maria',
        relatedPersonId: 'rp1',
        bebeNome: 'João',
        dataNascimento: '2025-01-15',
        status: 'ATIVO',
        meses: [
          {
            numero: 2,
            dataComemoracao: '2025-03-15',
            status: 'PEDIDO_CRIADO',
            pedidoId: 'ped-1',
            pedidoNumero: 'PED-0001',
          },
        ],
        isActive: true,
        createdAt: { __ts: 1 },
        updatedAt: { __ts: 1 },
        createdBy: 'u1',
        lastModifiedBy: 'u1',
      });
      store.set('pedidos/ped-1', { numeroPedido: 'PED-0001', mesversarioId: 'm1', mesNumero: 2 });

      const res = await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', { desvincular: true }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      expect(res.status).toBe(200);

      const mes2 = store.get('mesversarios/m1')!.meses.find((m: any) => m.numero === 2);
      expect(mes2.pedidoId).toBeUndefined();
      expect(mes2.pedidoNumero).toBeUndefined();
      expect(mes2.status).toBe('ACORDADO');

      const pedido = store.get('pedidos/ped-1')!;
      expect(pedido.mesversarioId).toBeNull();
      expect(pedido.mesNumero).toBeNull();
    });

    it('stamps reference images on the acordo with server fields', async () => {
      seedMesversario('m1');
      await mesPUT(
        req('/api/mesversarios/m1/meses/2', 'PUT', {
          acordo: {
            imagensReferencia: [
              { url: 'https://x.test/a.jpg', storagePath: 'images/a.jpg', legenda: 'topo' },
            ],
          },
        }),
        { params: Promise.resolve({ id: 'm1', numero: '2' }) }
      );
      const mes2 = store.get('mesversarios/m1')!.meses.find((m: any) => m.numero === 2);
      const img = mes2.acordo.imagensReferencia[0];
      expect(img.uploadedBy).toBe('atendente-1');
      expect(img.uploadedAt).toEqual({ __ts: 'NOW' });
      expect(img.width).toBeNull();
      expect(typeof img.id).toBe('string');
    });

    it('preserves prior image upload metadata when re-saving the acordo', async () => {
      store.set('mesversarios/m1', {
        clienteId: 'c1',
        clienteNome: 'Maria',
        relatedPersonId: 'rp1',
        bebeNome: 'João',
        dataNascimento: '2025-01-15',
        status: 'ATIVO',
        meses: [
          {
            numero: 1,
            dataComemoracao: '2025-02-15',
            status: 'ACORDADO',
            acordo: {
              tema: 'Antigo',
              imagensReferencia: [
                {
                  id: 'img-1',
                  url: 'https://x.test/a.jpg',
                  storagePath: 'images/a.jpg',
                  legenda: null,
                  width: null,
                  height: null,
                  uploadedAt: { __ts: 'OLD' },
                  uploadedBy: 'someone-else',
                },
              ],
            },
          },
        ],
        isActive: true,
        createdAt: { __ts: 1 },
        updatedAt: { __ts: 1 },
        createdBy: 'u1',
        lastModifiedBy: 'u1',
      });

      await mesPUT(
        req('/api/mesversarios/m1/meses/1', 'PUT', {
          acordo: {
            imagensReferencia: [
              { id: 'img-1', url: 'https://x.test/a.jpg', storagePath: 'images/a.jpg' },
            ],
          },
        }),
        { params: Promise.resolve({ id: 'm1', numero: '1' }) }
      );

      const img = store.get('mesversarios/m1')!.meses[0].acordo.imagensReferencia[0];
      // Prior uploadedAt/uploadedBy are preserved (matched by id).
      expect(img.uploadedAt).toEqual({ __ts: 'OLD' });
      expect(img.uploadedBy).toBe('someone-else');
    });

    it('returns 400 for an invalid status', async () => {
      seedMesversario('m1');
      const res = await mesPUT(req('/api/mesversarios/m1/meses/2', 'PUT', { status: 'NOPE' }), {
        params: Promise.resolve({ id: 'm1', numero: '2' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await mesPUT(req('/api/mesversarios/m1/meses/2', 'PUT', { status: 'ACORDADO' }), {
        params: Promise.resolve({ id: 'm1', numero: '2' }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 without orders:update', async () => {
      seedMesversario('m1');
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await mesPUT(req('/api/mesversarios/m1/meses/2', 'PUT', { status: 'ACORDADO' }), {
        params: Promise.resolve({ id: 'm1', numero: '2' }),
      });
      expect(res.status).toBe(403);
    });

    it('returns 400 for an invalid month number', async () => {
      seedMesversario('m1');
      const res = await mesPUT(req('/api/mesversarios/m1/meses/99', 'PUT', { status: 'ACORDADO' }), {
        params: Promise.resolve({ id: 'm1', numero: '99' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 when the mesversario is missing', async () => {
      const res = await mesPUT(req('/api/mesversarios/x/meses/2', 'PUT', { status: 'ACORDADO' }), {
        params: Promise.resolve({ id: 'x', numero: '2' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 500 on a malformed body', async () => {
      const res = await mesPUT(badReq('/api/mesversarios/m1/meses/2', 'PUT'), {
        params: Promise.resolve({ id: 'm1', numero: '2' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('GET dashboard', () => {
    // Pin "today" before the seeded dates so their Feb/Dec milestones are
    // upcoming — getNextDueMes selects the nearest celebration still ahead.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 1, 9, 0, 0)); // 2025-01-01
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('flattens active babies to their next-due month, sorted by proximity', async () => {
      // A near (Feb) and far (Mar) next-due month across two babies.
      seedMesversario('m-near', {
        bebeNome: 'Perto',
        meses: [
          { numero: 1, dataComemoracao: '2025-02-15', status: 'PENDENTE' },
          { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
        ],
      });
      seedMesversario('m-far', {
        bebeNome: 'Longe',
        meses: [{ numero: 1, dataComemoracao: '2025-12-15', status: 'PENDENTE' }],
      });

      const res = await dashboardGET(req('/api/mesversarios/dashboard', 'GET'));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.length).toBe(2);
      // Sorted ascending by daysUntil: Perto (Feb) before Longe (Dec).
      expect(json.data[0].bebeNome).toBe('Perto');
      expect(json.data[0].numero).toBe(1);
      expect(json.data[0]).toHaveProperty('relativeLabel');
    });

    it('omits babies whose journey is settled', async () => {
      seedMesversario('m-done', {
        meses: [{ numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' }],
      });
      const res = await dashboardGET(req('/api/mesversarios/dashboard', 'GET'));
      const json = await res.json();
      expect(json.data).toHaveLength(0);
    });

    it('returns 403 without orders:view', async () => {
      currentAuth = { uid: 'p1', role: 'producao' };
      const res = await dashboardGET(req('/api/mesversarios/dashboard', 'GET'));
      expect(res.status).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const res = await dashboardGET(req('/api/mesversarios/dashboard', 'GET'));
      expect(res.status).toBe(401);
    });
  });
});
