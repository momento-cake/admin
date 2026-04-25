/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- In-memory Firestore mock ---------------------------------------------
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

const addedDocs: DocData[] = [];
const collectionSpy = vi.fn((name: string) => ({
  doc: (id: string) => makeDocRef(`${name}/${id}`),
  add: vi.fn(async (data: DocData) => {
    const id = `auto-${addedDocs.length + 1}`;
    store.set(`${name}/${id}`, data);
    addedDocs.push({ ...data, __id: id, __collection: name });
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

// ---- api-auth mock --------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { POST } from '@/app/api/whatsapp/conversations/[id]/send/route';

function makeReq(id: string, body: unknown) {
  return new NextRequest(`http://localhost:4000/api/whatsapp/conversations/${id}/send`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  store.clear();
  addedDocs.length = 0;
  currentAuth = null;
});

describe('POST /api/whatsapp/conversations/[id]/send', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await POST(makeReq('5511', { text: 'oi' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await POST(makeReq('5511', { text: 'oi' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body (empty text)', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511' });
    const res = await POST(makeReq('5511', { text: '' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the conversation does not exist', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    const res = await POST(makeReq('missing', { text: 'oi' }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('writes an outbox doc with status=pending and returns 201', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });

    const res = await POST(makeReq('5511', { text: 'olá' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.conversationId).toBe('5511');
    expect(json.data.text).toBe('olá');
    expect(json.data.status).toBe('pending');
    expect(json.data.attempts).toBe(0);
    expect(json.data.authorUserId).toBe('a');
    expect(json.data.to).toBe('5511999999999');

    const outboxDocs = addedDocs.filter((d) => d.__collection === 'whatsapp_outbox');
    expect(outboxDocs).toHaveLength(1);
    expect(outboxDocs[0].status).toBe('pending');
    expect(outboxDocs[0].text).toBe('olá');
  });

  it('admin can also send', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });
    const res = await POST(makeReq('5511', { text: 'olá' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(201);
  });

  it('trims whitespace from text', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });
    const res = await POST(makeReq('5511', { text: '   olá   ' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.text).toBe('olá');
  });

  it('returns 400 when conversation has no phone', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { /* no phone */ });
    const res = await POST(makeReq('5511', { text: 'oi' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 500 when Firestore .add throws', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    store.set('whatsapp_conversations/5511', { phone: '5511999999999' });

    // Re-mock the next collection() call to make .add reject.
    const originalImpl = collectionSpy.getMockImplementation();
    collectionSpy.mockImplementationOnce((name: string) => ({
      doc: (id: string) => makeDocRef(`${name}/${id}`),
      add: vi.fn(async () => {
        throw new Error('boom');
      }),
    }));
    // First call (lookup of conversation) is fine — re-add original after.
    // Actually since collection is called with 'whatsapp_conversations' first,
    // we want the SECOND call (whatsapp_outbox) to fail. Restore now and
    // override only on the next call.
    if (originalImpl) collectionSpy.mockImplementation(originalImpl);
    const calls: string[] = [];
    collectionSpy.mockImplementation((name: string) => {
      calls.push(name);
      if (name === 'whatsapp_outbox') {
        return {
          doc: (id: string) => makeDocRef(`${name}/${id}`),
          add: vi.fn(async () => {
            throw new Error('boom');
          }),
        };
      }
      return {
        doc: (id: string) => makeDocRef(`${name}/${id}`),
        add: vi.fn(),
      };
    });

    const res = await POST(makeReq('5511', { text: 'oi' }), {
      params: Promise.resolve({ id: '5511' }),
    });
    expect(res.status).toBe(500);
  });
});
