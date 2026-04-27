/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

type DocData = Record<string, any>;
const store = new Map<string, DocData>();
const collectionDocs = new Map<string, DocData[]>();
const addedDocs = new Map<string, DocData[]>();

function makeQuery(name: string) {
  let docs = (collectionDocs.get(name) ?? []).slice();
  const api: any = {
    where: vi.fn((field: string, op: string, value: unknown) => {
      if (op === '==') {
        docs = docs.filter((d) => d[field] === value);
      } else if (op === '!=') {
        docs = docs.filter((d) => d[field] !== value);
      }
      return api;
    }),
    get: vi.fn(async () => ({
      empty: docs.length === 0,
      docs: docs.map((d) => ({ id: d.id, data: () => d })),
      size: docs.length,
    })),
    limit: vi.fn(() => api),
  };
  return api;
}

const collectionSpy = vi.fn((name: string) => ({
  where: (...args: unknown[]) => makeQuery(name).where(...args),
  get: () => makeQuery(name).get(),
  doc: (id: string) => ({
    id,
    get: vi.fn(async () => {
      const d = store.get(`${name}/${id}`);
      return { exists: d !== undefined, data: () => d, id };
    }),
    set: vi.fn(async (data: DocData) => {
      store.set(`${name}/${id}`, { ...data, id });
    }),
    update: vi.fn(async (data: DocData) => {
      const existing = store.get(`${name}/${id}`) ?? {};
      store.set(`${name}/${id}`, { ...existing, ...data });
    }),
  }),
  add: vi.fn(async (data: DocData) => {
    const id = `auto-${(addedDocs.get(name)?.length ?? 0) + 1}`;
    if (!addedDocs.has(name)) addedDocs.set(name, []);
    addedDocs.get(name)!.push({ ...data, id });
    store.set(`${name}/${id}`, { ...data, id });
    return { id };
  }),
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (n: string) => collectionSpy(n) },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}));

type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { POST } from '@/app/api/whatsapp/sync-clients/route';

function makeReq() {
  return new NextRequest('http://localhost:4000/api/whatsapp/sync-clients', {
    method: 'POST',
  });
}

beforeEach(() => {
  store.clear();
  collectionDocs.clear();
  addedDocs.clear();
  currentAuth = null;
});

describe('POST /api/whatsapp/sync-clients', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not admin', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it('returns 403 for producao role', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it('admin creates a sync job from active clients (top-level phone)', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      { id: 'cli-1', name: 'Maria', phone: '5511999999999', isActive: true },
      { id: 'cli-2', name: 'João', phone: '11888888888', isActive: true },
    ]);

    const res = await POST(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.jobId).toBeTruthy();
    expect(json.data.phoneCount).toBe(2);

    const jobs = addedDocs.get('whatsapp_sync_jobs') ?? [];
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    expect(job.status).toBe('pending');
    expect(job.phones).toEqual(expect.arrayContaining(['5511999999999', '5511888888888']));
    expect(job.clientsByPhone['5511999999999']).toEqual({ id: 'cli-1', name: 'Maria' });
  });

  it('skips inactive clients', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      { id: 'cli-1', name: 'Maria', phone: '5511999999999', isActive: true },
      { id: 'cli-2', name: 'Inativo', phone: '5511777777777', isActive: false },
    ]);

    const res = await POST(makeReq());
    const json = await res.json();
    expect(json.data.phoneCount).toBe(1);
    const job = (addedDocs.get('whatsapp_sync_jobs') ?? [])[0];
    expect(job.phones).toEqual(['5511999999999']);
  });

  it('extracts phones from contactMethods (whatsapp/phone types)', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      {
        id: 'cli-1',
        name: 'Maria',
        isActive: true,
        contactMethods: [
          { type: 'whatsapp', value: '5511999999999' },
          { type: 'email', value: 'maria@example.com' },
        ],
      },
      {
        id: 'cli-2',
        name: 'João',
        isActive: true,
        contactMethods: [{ type: 'phone', value: '11888888888' }],
      },
    ]);

    const res = await POST(makeReq());
    const json = await res.json();
    expect(json.data.phoneCount).toBe(2);
  });

  it('deduplicates phones across clients (last wins for clientsByPhone)', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      { id: 'cli-1', name: 'Maria A', phone: '5511999999999', isActive: true },
      { id: 'cli-2', name: 'Maria B', phone: '11999999999', isActive: true }, // same after normalize
    ]);

    const res = await POST(makeReq());
    const json = await res.json();
    expect(json.data.phoneCount).toBe(1);
    const job = (addedDocs.get('whatsapp_sync_jobs') ?? [])[0];
    expect(job.phones).toEqual(['5511999999999']);
  });

  it('skips clients with unparseable phone', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      { id: 'cli-1', name: 'X', phone: 'garbage', isActive: true },
      { id: 'cli-2', name: 'Y', phone: '5511999999999', isActive: true },
    ]);

    const res = await POST(makeReq());
    const json = await res.json();
    expect(json.data.phoneCount).toBe(1);
  });

  it('returns 200 with phoneCount=0 when no active clients have phones', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionDocs.set('clients', [
      { id: 'cli-1', name: 'NoPhone', isActive: true },
    ]);
    const res = await POST(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.phoneCount).toBe(0);
    // Job is still created so the UI can show "0 contatos sincronizáveis."
    const jobs = addedDocs.get('whatsapp_sync_jobs') ?? [];
    expect(jobs).toHaveLength(1);
  });

  it('returns 500 when Firestore throws unexpectedly', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    collectionSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});
