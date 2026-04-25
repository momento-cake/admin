import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock firebase-admin before importing routes
const mockGet = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  },
}));

// Import routes after mocking
import { GET } from '@/app/api/public/pedidos/[token]/route';
import { POST } from '@/app/api/public/pedidos/[token]/confirmar/route';

// Helper to create a mock Firestore document
function createMockDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

// Helper to create params promise (Next.js 15 pattern)
function createParams(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

// Base pedido data factory
function createPedidoData(overrides: Record<string, unknown> = {}) {
  return {
    numeroPedido: 'PED-001',
    clienteNome: 'Maria Silva',
    status: 'AGUARDANDO_APROVACAO',
    publicToken: 'valid-token-123456',
    isActive: true,
    orcamentos: [
      {
        id: 'orc-1',
        versao: 1,
        isAtivo: true,
        status: 'ENVIADO',
        itens: [
          { id: 'item-1', nome: 'Bolo de Chocolate', precoUnitario: 50, quantidade: 1, total: 50 },
        ],
        subtotal: 50,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        total: 50,
      },
    ],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    dataEntrega: null,
    observacoesCliente: null,
    createdAt: { seconds: 1700000000, nanoseconds: 0 },
    updatedAt: { seconds: 1700000000, nanoseconds: 0 },
    ...overrides,
  };
}

describe('Public Pedidos API', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: mockCollection routes to different collections
    mockCollection.mockImplementation((name: string) => {
      if (name === 'pedidos') {
        return { where: mockWhere };
      }
      // storeAddresses and storeHours
      return {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [] }) })),
        })),
        orderBy: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: true, docs: [] }) })),
      };
    });

    // Default: where chain
    mockWhere.mockImplementation(() => ({
      where: mockWhere,
      limit: mockLimit,
      get: mockGet,
    }));
  });

  describe('GET /api/public/pedidos/[token]', () => {
    it('should return 400 for invalid tokens (< 10 chars)', async () => {
      const request = new NextRequest('http://localhost:4000/api/public/pedidos/short');
      const response = await GET(request, createParams('short'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent tokens', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/nonexistent-token-abc');
      const response = await GET(request, createParams('nonexistent-token-abc'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 for RASCUNHO status orders', async () => {
      const pedidoData = createPedidoData({ status: 'RASCUNHO' });
      mockGet.mockResolvedValue({
        empty: false,
        docs: [createMockDoc('pedido-1', pedidoData)],
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456');
      const response = await GET(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('disponível para visualização');
    });

    it('should return 403 for CANCELADO status orders', async () => {
      const pedidoData = createPedidoData({ status: 'CANCELADO' });
      mockGet.mockResolvedValue({
        empty: false,
        docs: [createMockDoc('pedido-1', pedidoData)],
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456');
      const response = await GET(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 200 for AGUARDANDO_APROVACAO orders', async () => {
      const pedidoData = createPedidoData({ status: 'AGUARDANDO_APROVACAO' });
      mockGet.mockResolvedValue({
        empty: false,
        docs: [createMockDoc('pedido-1', pedidoData)],
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456');
      const response = await GET(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('AGUARDANDO_APROVACAO');
      expect(data.data.numeroPedido).toBe('PED-001');
    });

    it('should return 200 for CONFIRMADO orders', async () => {
      const pedidoData = createPedidoData({ status: 'CONFIRMADO' });
      mockGet.mockResolvedValue({
        empty: false,
        docs: [createMockDoc('pedido-1', pedidoData)],
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456');
      const response = await GET(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('CONFIRMADO');
    });
  });

  describe('POST /api/public/pedidos/[token]/confirmar', () => {
    it('should return 400 for invalid tokens', async () => {
      const request = new NextRequest('http://localhost:4000/api/public/pedidos/short/confirmar', {
        method: 'POST',
      });
      const response = await POST(request, createParams('short'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent tokens', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/nonexistent-token-abc/confirmar', {
        method: 'POST',
      });
      const response = await POST(request, createParams('nonexistent-token-abc'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 200 and transition status to AGUARDANDO_PAGAMENTO for AGUARDANDO_APROVACAO orders', async () => {
      const pedidoData = createPedidoData({ status: 'AGUARDANDO_APROVACAO' });
      const mockDocRef = { id: 'pedido-1' };
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ ...createMockDoc('pedido-1', pedidoData), ref: mockDocRef }],
      });

      // Mock transaction: callback receives transaction object
      mockRunTransaction.mockImplementation(async (cb: (t: any) => Promise<any>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => pedidoData,
          }),
          update: mockUpdate,
        };
        return cb(transaction);
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456/confirmar', {
        method: 'POST',
      });
      const response = await POST(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('AGUARDANDO_PAGAMENTO');
      expect(mockUpdate).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({ status: 'AGUARDANDO_PAGAMENTO' })
      );
    });

    it('should return 400 for CONFIRMADO orders (already confirmed)', async () => {
      const pedidoData = createPedidoData({ status: 'CONFIRMADO' });
      const mockDocRef = { id: 'pedido-1' };
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ ...createMockDoc('pedido-1', pedidoData), ref: mockDocRef }],
      });

      // Transaction reads fresh data with CONFIRMADO status and throws
      mockRunTransaction.mockImplementation(async (cb: (t: any) => Promise<any>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => pedidoData,
          }),
          update: mockUpdate,
        };
        return cb(transaction);
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456/confirmar', {
        method: 'POST',
      });
      const response = await POST(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('não pode ser confirmado');
    });

    it('should return 400 for RASCUNHO orders', async () => {
      const pedidoData = createPedidoData({ status: 'RASCUNHO' });
      const mockDocRef = { id: 'pedido-1' };
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ ...createMockDoc('pedido-1', pedidoData), ref: mockDocRef }],
      });

      mockRunTransaction.mockImplementation(async (cb: (t: any) => Promise<any>) => {
        const transaction = {
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => pedidoData,
          }),
          update: mockUpdate,
        };
        return cb(transaction);
      });

      const request = new NextRequest('http://localhost:4000/api/public/pedidos/valid-token-123456/confirmar', {
        method: 'POST',
      });
      const response = await POST(request, createParams('valid-token-123456'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
