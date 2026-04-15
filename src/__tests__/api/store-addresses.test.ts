/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firebase admin mock ----------------------------------------------------
const mockGet = vi.fn();
const mockAdd = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatch = vi.fn(() => ({
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}));
const mockOrderBy = vi.fn(() => ({ get: mockGet }));
const mockWhere: any = vi.fn(() => ({
  where: mockWhere,
  orderBy: mockOrderBy,
  get: mockGet,
}));
const mockCollection = vi.fn(() => ({
  where: mockWhere,
  add: mockAdd,
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
    batch: () => mockBatch(),
  },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

// ---- api-auth mock ----------------------------------------------------------
type MockAuth = {
  uid: string;
  role: 'admin' | 'atendente' | 'producao';
  customPermissions?: Record<string, { enabled: boolean; actions: string[] }>;
};

let currentAuth: MockAuth | null = null;

vi.mock('@/lib/api-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-auth')>(
    '@/lib/api-auth'
  );
  return {
    ...actual,
    getAuthFromRequest: vi.fn(async () => currentAuth),
  };
});

import * as apiAuth from '@/lib/api-auth';
import { GET, POST } from '@/app/api/store-addresses/route';

const VALID_ADDRESS_BODY = {
  nome: 'Loja Principal',
  cep: '01310100',
  estado: 'SP',
  cidade: 'São Paulo',
  bairro: 'Bela Vista',
  endereco: 'Av. Paulista',
  numero: '1000',
  isDefault: false,
};

function makeRequest(method: 'GET' | 'POST' = 'GET', body?: unknown) {
  return new NextRequest('http://localhost:3001/api/store-addresses', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('API /api/store-addresses permissions', () => {
  beforeEach(() => {
    // Clear call history and pending mockResolvedValueOnce/mockRejectedValueOnce
    // queues from previous tests so each test starts fresh.
    mockGet.mockReset();
    mockAdd.mockReset();
    mockBatchUpdate.mockReset();
    mockBatchCommit.mockReset();
    mockBatch.mockClear();
    mockWhere.mockClear();
    mockOrderBy.mockClear();
    mockCollection.mockClear();
    // Re-anchor the authenticated user to whatever the test sets before calling.
    currentAuth = null;
    vi.mocked(apiAuth.getAuthFromRequest).mockImplementation(async () => currentAuth as any);
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const response = await GET(makeRequest('GET'));
      expect(response.status).toBe(401);
    });

    it('returns 200 for admin (settings:view)', async () => {
      currentAuth = { uid: 'admin-1', role: 'admin' };
      mockGet.mockResolvedValueOnce({
        docs: [
          { id: 'addr-1', data: () => ({ label: 'Loja 1', isActive: true }) },
        ],
      });

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([
        { id: 'addr-1', label: 'Loja 1', isActive: true },
      ]);
    });

    it('returns 200 for atendente (orders:view grants access)', async () => {
      currentAuth = { uid: 'atendente-1', role: 'atendente' };
      mockGet.mockResolvedValueOnce({
        docs: [
          { id: 'addr-1', data: () => ({ label: 'Loja 1', isActive: true }) },
          { id: 'addr-2', data: () => ({ label: 'Loja 2', isActive: true }) },
        ],
      });

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it('returns 403 for producao (no settings:view and no orders:view)', async () => {
      currentAuth = { uid: 'producao-1', role: 'producao' };

      const response = await GET(makeRequest('GET'));
      expect(response.status).toBe(403);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('returns 500 when Firestore throws', async () => {
      currentAuth = { uid: 'admin-2', role: 'admin' };
      mockGet.mockRejectedValueOnce(new Error('Firestore exploded'));

      const response = await GET(makeRequest('GET'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      currentAuth = null;
      const response = await POST(makeRequest('POST', VALID_ADDRESS_BODY));
      expect(response.status).toBe(401);
    });

    it('returns 403 for atendente (no settings:update)', async () => {
      currentAuth = { uid: 'atendente-2', role: 'atendente' };
      const response = await POST(makeRequest('POST', VALID_ADDRESS_BODY));
      expect(response.status).toBe(403);
    });

    it('returns 403 for producao (no settings:update)', async () => {
      currentAuth = { uid: 'producao-2', role: 'producao' };
      const response = await POST(makeRequest('POST', VALID_ADDRESS_BODY));
      expect(response.status).toBe(403);
    });

    it('allows admin to create a store address', async () => {
      currentAuth = { uid: 'admin-3', role: 'admin' };
      mockAdd.mockResolvedValueOnce({ id: 'new-addr-1' });

      const response = await POST(makeRequest('POST', VALID_ADDRESS_BODY));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('new-addr-1');
      expect(mockAdd).toHaveBeenCalled();
    });

    it('returns 400 for invalid payload', async () => {
      currentAuth = { uid: 'admin-4', role: 'admin' };
      const response = await POST(
        makeRequest('POST', { nome: '' } as any)
      );
      expect(response.status).toBe(400);
    });

    it('clears existing defaults when admin creates a default address', async () => {
      currentAuth = { uid: 'admin-5', role: 'admin' };
      // First .where(...).where(...).get() lookup for existing defaults
      mockGet.mockResolvedValueOnce({
        docs: [
          { ref: { id: 'old-default-1' } },
          { ref: { id: 'old-default-2' } },
        ],
      });
      mockBatchCommit.mockResolvedValueOnce(undefined);
      mockAdd.mockResolvedValueOnce({ id: 'new-default' });

      const response = await POST(
        makeRequest('POST', { ...VALID_ADDRESS_BODY, isDefault: true })
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      // Both existing defaults should have been updated to isDefault=false
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalled();
    });

    it('returns 500 when Firestore add fails during POST', async () => {
      currentAuth = { uid: 'admin-6', role: 'admin' };
      mockAdd.mockRejectedValueOnce(new Error('write failed'));

      const response = await POST(makeRequest('POST', VALID_ADDRESS_BODY));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
