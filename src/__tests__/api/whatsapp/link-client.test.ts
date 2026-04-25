/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

type DocData = Record<string, any>;
const store = new Map<string, DocData>();

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop()!,
    get: vi.fn(async () => {
      const data = store.get(path);
      return {
        exists: data !== undefined,
        data: () => data,
        id: path.split('/').pop()!,
      };
    }),
    update: vi.fn(async (payload: DocData) => {
      const existing = store.get(path) ?? {};
      store.set(path, { ...existing, ...payload });
    }),
  };
}

const collectionSpy = vi.fn((name: string) => ({
  doc: (id: string) => makeDocRef(`${name}/${id}`),
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

import { POST } from '@/app/api/whatsapp/conversations/[id]/link-client/route';

function makeReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/whatsapp/conversations/${id}/link-client`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  store.clear();
  currentAuth = null;
});

describe('POST /api/whatsapp/conversations/[id]/link-client', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await POST(makeReq('5511', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await POST(makeReq('5511', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (missing clientId)', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511' });
    const res = await POST(makeReq('5511', {}), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the conversation does not exist', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('clients/cli-1', { name: 'Maria', isActive: true });
    const res = await POST(makeReq('missing', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when the client does not exist', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511' });
    const res = await POST(makeReq('5511', { clientId: 'nope' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates the conversation with clienteId and denormalized clienteNome', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });
    store.set('clients/cli-1', { name: 'Maria Silva', isActive: true });

    const res = await POST(makeReq('5511', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.clienteId).toBe('cli-1');
    expect(json.data.clienteNome).toBe('Maria Silva');

    const updated = store.get('whatsapp_conversations/5511');
    expect(updated?.clienteId).toBe('cli-1');
    expect(updated?.clienteNome).toBe('Maria Silva');
  });

  it('admin allowed', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });
    store.set('clients/cli-1', { name: 'Maria', isActive: true });

    const res = await POST(makeReq('5511', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 500 when Firestore throws unexpectedly', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    // Force collection to throw on any call
    collectionSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await POST(makeReq('5511', { clientId: 'cli-1' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(500);
  });
});
