/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- In-memory Firestore mock ---------------------------------------------
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
      // Apply payload, supporting dotted-paths like 'paymentSession.status'
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
      // Use the doc's own get/update directly — we trust callers reference a
      // single doc per transaction for these tests.
      const transaction = {
        get: async (ref: any) => ref.get(),
        update: async (ref: any, payload: any) => ref.update(payload),
      };
      return cb(transaction);
    },
  },
  adminAuth: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => 'SERVER_TS') },
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2026-04-25T12:00:00.000Z'),
      seconds: Math.floor(Date.UTC(2026, 3, 25, 12) / 1000),
      nanoseconds: 0,
    })),
    fromDate: (d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
      nanoseconds: 0,
    }),
  },
}));

import { recordChargeConfirmation } from '@/lib/pedido-payment-record';
import { adminDb } from '@/lib/firebase-admin';
import type { WebhookEvent } from '@/lib/payments/types';

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
    orcamentos: [
      {
        id: 'o1',
        isAtivo: true,
        total: 200,
      },
    ],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [],
    totalPago: 0,
    dataVencimento: tsFromDate(new Date(2026, 4, 1)),
    dataEntrega: tsFromDate(new Date(2026, 4, 1)),
    statusPagamento: 'PENDENTE',
    createdAt: tsFromDate(new Date(2026, 3, 1)),
    paymentSession: {
      provider: 'asaas',
      providerCustomerId: 'cus_x',
      chargeId: 'pay_x',
      method: 'PIX',
      status: 'PENDING',
      amount: 200,
      processedWebhookEventIds: [],
    },
  };
  store.set(`pedidos/${id}`, { ...base, ...overrides });
}

function makeEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: 'evt-1',
    type: 'PAYMENT_CONFIRMED',
    chargeId: 'pay_x',
    externalReference: 'p1',
    status: 'CONFIRMED',
    amount: 200,
    paymentDate: new Date('2026-04-25T10:00:00Z'),
    paymentMethod: 'PIX',
    ...overrides,
  };
}

describe('recordChargeConfirmation', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('returns not_found for missing pedido', async () => {
    const ref = adminDb.collection('pedidos').doc('missing');
    const result = await recordChargeConfirmation(ref as any, makeEvent());
    expect(result.kind).toBe('not_found');
  });

  it('appends a Pagamento and transitions to CONFIRMADO when fully paid', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(ref as any, makeEvent());

    expect(result.kind).toBe('recorded');
    if (result.kind !== 'recorded') return;
    expect(result.totalPago).toBe(200);
    expect(result.statusPagamento).toBe('PAGO');
    expect(result.transitionedToConfirmado).toBe(true);

    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos).toHaveLength(1);
    expect(stored.pagamentos[0].valor).toBe(200);
    expect(stored.pagamentos[0].metodo).toBe('PIX');
    expect(stored.pagamentos[0].createdBy).toBe('asaas-webhook');
    expect(stored.totalPago).toBe(200);
    expect(stored.statusPagamento).toBe('PAGO');
    expect(stored.status).toBe('CONFIRMADO');
    expect(stored.paymentSession.status).toBe('CONFIRMED');
    expect(stored.paymentSession.processedWebhookEventIds).toEqual(['evt-1']);
  });

  it('does not transition pedido when partial payment', async () => {
    seedPedido('p1', {
      orcamentos: [{ id: 'o1', isAtivo: true, total: 500 }],
    });
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(
      ref as any,
      makeEvent({ amount: 200 }),
    );

    expect(result.kind).toBe('recorded');
    if (result.kind !== 'recorded') return;
    expect(result.statusPagamento).toBe('PARCIAL');
    expect(result.transitionedToConfirmado).toBe(false);

    const stored = store.get('pedidos/p1')!;
    expect(stored.status).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('is idempotent: replays of same event id are no-ops', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const first = await recordChargeConfirmation(ref as any, makeEvent());
    expect(first.kind).toBe('recorded');

    const second = await recordChargeConfirmation(ref as any, makeEvent());
    expect(second.kind).toBe('idempotent');

    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos).toHaveLength(1);
  });

  it('non-CONFIRMED events only flip session status (no Pagamento)', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(
      ref as any,
      makeEvent({ id: 'evt-fail', status: 'FAILED' }),
    );

    expect(result.kind).toBe('unhandled_status');
    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos).toHaveLength(0);
    expect(stored.paymentSession.status).toBe('FAILED');
    expect(stored.paymentSession.processedWebhookEventIds).toEqual(['evt-fail']);
  });

  it('logs a structured status_mismatch warn when unhandled_status branch fires', async () => {
    seedPedido('p1', { status: 'CONFIRMADO' });
    const ref = adminDb.collection('pedidos').doc('p1');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await recordChargeConfirmation(
        ref as any,
        makeEvent({
          id: 'evt-mismatch',
          type: 'PAYMENT_OVERDUE',
          status: 'EXPIRED',
        }),
      );
      expect(result.kind).toBe('unhandled_status');
      expect(warnSpy).toHaveBeenCalledWith(
        '[asaas-webhook] status_mismatch',
        expect.objectContaining({
          pedidoId: 'p1',
          currentStatus: 'CONFIRMADO',
          eventId: 'evt-mismatch',
          eventType: 'PAYMENT_OVERDUE',
        }),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('caps processedWebhookEventIds at 50 entries', async () => {
    const existing = Array.from({ length: 50 }, (_, i) => `e-${i}`);
    seedPedido('p1', {
      paymentSession: {
        provider: 'asaas',
        providerCustomerId: 'cus',
        chargeId: 'pay',
        method: 'PIX',
        status: 'PENDING',
        amount: 200,
        processedWebhookEventIds: existing,
      },
    });
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(ref as any, makeEvent({ id: 'evt-new' }));
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentSession.processedWebhookEventIds).toHaveLength(50);
    expect(stored.paymentSession.processedWebhookEventIds[49]).toBe('evt-new');
    expect(stored.paymentSession.processedWebhookEventIds[0]).toBe('e-1');
  });

  it('handles a pedido without a paymentSession (no processed list)', async () => {
    seedPedido('p1', { paymentSession: undefined });
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(ref as any, makeEvent());
    expect(result.kind).toBe('recorded');
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentSession.processedWebhookEventIds).toEqual(['evt-1']);
  });

  it('falls back to defaults when paymentDate / paymentMethod / pagamentos / dataVencimento are missing', async () => {
    seedPedido('p1', {
      pagamentos: undefined,
      dataVencimento: undefined,
    });
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(
      ref as any,
      makeEvent({
        paymentDate: undefined,
        paymentMethod: undefined,
      }),
    );
    expect(result.kind).toBe('recorded');
    const stored = store.get('pedidos/p1')!;
    expect(stored.pagamentos[0].metodo).toBe('PIX'); // default fallback
    expect(stored.dataVencimento).toBeDefined();
  });

  it('does not flip status when pedido is already CONFIRMADO', async () => {
    seedPedido('p1', { status: 'CONFIRMADO' });
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(ref as any, makeEvent());
    expect(result.kind).toBe('recorded');
    if (result.kind !== 'recorded') return;
    expect(result.transitionedToConfirmado).toBe(false);
    const stored = store.get('pedidos/p1')!;
    expect(stored.status).toBe('CONFIRMADO');
  });
});
