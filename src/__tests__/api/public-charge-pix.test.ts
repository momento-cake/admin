/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Firestore mock --------------------------------------------------------
type DocData = Record<string, any>;

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockLimit = vi.fn(() => ({ get: mockGet }));
const mockWhere = vi.fn(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));

// Per-doc state used by transaction.get inside runTransaction
let txnDocData: DocData | null = null;

const mockRunTransaction = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    fromDate: (d: Date) => ({
      toDate: () => d,
      toMillis: () => d.getTime(),
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
import { encryptPii } from '@/lib/billing-encryption';
import { resetRateLimitForTesting } from '@/lib/rate-limit';

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

const PLAIN_CPF = '52998224725';
const baseBilling = {
  nome: 'Maria Silva',
  // Stored encrypted at rest (LGPD). Routes decrypt before calling provider.
  cpfCnpj: encryptPii(PLAIN_CPF),
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
  txnDocData = data;
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

function defaultRunTransaction() {
  // Wire transaction.get to the seeded doc, transaction.update to mockUpdate
  // and persist the update into txnDocData so subsequent transactions in the
  // same test see the new session.
  mockRunTransaction.mockImplementation(async (cb: (t: any) => Promise<any>) => {
    const transaction = {
      get: vi.fn().mockImplementation(async () => ({
        exists: txnDocData !== null,
        data: () => txnDocData,
      })),
      update: vi.fn().mockImplementation((_ref: any, payload: any) => {
        if (txnDocData) {
          for (const [k, v] of Object.entries(payload)) {
            if (k.includes('.')) {
              const [head, tail] = k.split('.');
              txnDocData[head] = { ...(txnDocData[head] ?? {}), [tail]: v };
            } else {
              txnDocData[k] = v;
            }
          }
        }
        mockUpdate(payload);
      }),
    };
    return cb(transaction);
  });
}

describe('POST /api/public/pedidos/[token]/charge/pix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitForTesting();
    txnDocData = null;
    mockWhere.mockImplementation(() => ({ where: mockWhere, limit: mockLimit, get: mockGet }));
    ensureCustomerMock.mockResolvedValue({ providerCustomerId: 'cus_x' });
    createPixChargeMock.mockResolvedValue({
      chargeId: 'pay_x',
      status: 'PENDING',
      amount: 123.46,
      qrCodeBase64: 'BASE64',
      copyPaste: '00020126...',
      // Expiry must be in the future relative to "now" so the parallel-POST
      // test exercises the reuse branch on the second call.
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    defaultRunTransaction();
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

    // LGPD: provider receives PLAINTEXT cpfCnpj even though storage is encrypted.
    expect(ensureCustomerMock).toHaveBeenCalledTimes(1);
    expect(ensureCustomerMock.mock.calls[0][0].cpfCnpj).toBe(PLAIN_CPF);

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

  describe('idempotency', () => {
    it('reuses existing PENDING PIX session when not expired (no duplicate provider call)', async () => {
      const existingSession = {
        provider: 'asaas',
        providerCustomerId: 'cus_existing',
        chargeId: 'pay_existing',
        method: 'PIX',
        status: 'PENDING',
        amount: 123.46,
        pixQrCodeBase64: 'EXISTING_QR',
        pixCopyPaste: 'EXISTING_COPY',
        expiresAt: {
          toMillis: () => Date.now() + 5 * 60 * 1000, // 5min in future
          seconds: Math.floor((Date.now() + 5 * 60 * 1000) / 1000),
          nanoseconds: 0,
        },
        processedWebhookEventIds: [],
      };
      seedDoc(baseData({ paymentSession: existingSession }));

      const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(ensureCustomerMock).not.toHaveBeenCalled();
      expect(createPixChargeMock).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();

      expect(body.data.paymentSession.chargeId).toBe('pay_existing');
      expect(body.data.paymentSession.providerCustomerId).toBeUndefined();
    });

    it('creates a new charge when existing session is expired', async () => {
      const expiredSession = {
        provider: 'asaas',
        providerCustomerId: 'cus_old',
        chargeId: 'pay_old',
        method: 'PIX',
        status: 'PENDING',
        amount: 123.46,
        expiresAt: {
          toMillis: () => Date.now() - 60 * 1000, // 1min in past
          seconds: Math.floor((Date.now() - 60 * 1000) / 1000),
          nanoseconds: 0,
        },
        processedWebhookEventIds: [],
      };
      seedDoc(baseData({ paymentSession: expiredSession }));

      const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
      expect(res.status).toBe(200);
      expect(createPixChargeMock).toHaveBeenCalledTimes(1);
    });

    it('creates a new charge when existing session is not PENDING', async () => {
      const failedSession = {
        provider: 'asaas',
        providerCustomerId: 'cus_old',
        chargeId: 'pay_old',
        method: 'PIX',
        status: 'FAILED',
        amount: 123.46,
        expiresAt: {
          toMillis: () => Date.now() + 5 * 60 * 1000,
          seconds: Math.floor((Date.now() + 5 * 60 * 1000) / 1000),
          nanoseconds: 0,
        },
        processedWebhookEventIds: [],
      };
      seedDoc(baseData({ paymentSession: failedSession }));

      const res = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
      expect(res.status).toBe(200);
      expect(createPixChargeMock).toHaveBeenCalledTimes(1);
    });

    it('rate-limits to 5 requests per minute per ip+token', async () => {
      seedDoc(baseData());
      function makeReqWithIp(ip: string) {
        return new NextRequest(
          `http://localhost:4000/api/public/pedidos/${VALID_TOKEN}/charge/pix`,
          { method: 'POST', headers: { 'x-forwarded-for': ip } },
        );
      }
      for (let i = 0; i < 5; i++) {
        const res = await POST(makeReqWithIp('2.2.2.2'), createParams(VALID_TOKEN));
        expect(res.status).toBe(200);
      }
      const blocked = await POST(makeReqWithIp('2.2.2.2'), createParams(VALID_TOKEN));
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get('Retry-After')).toBeTruthy();

      resetRateLimitForTesting();
      const ok = await POST(makeReqWithIp('2.2.2.2'), createParams(VALID_TOKEN));
      expect(ok.status).toBe(200);
    });

    it('two parallel POSTs only call provider once and yield the same chargeId', async () => {
      // Simulate concurrency: the doc starts with no session. The first
      // transaction creates one and writes it. The second transaction reads
      // the freshly-written session and returns it without calling Asaas.
      seedDoc(baseData());

      const r1 = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));
      const r2 = await POST(makeReq(VALID_TOKEN), createParams(VALID_TOKEN));

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      const b1 = await r1.json();
      const b2 = await r2.json();

      // Provider was called exactly once across both requests.
      expect(createPixChargeMock).toHaveBeenCalledTimes(1);
      expect(b1.data.paymentSession.chargeId).toBe(b2.data.paymentSession.chargeId);
    });
  });
});
