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
    now: () => ({
      toDate: () => new Date('2026-04-25T12:00:00Z'),
      seconds: 1777641600,
      nanoseconds: 0,
    }),
  },
}));

const ensureCustomerMock = vi.fn();
const createCardChargeMock = vi.fn();

vi.mock('@/lib/payments/registry', () => ({
  getPaymentProvider: () => ({
    name: 'asaas',
    ensureCustomer: ensureCustomerMock,
    createCardCharge: createCardChargeMock,
  }),
}));

const recordChargeMock = vi.fn();
vi.mock('@/lib/pedido-payment-record', () => ({
  recordChargeConfirmation: (...args: any[]) => recordChargeMock(...args),
}));

import { POST } from '@/app/api/public/pedidos/[token]/charge/card/route';
import { encryptPii } from '@/lib/billing-encryption';
import { resetRateLimitForTesting } from '@/lib/rate-limit';

const VALID_TOKEN = 'valid-token-1234567890';
const VALID_CARD_BODY = {
  card: {
    number: '4111111111111111',
    holderName: 'MARIA SILVA',
    expiryMonth: '08',
    expiryYear: '2030',
    cvv: '123',
  },
};

const PLAIN_CPF = '52998224725';
const baseBilling = {
  nome: 'Maria Silva',
  // Stored encrypted at rest (LGPD). Routes decrypt before calling provider.
  cpfCnpj: encryptPii(PLAIN_CPF),
  email: 'maria@example.com',
};

const baseData = (overrides: Record<string, unknown> = {}) => ({
  numeroPedido: 'PED-001',
  status: 'AGUARDANDO_PAGAMENTO',
  orcamentos: [{ id: 'o1', isAtivo: true, total: 250 }],
  entrega: { freteTotal: 0 },
  totalPago: 0,
  billing: baseBilling,
  ...overrides,
});

function makeReq(token: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(
    `http://localhost:4000/api/public/pedidos/${token}/charge/card`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', ...headers },
    },
  );
}

function createParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

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

describe('POST /api/public/pedidos/[token]/charge/card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitForTesting();
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
    ensureCustomerMock.mockResolvedValue({ providerCustomerId: 'cus_card' });
    createCardChargeMock.mockResolvedValue({
      chargeId: 'pay_card',
      status: 'PENDING',
      amount: 250,
    });
  });

  it('returns 400 for short tokens', async () => {
    const res = await POST(makeReq('x', VALID_CARD_BODY), createParams('x'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest(
      `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/charge/card`,
      { method: 'POST', body: 'not-json', headers: { 'content-type': 'application/json' } },
    );
    const res = await POST(req, createParams(VALID_TOKEN));
    expect(res.status).toBe(400);
  });

  it('rejects when status !== AGUARDANDO_PAGAMENTO', async () => {
    seedDoc(baseData({ status: 'CONFIRMADO' }));
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
    expect(createCardChargeMock).not.toHaveBeenCalled();
  });

  it('rejects when amountDue <= 0', async () => {
    seedDoc(baseData({ totalPago: 999 }));
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
    expect(createCardChargeMock).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid card body', async () => {
    seedDoc(baseData());
    const res = await POST(
      makeReq(VALID_TOKEN, { card: { number: '123' } }),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
    expect(createCardChargeMock).not.toHaveBeenCalled();
  });

  it('returns 404 when pedido not found', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(404);
  });

  it('rejects when billing is missing', async () => {
    seedDoc(baseData({ billing: undefined }));
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
    expect(createCardChargeMock).not.toHaveBeenCalled();
  });

  it('happy path: writes paymentSession and forwards remoteIp from x-forwarded-for', async () => {
    seedDoc(baseData());
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY, {
        'x-forwarded-for': '203.0.113.5, 10.0.0.1',
      }),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.paymentSession.method).toBe('CARTAO_CREDITO');
    expect(body.data.paymentSession.providerCustomerId).toBeUndefined();
    expect(body.data.paymentSession.processedWebhookEventIds).toBeUndefined();
    expect(body.data.immediatelyConfirmed).toBe(false);

    expect(createCardChargeMock).toHaveBeenCalledTimes(1);
    const cardArg = createCardChargeMock.mock.calls[0][1];
    expect(cardArg.remoteIp).toBe('203.0.113.5');

    // LGPD: provider receives PLAINTEXT cpfCnpj on both ensureCustomer and the
    // holder param of createCardCharge.
    expect(ensureCustomerMock.mock.calls[0][0].cpfCnpj).toBe(PLAIN_CPF);
    const holderArg = createCardChargeMock.mock.calls[0][2];
    expect(holderArg.cpfCnpj).toBe(PLAIN_CPF);

    expect(recordChargeMock).not.toHaveBeenCalled();
  });

  it('falls back to 0.0.0.0 when no x-forwarded-for', async () => {
    seedDoc(baseData());
    await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    const cardArg = createCardChargeMock.mock.calls[0][1];
    expect(cardArg.remoteIp).toBe('0.0.0.0');
  });

  it('immediate-confirm flow: status=CONFIRMED triggers recordChargeConfirmation', async () => {
    createCardChargeMock.mockResolvedValue({
      chargeId: 'pay_card',
      status: 'CONFIRMED',
      amount: 250,
    });
    recordChargeMock.mockResolvedValue({
      kind: 'recorded',
      eventId: 'immediate-card-pay_card',
      pagamentoId: 'pg-1',
      totalPago: 250,
      statusPagamento: 'PAGO',
      transitionedToConfirmado: true,
    });

    seedDoc(baseData());
    const res = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY),
      createParams(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.immediatelyConfirmed).toBe(true);
    expect(recordChargeMock).toHaveBeenCalledTimes(1);
    const event = recordChargeMock.mock.calls[0][1];
    expect(event.status).toBe('CONFIRMED');
    expect(event.chargeId).toBe('pay_card');
    expect(event.externalReference).toBe('p1');
    expect(event.paymentMethod).toBe('CARTAO_CREDITO');
  });

  it('rate-limits to 5 requests per minute per ip+token', async () => {
    seedDoc(baseData());
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        makeReq(VALID_TOKEN, VALID_CARD_BODY, { 'x-forwarded-for': '3.3.3.3' }),
        createParams(VALID_TOKEN),
      );
      expect(res.status).toBe(200);
    }
    const blocked = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY, { 'x-forwarded-for': '3.3.3.3' }),
      createParams(VALID_TOKEN),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();

    resetRateLimitForTesting();
    const ok = await POST(
      makeReq(VALID_TOKEN, VALID_CARD_BODY, { 'x-forwarded-for': '3.3.3.3' }),
      createParams(VALID_TOKEN),
    );
    expect(ok.status).toBe(200);
  });

  it('synthesized event id is prefixed with `immediate-card-` to avoid colliding with real webhook event ids', async () => {
    createCardChargeMock.mockResolvedValue({
      chargeId: 'pay_card_xyz',
      status: 'CONFIRMED',
      amount: 250,
    });
    recordChargeMock.mockResolvedValue({
      kind: 'recorded',
      eventId: 'immediate-card-pay_card_xyz',
      pagamentoId: 'pg-1',
      totalPago: 250,
      statusPagamento: 'PAGO',
      transitionedToConfirmado: true,
    });

    seedDoc(baseData());
    await POST(makeReq(VALID_TOKEN, VALID_CARD_BODY), createParams(VALID_TOKEN));
    const event = recordChargeMock.mock.calls[0][1];
    expect(event.id).toBe('immediate-card-pay_card_xyz');
    expect(event.id.startsWith('card-')).toBe(false);
  });
});
