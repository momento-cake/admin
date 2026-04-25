/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Same mock skeleton as the existing public-pedidos-api test.
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
}));

import { POST } from '@/app/api/public/pedidos/[token]/confirmar/route';

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_TOKEN = 'valid-token-1234567890';

const pedidoData = {
  numeroPedido: 'PED-001',
  clienteNome: 'Maria',
  status: 'AGUARDANDO_APROVACAO',
  publicToken: VALID_TOKEN,
  isActive: true,
  orcamentos: [
    {
      id: 'o1',
      isAtivo: true,
      itens: [],
      total: 100,
    },
  ],
  entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
  dataEntrega: null,
  observacoesCliente: null,
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
};

describe('POST /api/public/pedidos/[token]/confirmar — checkout transition', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCollection.mockImplementation((name: string) => {
      if (name === 'pedidos') return { where: mockWhere };
      // store collections (addresses/hours)
      return {
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [] }) })),
        })),
        orderBy: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ empty: true, docs: [] }) })),
      };
    });

    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
  });

  it('transitions an AGUARDANDO_APROVACAO pedido to AGUARDANDO_PAGAMENTO', async () => {
    const docRef = { id: 'p1' };
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'p1', ref: docRef, data: () => pedidoData }],
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

    const req = new NextRequest(
      `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/confirmar`,
      { method: 'POST' },
    );
    const res = await POST(req, createParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('AGUARDANDO_PAGAMENTO');

    expect(mockUpdate).toHaveBeenCalledWith(
      docRef,
      expect.objectContaining({ status: 'AGUARDANDO_PAGAMENTO' }),
    );
  });
});
