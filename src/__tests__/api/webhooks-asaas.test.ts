/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

type DocData = Record<string, any>;
const store = new Map<string, DocData>();

function makeDocRef(path: string) {
  return {
    id: path.split('/').pop()!,
    get: vi.fn(async () => {
      const data = store.get(path);
      return {
        exists: data !== undefined,
        data: () => data,
        id: path.split('/').pop()!,
      };
    }),
    update: vi.fn(async (payload: DocData) => {
      const existing = store.get(path) ?? {};
      const next = { ...existing };
      for (const [k, v] of Object.entries(payload)) {
        if (k.includes('.')) {
          const [head, tail] = k.split('.');
          next[head] = { ...(next[head] ?? {}), [tail]: v };
        } else {
          next[k] = v;
        }
      }
      store.set(path, next);
    }),
  };
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => makeDocRef(`${name}/${id}`),
    }),
    runTransaction: async (cb: (t: any) => Promise<any>) => {
      const transaction = {
        get: async (ref: any) => ref.get(),
        update: async (ref: any, payload: any) => ref.update(payload),
      };
      return cb(transaction);
    },
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2026-04-25T12:00:00.000Z'),
      seconds: 1,
      nanoseconds: 0,
    })),
    fromDate: (d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    }),
  },
}));

const parseWebhookMock = vi.fn();
vi.mock('@/lib/payments/registry', () => ({
  getPaymentProvider: () => ({
    name: 'asaas',
    parseWebhook: parseWebhookMock,
  }),
}));

import { POST } from '@/app/api/webhooks/asaas/route';

function tsFromDate(d: Date) {
  return {
    toDate: () => d,
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
  };
}

function seedPedido(id: string, overrides: DocData = {}) {
  const base: DocData = {
    numeroPedido: id,
    status: 'AGUARDANDO_PAGAMENTO',
    isActive: true,
    orcamentos: [{ id: 'o1', isAtivo: true, total: 200 }],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [],
    totalPago: 0,
    dataVencimento: tsFromDate(new Date(2026, 4, 1)),
    dataEntrega: tsFromDate(new Date(2026, 4, 1)),
    statusPagamento: 'PENDENTE',
    createdAt: tsFromDate(new Date(2026, 3, 1)),
    paymentSession: {
      provider: 'asaas',
      providerCustomerId: 'cus',
      chargeId: 'pay',
      method: 'PIX',
      status: 'PENDING',
      amount: 200,
      processedWebhookEventIds: [],
    },
  };
  store.set(`pedidos/${id}`, { ...base, ...overrides });
}

function makeReq(body: string) {
  return new NextRequest('http://localhost:4000/api/webhooks/asaas', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/webhooks/asaas', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('returns 401 when parseWebhook returns null (auth failure)', async () => {
    parseWebhookMock.mockReturnValue(null);
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when parseWebhook throws', async () => {
    parseWebhookMock.mockImplementation(() => {
      throw new Error('signature mismatch');
    });
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('non-CONFIRMED event flips session.status without a Pagamento', async () => {
    seedPedido('p1');
    parseWebhookMock.mockReturnValue({
      id: 'evt-failed',
      type: 'OTHER',
      chargeId: 'pay',
      externalReference: 'p1',
      status: 'FAILED',
      amount: 200,
    });
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(200);
    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos).toHaveLength(0);
    expect(stored.paymentSession.status).toBe('FAILED');
    expect(stored.status).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('returns 200 ignored=unknown_pedido when externalReference is missing', async () => {
    parseWebhookMock.mockReturnValue({
      id: 'evt-1',
      type: 'PAYMENT_CONFIRMED',
      chargeId: 'pay',
      status: 'CONFIRMED',
      amount: 200,
    });
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.ignored).toBe('no_external_reference');
  });

  it('returns 200 ignored=unknown_pedido when externalReference does not match a pedido', async () => {
    parseWebhookMock.mockReturnValue({
      id: 'evt-1',
      type: 'PAYMENT_CONFIRMED',
      chargeId: 'pay',
      externalReference: 'missing',
      status: 'CONFIRMED',
      amount: 200,
    });
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ignored).toBe('unknown_pedido');
  });

  it('PAYMENT_CONFIRMED records a Pagamento and transitions to CONFIRMADO', async () => {
    seedPedido('p1');
    parseWebhookMock.mockReturnValue({
      id: 'evt-1',
      type: 'PAYMENT_CONFIRMED',
      chargeId: 'pay',
      externalReference: 'p1',
      status: 'CONFIRMED',
      amount: 200,
      paymentMethod: 'PIX',
      paymentDate: new Date('2026-04-25T10:00:00Z'),
    });
    const res = await POST(makeReq('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const stored = store.get('pedidos/p1')!;
    expect(stored.status).toBe('CONFIRMADO');
    expect(stored.statusPagamento).toBe('PAGO');
    expect(stored.totalPago).toBe(200);
    expect(stored.pagamentos).toHaveLength(1);
    expect(stored.pagamentos[0].metodo).toBe('PIX');
    expect(stored.pagamentos[0].createdBy).toBe('asaas-webhook');
  });

  it('replays of the same event id are idempotent', async () => {
    seedPedido('p1');
    const event = {
      id: 'evt-dup',
      type: 'PAYMENT_CONFIRMED',
      chargeId: 'pay',
      externalReference: 'p1',
      status: 'CONFIRMED',
      amount: 200,
      paymentMethod: 'PIX',
      paymentDate: new Date('2026-04-25T10:00:00Z'),
    };
    parseWebhookMock.mockReturnValue(event);

    const first = await POST(makeReq('{}'));
    expect(first.status).toBe(200);
    expect((await first.json()).idempotent).toBeUndefined();

    const second = await POST(makeReq('{}'));
    expect(second.status).toBe(200);
    expect((await second.json()).idempotent).toBe(true);

    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos).toHaveLength(1);
  });

  describe('structured observability info logs', () => {
    let infoSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    function expectInfo(outcome: string, extra: Record<string, unknown> = {}) {
      expect(infoSpy).toHaveBeenCalledWith(
        '[asaas-webhook]',
        expect.objectContaining({ outcome, ...extra }),
      );
    }

    it('logs outcome=parse_failed when parseWebhook returns null', async () => {
      parseWebhookMock.mockReturnValue(null);
      await POST(makeReq('{}'));
      expectInfo('parse_failed');
    });

    it('logs outcome=unknown_pedido when externalReference is missing', async () => {
      parseWebhookMock.mockReturnValue({
        id: 'evt-1',
        type: 'PAYMENT_CONFIRMED',
        chargeId: 'pay',
        status: 'CONFIRMED',
        amount: 200,
      });
      await POST(makeReq('{}'));
      expectInfo('unknown_pedido', { event: 'evt-1', chargeId: 'pay' });
    });

    it('logs outcome=unknown_pedido when pedido does not exist', async () => {
      parseWebhookMock.mockReturnValue({
        id: 'evt-1',
        type: 'PAYMENT_CONFIRMED',
        chargeId: 'pay',
        externalReference: 'missing',
        status: 'CONFIRMED',
        amount: 200,
      });
      await POST(makeReq('{}'));
      expectInfo('unknown_pedido', {
        event: 'evt-1',
        externalReference: 'missing',
      });
    });

    it('logs outcome=recorded on successful confirmation', async () => {
      seedPedido('p1');
      parseWebhookMock.mockReturnValue({
        id: 'evt-rec',
        type: 'PAYMENT_CONFIRMED',
        chargeId: 'pay',
        externalReference: 'p1',
        status: 'CONFIRMED',
        amount: 200,
        paymentMethod: 'PIX',
        paymentDate: new Date('2026-04-25T10:00:00Z'),
      });
      await POST(makeReq('{}'));
      expectInfo('recorded', { pedidoId: 'p1', event: 'evt-rec' });
    });

    it('logs outcome=idempotent on replays', async () => {
      seedPedido('p1');
      const event = {
        id: 'evt-dup',
        type: 'PAYMENT_CONFIRMED',
        chargeId: 'pay',
        externalReference: 'p1',
        status: 'CONFIRMED',
        amount: 200,
        paymentMethod: 'PIX',
        paymentDate: new Date('2026-04-25T10:00:00Z'),
      };
      parseWebhookMock.mockReturnValue(event);
      await POST(makeReq('{}'));
      infoSpy.mockClear();
      await POST(makeReq('{}'));
      expectInfo('idempotent', { pedidoId: 'p1' });
    });

    it('logs outcome=unhandled_status on non-CONFIRMED events', async () => {
      seedPedido('p1');
      parseWebhookMock.mockReturnValue({
        id: 'evt-fail',
        type: 'OTHER',
        chargeId: 'pay',
        externalReference: 'p1',
        status: 'FAILED',
        amount: 200,
      });
      await POST(makeReq('{}'));
      expectInfo('unhandled_status', { pedidoId: 'p1', event: 'evt-fail' });
    });
  });
});
