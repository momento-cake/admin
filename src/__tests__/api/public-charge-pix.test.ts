/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    fromDate: (d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    }),
  },
}));

const ensureCustomerMock = vi.fn();
const createPixChargeMock = vi.fn();

vi.mock('@/lib/payments/registry', () => ({
  getPaymentProvider: () => ({
    name: 'asaas',
    ensureCustomer: ensureCustomerMock,
    createPixCharge: createPixChargeMock,
  }),
}));

import { POST } from '@/app/api/public/pedidos/[token]/charge/pix/route';

function makeReq(token: string) {
  return new NextRequest(
    `http://localhost:4000/api/public/pedidos/${token}/charge/pix`,
    { method: 'POST' },
  );
}

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_TOKEN = 'valid-token-1234567890';

const baseBilling = {
  nome: 'Maria Silva',
  cpfCnpj: '52998224725',
  email: 'maria@example.com',
  telefone: '11999999999',
};

const baseData = (overrides: Record<string, unknown> = {}) => ({
  numeroPedido: 'PED-001',
  status: 'AGUARDANDO_PAGAMENTO',
  orcamentos: [{ id: 'o1', isAtivo: true, total: 100 }],
  entrega: { freteTotal: 23.456 },
  totalPago: 0,
  billing: baseBilling,
  ...overrides,
});

function seedDoc(data: Record<string, unknown>, id = 'p1') {
  mockGet.mockResolvedValue({
    empty: false,
    docs: [
      {
        id,
        ref: { update: mockUpdate, id },
        data: () => data,
      },
    ],
  });
}

describe('POST /api/public/pedidos/[token]/charge/pix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
    ensureCustomerMock.mockResolvedValue({ providerCustomerId: 'cus_x' });
    createPixChargeMock.mockResolvedValue({
      chargeId: 'pay_x',
      status: 'PENDING',
      amount: 123.46,
      qrCodeBase64: 'BASE64',
      copyPaste: '00020126...',
      expiresAt: new Date('2026-04-25T13:00:00Z'),
    });
  });

  it('returns 400 for short tokens', async () => {
    const res = await POST(makeReq('x'), createParams('x'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when pedido not found', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(404);
  });

  it('rejects when status !== AGUARDANDO_PAGAMENTO', async () => {
    seedDoc(baseData({ status: 'CONFIRMADO' }));
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
    expect(createPixChargeMock).not.toHaveBeenCalled();
  });

  it('rejects when billing is missing', async () => {
    seedDoc(baseData({ billing: undefined }));
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/CPF\/CNPJ/i);
    expect(createPixChargeMock).not.toHaveBeenCalled();
  });

  it('rejects when amountDue <= 0', async () => {
    seedDoc(baseData({ totalPago: 1000 }));
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
    expect(createPixChargeMock).not.toHaveBeenCalled();
  });

  it('returns 500 when provider throws', async () => {
    seedDoc(baseData());
    createPixChargeMock.mockRejectedValue(new Error('asaas down'));
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/asaas down/);
  });

  it('falls back when orcamentos / entrega / totalPago are missing or non-numeric', async () => {
    seedDoc({
      // numeroPedido omitted → falls back to doc.id
      status: 'AGUARDANDO_PAGAMENTO',
      orcamentos: undefined,
      entrega: undefined,
      totalPago: 'wat',
      billing: baseBilling,
    });
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    // amountDue = 0, so 400
    expect(res.status).toBe(400);
  });

  it('happy path: writes paymentSession and sanitizes the response', async () => {
    seedDoc(baseData());
    const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    // amountDue rounded to 2 decimals: 100 + 23.456 = 123.456 → 123.46
    expect(createPixChargeMock).toHaveBeenCalledTimes(1);
    expect(createPixChargeMock.mock.calls[0][0].amount).toBeCloseTo(123.46, 2);
    expect(createPixChargeMock.mock.calls[0][0].externalReference).toBe('p1');

    // Sanitization: providerCustomerId & processedWebhookEventIds stripped
    expect(body.data.paymentSession.providerCustomerId).toBeUndefined();
    expect(body.data.paymentSession.processedWebhookEventIds).toBeUndefined();
    expect(body.data.paymentSession.chargeId).toBe('pay_x');
    expect(body.data.paymentSession.method).toBe('PIX');
    expect(body.data.paymentSession.pixCopyPaste).toBe('00020126...');
    expect(body.data.paymentSession.pixQrCodeBase64).toBe('BASE64');

    // Stored payload includes the internal fields
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const stored = mockUpdate.mock.calls[0][0].paymentSession;
    expect(stored.providerCustomerId).toBe('cus_x');
    expect(stored.processedWebhookEventIds).toEqual([]);
    expect(stored.method).toBe('PIX');
  });
});
