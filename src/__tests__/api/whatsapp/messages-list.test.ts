/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firestore admin mock ---------------------------------------------------
const mockGet = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockOrderBy = vi.fn(() => ({ get: mockGet, limit: mockLimit }));
const mockWhere: any = vi.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  get: mockGet,
  limit: mockLimit,
}));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (name: string) => mockCollection(name) },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({ seconds: Math.floor(ms / 1000), nanoseconds: 0 }),
    fromDate: (d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
  },
}));

// ---- api-auth mock ----------------------------------------------------------
type MockAuth = { uid: string; role: 'admin' | 'atendente' | 'producao' };
let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>('@/lib/api-auth');
  return { ...actual, getAuthFromRequest: vi.fn(async () => currentAuth) };
});

import { GET } from '@/app/api/whatsapp/conversations/[id]/messages/route';

function makeRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

beforeEach(() => {
  mockGet.mockReset();
  mockLimit.mockClear();
  mockOrderBy.mockClear();
  mockWhere.mockClear();
  mockCollection.mockClear();
  currentAuth = null;
});

describe('GET /api/whatsapp/conversations/[id]/messages', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages'),
      { params: Promise.resolve({ id: 'abc' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for producao', async () => {
    currentAuth = { uid: 'p', role: 'producao' };
    const res = await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages'),
      { params: Promise.resolve({ id: 'abc' }) }
    );
    expect(res.status).toBe(403);
  });

  it('returns messages for atendente, ordered asc by timestamp', async () => {
    currentAuth = { uid: 'a', role: 'atendente' };
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: 'm1',
          data: () => ({
            conversationId: '5511999',
            whatsappMessageId: 'wa-1',
            direction: 'in',
            type: 'text',
            text: 'oi',
            timestamp: { seconds: 100, nanoseconds: 0 },
            createdAt: { seconds: 100, nanoseconds: 0 },
          }),
        },
      ],
    });

    const res = await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/5511999/messages'),
      { params: Promise.resolve({ id: '5511999' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('m1');

    // Should have queried by conversationId
    const calls = (mockWhere as any).mock.calls;
    const hasConvId = calls.some(
      (a: any[]) => a[0] === 'conversationId' && a[1] === '==' && a[2] === '5511999'
    );
    expect(hasConvId).toBe(true);
    // Should have ordered by timestamp asc
    expect(mockOrderBy).toHaveBeenCalledWith('timestamp', 'asc');
  });

  it('honors a custom limit and caps at 500', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ docs: [] });

    await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages?limit=10000'),
      { params: Promise.resolve({ id: 'abc' }) }
    );

    const limitCalls = (mockLimit as any).mock.calls;
    expect(limitCalls.length).toBeGreaterThan(0);
    const passed = limitCalls[0][0];
    expect(passed).toBeLessThanOrEqual(500);
  });

  it('uses default limit when not provided', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ docs: [] });

    await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages'),
      { params: Promise.resolve({ id: 'abc' }) }
    );

    const limitCalls = (mockLimit as any).mock.calls;
    expect(limitCalls.length).toBeGreaterThan(0);
    expect(limitCalls[0][0]).toBe(100);
  });

  it('applies a "before" cursor when provided', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ docs: [] });

    await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages?before=1700000000000'),
      { params: Promise.resolve({ id: 'abc' }) }
    );

    const calls = (mockWhere as any).mock.calls;
    const hasBefore = calls.some((a: any[]) => a[0] === 'timestamp' && (a[1] === '<' || a[1] === '<='));
    expect(hasBefore).toBe(true);
  });

  it('returns 500 when Firestore throws', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockRejectedValueOnce(new Error('boom'));
    const res = await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages'),
      { params: Promise.resolve({ id: 'abc' }) }
    );
    expect(res.status).toBe(500);
  });

  it('returns 400 when id is empty', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    const res = await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations//messages'),
      { params: Promise.resolve({ id: '' }) }
    );
    expect(res.status).toBe(400);
  });

  it('falls back to default limit on a non-numeric value', async () => {
    currentAuth = { uid: 'admin', role: 'admin' };
    mockGet.mockResolvedValueOnce({ docs: [] });
    await GET(
      makeRequest('http://localhost:4000/api/whatsapp/conversations/abc/messages?limit=abc'),
      { params: Promise.resolve({ id: 'abc' }) }
    );
    const limitCalls = (mockLimit as any).mock.calls;
    expect(limitCalls[0][0]).toBe(100);
  });
});
