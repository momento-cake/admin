/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

import { GET } from '@/app/api/public/pedidos/[token]/payment-status/route';

const VALID_TOKEN = 'valid-token-1234567890';

function makeReq() {
  return new NextRequest(
    `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/payment-status`,
  );
}

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

function seedDoc(data: Record<string, unknown>) {
  mockGet.mockResolvedValue({
    empty: false,
    docs: [{ id: 'p1', data: () => data }],
  });
}

describe('GET /api/public/pedidos/[token]/payment-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
  });

  it('returns 400 for short tokens', async () => {
    const res = await GET(makeReq(), createParams('short'));
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown token', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await GET(makeReq(), createParams(VALID_TOKEN));
    expect(res.status).toBe(404);
  });

  it('returns null session when none exists', async () => {
    seedDoc({
      status: 'AGUARDANDO_PAGAMENTO',
      pagamentos: [],
    });
    const res = await GET(makeReq(), createParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('AGUARDANDO_PAGAMENTO');
    expect(body.data.paymentSession).toBeNull();
    expect(body.data.paidAt).toBeNull();
  });

  it('returns pending session details (status, method, expiresAt)', async () => {
    const expiresAt = { seconds: 1, nanoseconds: 0 };
    seedDoc({
      status: 'AGUARDANDO_PAGAMENTO',
      pagamentos: [],
      paymentSession: {
        status: 'PENDING',
        method: 'PIX',
        providerCustomerId: 'cus_secret',
        expiresAt,
      },
    });
    const res = await GET(makeReq(), createParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.paymentSession.status).toBe('PENDING');
    expect(body.data.paymentSession.method).toBe('PIX');
    expect(body.data.paymentSession.expiresAt).toEqual(expiresAt);
    // Sensitive fields aren't leaked
    expect(body.data.paymentSession.providerCustomerId).toBeUndefined();
  });

  it('handles a session with only status (no method or expiresAt)', async () => {
    seedDoc({
      status: 'AGUARDANDO_PAGAMENTO',
      pagamentos: [],
      paymentSession: { status: 'PENDING' },
    });
    const res = await GET(makeReq(), createParams(VALID_TOKEN));
    const body = await res.json();
    expect(body.data.paymentSession.status).toBe('PENDING');
    expect(body.data.paymentSession.method).toBeNull();
    expect(body.data.paymentSession.expiresAt).toBeNull();
  });

  it('returns paidAt as the latest pagamento.data when fully paid', async () => {
    const lastPaymentDate = { seconds: 12345, nanoseconds: 0 };
    seedDoc({
      status: 'CONFIRMADO',
      pagamentos: [
        { id: 'pa-1', data: { seconds: 1, nanoseconds: 0 }, valor: 100, metodo: 'PIX' },
        { id: 'pa-2', data: lastPaymentDate, valor: 100, metodo: 'PIX' },
      ],
      paymentSession: { status: 'CONFIRMED', method: 'PIX' },
    });
    const res = await GET(makeReq(), createParams(VALID_TOKEN));
    const body = await res.json();
    expect(body.data.status).toBe('CONFIRMADO');
    expect(body.data.paidAt).toEqual(lastPaymentDate);
    expect(body.data.paymentSession.status).toBe('CONFIRMED');
  });
});
