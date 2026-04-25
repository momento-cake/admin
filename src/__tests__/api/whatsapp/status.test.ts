/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (n: string) => mockCollection(n) },
  adminAuth: {},
}));

type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { GET } from '@/app/api/whatsapp/status/route';

function makeReq() {
  return new NextRequest('http://localhost:4000/api/whatsapp/status', { method: 'GET' });
}

beforeEach(() => {
  mockGet.mockReset();
  mockDoc.mockClear();
  mockCollection.mockClear();
  currentAuth = null;
});

describe('GET /api/whatsapp/status', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it('returns the status doc for atendente', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    mockGet.mockResolvedValueOnce({
      exists: true,
      id: 'primary',
      data: () => ({
        instanceId: 'primary',
        state: 'connected',
        updatedAt: { seconds: 1, nanoseconds: 0 },
      }),
    });

    const res = await GET(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.state).toBe('connected');
    expect(json.data.id).toBe('primary');
  });

  it('returns null data when status doc is missing', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ exists: false });

    const res = await GET(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
  });

  it('returns 500 when Firestore throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
