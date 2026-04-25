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

let nextId = 1;
const collectionSpy = vi.fn((name: string) => ({
  doc: (id: string) => makeDocRef(`${name}/${id}`),
  add: vi.fn(async (data: DocData) => {
    const id = `${name}-auto-${nextId++}`;
    store.set(`${name}/${id}`, data);
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

type MockAuth = {
  uid: string;
  role: 'admin' | 'atendente' | 'producao';
  customPermissions?: Record<string, { enabled: boolean; actions: string[] }>;
};
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { POST } from '@/app/api/whatsapp/conversations/[id]/quick-create-client/route';

function makeReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost:4000/api/whatsapp/conversations/${id}/quick-create-client`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  );
}

beforeEach(() => {
  store.clear();
  nextId = 1;
  currentAuth = null;
});

describe('POST /api/whatsapp/conversations/[id]/quick-create-client', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await POST(makeReq('5511999999999', { name: 'Maria' }), {
      params: Promise.resolve({ id: '5511999999999' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao (no whatsapp permission)', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await POST(makeReq('5511999999999', { name: 'Maria' }), {
      params: Promise.resolve({ id: '5511999999999' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid name', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511999999999', {
      phone: '5511999999999',
    });
    const res = await POST(makeReq('5511999999999', { name: 'M' }), {
      params: Promise.resolve({ id: '5511999999999' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the conversation does not exist', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    const res = await POST(makeReq('missing', { name: 'Maria' }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('creates a personal client and links the conversation', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511999999999', {
      phone: '5511999999999',
      phoneRaw: '5511999999999@s.whatsapp.net',
    });

    const res = await POST(makeReq('5511999999999', { name: 'Maria Silva' }), {
      params: Promise.resolve({ id: '5511999999999' }),
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.client).toBeDefined();
    expect(json.data.client.name).toBe('Maria Silva');
    expect(json.data.client.type).toBe('person');
    expect(json.data.client.phone).toBe('5511999999999');
    expect(json.data.client.contactMethods).toHaveLength(1);
    expect(json.data.client.contactMethods[0].type).toBe('whatsapp');
    expect(json.data.client.contactMethods[0].value).toBe('5511999999999');
    expect(json.data.client.contactMethods[0].isPrimary).toBe(true);

    expect(json.data.conversation.clienteId).toBe(json.data.client.id);
    expect(json.data.conversation.clienteNome).toBe('Maria Silva');

    // Conversation in store has the link too
    const updatedConvo = store.get('whatsapp_conversations/5511999999999');
    expect(updatedConvo?.clienteId).toBe(json.data.client.id);
    expect(updatedConvo?.clienteNome).toBe('Maria Silva');
  });

  it('admin allowed', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });
    const res = await POST(makeReq('5511', { name: 'Test' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(201);
  });

  it('returns 400 if conversation has no phone', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', {});
    const res = await POST(makeReq('5511', { name: 'Maria' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 500 when Firestore throws unexpectedly', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    collectionSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const res = await POST(makeReq('5511', { name: 'Maria' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(500);
  });
});
