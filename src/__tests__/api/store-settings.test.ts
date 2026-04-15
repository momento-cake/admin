/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firebase admin mock ----------------------------------------------------
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

// ---- api-auth mock ----------------------------------------------------------
// We mock the whole module so tests can toggle the authenticated user's role.
type MockAuth = {
  uid: string;
  role: 'admin' | 'atendente' | 'producao';
  customPermissions?: Record<string, { enabled: boolean; actions: string[] }>;
};

let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  // Use the REAL canPerformActionFromRequest so we exercise the same logic
  // the production API uses.
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>(
    '@/lib/api-auth'
  );
  return {
    ...actual,
    getAuthFromRequest: vi.fn(async () => currentAuth),
  };
});

// Import routes after mocks are set up
import * as apiAuth from '@/lib/api-auth';
import { GET, PUT } from '@/app/api/store-settings/route';

function makeRequest(method: 'GET' | 'PUT' = 'GET', body?: unknown) {
  return new NextRequest('http://localhost:3001/api/store-settings', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('API /api/store-settings permissions', () => {
  beforeEach(() => {
    // Clear any queued mockResolvedValueOnce/mockRejectedValueOnce so tests
    // can't leak state between each other.
    mockGet.mockReset();
    mockSet.mockReset();
    mockDoc.mockClear();
    mockCollection.mockClear();
    currentAuth = null;
    vi.mocked(apiAuth.getAuthFromRequest).mockImplementation(async () => currentAuth as any);
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const response = await GET(makeRequest('GET'));
      expect(response.status).toBe(401);
    });

    it('returns 200 when user has settings:view (admin)', async () => {
      currentAuth = { uid: 'admin-1', role: 'admin' };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ custoPorKm: 5.5 }),
      });

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ custoPorKm: 5.5 });
    });

    it('returns 200 with defaults when user has orders:view but settings doc is missing (atendente)', async () => {
      currentAuth = { uid: 'atendente-1', role: 'atendente' };
      mockGet.mockResolvedValueOnce({ exists: false });

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ custoPorKm: 4.5 });
    });

    it('returns 200 for atendente with stored settings (orders:view permission grants access)', async () => {
      currentAuth = { uid: 'atendente-2', role: 'atendente' };
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ custoPorKm: 6.25 }),
      });

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ custoPorKm: 6.25 });
    });

    it('returns 403 when user has neither orders:view nor settings:view (producao)', async () => {
      currentAuth = { uid: 'producao-1', role: 'producao' };

      const response = await GET(makeRequest('GET'));
      expect(response.status).toBe(403);
      // Should not have touched the database
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('returns 500 when Firestore throws', async () => {
      currentAuth = { uid: 'admin-2', role: 'admin' };
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const response = await PUT(makeRequest('PUT', { custoPorKm: 5 }));
      expect(response.status).toBe(401);
    });

    it('returns 403 for atendente (no settings:update)', async () => {
      currentAuth = { uid: 'atendente-3', role: 'atendente' };
      const response = await PUT(makeRequest('PUT', { custoPorKm: 5 }));
      expect(response.status).toBe(403);
    });

    it('returns 403 for producao (no settings:update)', async () => {
      currentAuth = { uid: 'producao-2', role: 'producao' };
      const response = await PUT(makeRequest('PUT', { custoPorKm: 5 }));
      expect(response.status).toBe(403);
    });

    it('allows admin to update store settings', async () => {
      currentAuth = { uid: 'admin-3', role: 'admin' };
      mockSet.mockResolvedValueOnce(undefined);

      const response = await PUT(makeRequest('PUT', { custoPorKm: 7.25 }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.custoPorKm).toBe(7.25);
      expect(mockSet).toHaveBeenCalled();
    });

    it('validates body and returns 400 on invalid input', async () => {
      currentAuth = { uid: 'admin-4', role: 'admin' };
      const response = await PUT(makeRequest('PUT', { custoPorKm: -5 }));
      expect(response.status).toBe(400);
    });

    it('returns 500 when Firestore set() throws during PUT', async () => {
      currentAuth = { uid: 'admin-5', role: 'admin' };
      mockSet.mockRejectedValueOnce(new Error('write failure'));

      const response = await PUT(makeRequest('PUT', { custoPorKm: 5 }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
