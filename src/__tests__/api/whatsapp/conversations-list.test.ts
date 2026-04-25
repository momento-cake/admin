/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firestore admin mock ---------------------------------------------------
const mockGet = vi.fn();
let mockedDocs: Array<{ id: string; data: () => any }> = [];

const mockOrderBy = vi.fn(() => ({ get: mockGet, orderBy: mockOrderBy }));
const mockWhere: any = vi.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  get: mockGet,
}));
const mockCollection = vi.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  get: mockGet,
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => mockCollection(name),
  },
  adminAuth: {},
}));

// ---- api-auth mock ----------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return {
    ...actual,
    getAuthFromRequest: vi.fn(async () => currentAuth),
  };
});

import { GET } from '@/app/api/whatsapp/conversations/route';

function makeRequest(url = 'http://localhost:4000/api/whatsapp/conversations') {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  mockGet.mockReset();
  mockedDocs = [];
  mockGet.mockImplementation(async () => ({ docs: mockedDocs }));
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockCollection.mockClear();
  currentAuth = null;
});

describe('GET /api/whatsapp/conversations', () => {
  it('returns 401 when unauthenticated', async () => {
    currentAuth = null;
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao (no whatsapp permission)', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns 200 + conversations for atendente', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    mockedDocs = [
      {
        id: '5511999999999',
        data: () => ({
          phone: '5511999999999',
          phoneRaw: '5511999999999',
          lastMessageAt: { seconds: 100, nanoseconds: 0 },
          lastMessagePreview: 'oi',
          lastMessageDirection: 'in',
          unreadCount: 1,
        }),
      },
    ];

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('5511999999999');
    expect(json.total).toBe(1);
  });

  it('admin always allowed', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockedDocs = [];
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('filters by clienteId query param using a where clause', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockedDocs = [];

    await GET(makeRequest('http://localhost:4000/api/whatsapp/conversations?clienteId=cli-1'));
    const calls = (mockWhere as any).mock.calls;
    const found = calls.some((args: any[]) => args[0] === 'clienteId' && args[1] === '==' && args[2] === 'cli-1');
    expect(found).toBe(true);
  });

  it('filters by search substring on clienteNome', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockedDocs = [
      {
        id: 'a',
        data: () => ({
          phone: '5511',
          phoneRaw: '5511',
          clienteNome: 'Maria Silva',
          lastMessageAt: { seconds: 1, nanoseconds: 0 },
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
        }),
      },
      {
        id: 'b',
        data: () => ({
          phone: '5522',
          phoneRaw: '5522',
          clienteNome: 'João',
          lastMessageAt: { seconds: 1, nanoseconds: 0 },
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
        }),
      },
    ];

    const res = await GET(makeRequest('http://localhost:4000/api/whatsapp/conversations?search=maria'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('a');
  });

  it('caps the limit at 200 even if larger value is given', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockedDocs = [];
    const res = await GET(makeRequest('http://localhost:4000/api/whatsapp/conversations?limit=10000'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.limit).toBeLessThanOrEqual(200);
  });

  it('returns 500 when Firestore throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
