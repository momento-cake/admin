/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory Firestore mock — same shape as pedido-payment-record.test.ts so
// the handler runs through the real dispatcher (recordChargeConfirmation),
// exercising both routing and the handler's writes/returns.
// ---------------------------------------------------------------------------
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

/**
 * Pedido in CONFIRMADO with one R$ 200 PIX payment already on file. This is the
 * "happy path" baseline a refund event would arrive against.
 */
function seedPaidPedido(id: string, overrides: DocData = {}) {
  const base: DocData = {
    numeroPedido: id,
    status: 'CONFIRMADO',
    isActive: true,
    orcamentos: [
      {
        id: 'o1',
        isAtivo: true,
        total: 200,
      },
    ],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [
      {
        id: 'pag-1',
        data: tsFromDate(new Date('2026-04-20T10:00:00Z')),
        valor: 200,
        metodo: 'PIX',
        observacao: 'Pagamento online',
        comprovanteUrl: null,
        comprovantePath: null,
        comprovanteTipo: null,
        createdAt: tsFromDate(new Date('2026-04-20T10:00:00Z')),
        createdBy: 'asaas-webhook',
      },
    ],
    totalPago: 200,
    dataVencimento: tsFromDate(new Date(2026, 4, 1)),
    dataEntrega: tsFromDate(new Date(2026, 4, 1)),
    statusPagamento: 'PAGO',
    createdAt: tsFromDate(new Date(2026, 3, 1)),
    paymentSession: {
      provider: 'asaas',
      providerCustomerId: 'cus_x',
      chargeId: 'pay_x',
      method: 'PIX',
      status: 'CONFIRMED',
      amount: 200,
      processedWebhookEventIds: ['evt-confirmed'],
    },
  };
  store.set(`pedidos/${id}`, { ...base, ...overrides });
}

function makeRefundEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: 'evt-refund',
    type: 'PAYMENT_REFUNDED',
    chargeId: 'pay_x',
    externalReference: 'p1',
    status: 'REFUNDED',
    amount: 200,
    paymentDate: new Date('2026-04-25T10:00:00Z'),
    paymentMethod: 'PIX',
    ...overrides,
  };
}

describe('handleRefund (via recordChargeConfirmation)', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // PAYMENT_REFUNDED — full refund
  // -------------------------------------------------------------------------
  describe('PAYMENT_REFUNDED (full refund)', () => {
    it('appends a negative Pagamento and reverts CONFIRMADO -> AGUARDANDO_PAGAMENTO', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.refundAmount).toBe(200);
      expect(result.totalPago).toBe(0);
      expect(result.revertedToAguardandoPagamento).toBe(true);

      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos).toHaveLength(2);
      const refundEntry = stored.pagamentos[1];
      expect(refundEntry.valor).toBe(-200);
      expect(refundEntry.metodo).toBe('PIX');
      expect(refundEntry.observacao).toBe('Estorno via Asaas');
      expect(refundEntry.createdBy).toBe('asaas-webhook');
      expect(stored.totalPago).toBe(0);
      // total=200, totalPago=0, no overdue → PENDENTE
      expect(stored.statusPagamento).toBe('PENDENTE');
      expect(stored.status).toBe('AGUARDANDO_PAGAMENTO');
      expect(stored.lastModifiedBy).toBe('asaas-webhook');
      // Session-state patch was committed too.
      expect(stored.paymentSession.status).toBe('REFUNDED');
      expect(stored.paymentSession.processedWebhookEventIds).toContain('evt-refund');
    });

    it('uses the event paymentMethod when provided', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({ paymentMethod: 'CARTAO_CREDITO' }),
      );

      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos[1].metodo).toBe('CARTAO_CREDITO');
    });

    it('falls back to PIX metodo when paymentMethod is missing', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({ paymentMethod: undefined }),
      );

      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos[1].metodo).toBe('PIX');
    });

    it('falls back to current date when paymentDate is missing', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({ paymentDate: undefined }),
      );

      const stored = store.get('pedidos/p1')!;
      // Just confirm a Pagamento entry was created with a valid timestamp.
      expect(stored.pagamentos[1].data).toBeDefined();
    });

    it('rounds the refund amount to 2 decimals', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({ amount: 199.999 }),
      );

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos[1].valor).toBe(-200);
    });
  });

  // -------------------------------------------------------------------------
  // PAYMENT_PARTIALLY_REFUNDED
  // -------------------------------------------------------------------------
  describe('PAYMENT_PARTIALLY_REFUNDED (partial refund)', () => {
    it('appends negative partial Pagamento and reverts CONFIRMADO when balance < total', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({
          id: 'evt-partial',
          type: 'PAYMENT_PARTIALLY_REFUNDED',
          status: 'PARTIALLY_REFUNDED',
          amount: 50,
        }),
      );

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.refundAmount).toBe(50);
      expect(result.totalPago).toBe(150);
      expect(result.statusPagamento).toBe('PARCIAL');
      expect(result.revertedToAguardandoPagamento).toBe(true);

      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos).toHaveLength(2);
      expect(stored.pagamentos[1].valor).toBe(-50);
      expect(stored.totalPago).toBe(150);
      expect(stored.statusPagamento).toBe('PARCIAL');
      expect(stored.status).toBe('AGUARDANDO_PAGAMENTO');
      expect(stored.paymentSession.status).toBe('PARTIALLY_REFUNDED');
    });

    it('routes by event.type even when event.status is REFUNDED', async () => {
      // Asaas can send PAYMENT_PARTIALLY_REFUNDED with status 'REFUNDED' (the
      // dispatcher routes both type and status into refund-handler).
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({
          id: 'evt-partial-2',
          type: 'PAYMENT_PARTIALLY_REFUNDED',
          status: 'REFUNDED',
          amount: 50,
        }),
      );

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos[1].valor).toBe(-50);
    });
  });

  // -------------------------------------------------------------------------
  // PAYMENT_REFUND_IN_PROGRESS — observability only
  // -------------------------------------------------------------------------
  describe('PAYMENT_REFUND_IN_PROGRESS (observability only)', () => {
    it('does NOT append a Pagamento and returns unhandled_status', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({
          id: 'evt-in-progress',
          type: 'PAYMENT_REFUND_IN_PROGRESS',
          // Asaas typically sends this with status REFUNDED but we don't trust
          // it — switch on type, not status.
          status: 'REFUNDED',
          amount: 200,
        }),
      );

      expect(result.kind).toBe('unhandled_status');
      const stored = store.get('pedidos/p1')!;
      // Pagamentos and pedido status untouched.
      expect(stored.pagamentos).toHaveLength(1);
      expect(stored.totalPago).toBe(200);
      expect(stored.status).toBe('CONFIRMADO');
      expect(stored.statusPagamento).toBe('PAGO');
      // But session-state patch IS applied.
      expect(stored.paymentSession.status).toBe('REFUNDED');
      expect(stored.paymentSession.processedWebhookEventIds).toContain(
        'evt-in-progress',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('amount === 0 → no Pagamento appended, returns unhandled_status, session patch committed', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({ id: 'evt-zero', amount: 0 }),
      );

      expect(result.kind).toBe('unhandled_status');
      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos).toHaveLength(1);
      expect(stored.totalPago).toBe(200);
      expect(stored.status).toBe('CONFIRMADO');
      expect(stored.paymentSession.processedWebhookEventIds).toContain('evt-zero');
    });

    it('refund event for pedido with NO existing pagamentos still creates negative Pagamento', async () => {
      seedPaidPedido('p1', {
        pagamentos: [],
        totalPago: 0,
        statusPagamento: 'PENDENTE',
        status: 'AGUARDANDO_PAGAMENTO',
      });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.refundAmount).toBe(200);

      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos).toHaveLength(1);
      expect(stored.pagamentos[0].valor).toBe(-200);
      // totalPago becomes negative (credit balance).
      expect(stored.totalPago).toBe(-200);
      // pedido was already AGUARDANDO_PAGAMENTO; not reverted (we only revert
      // FROM CONFIRMADO).
      expect(stored.status).toBe('AGUARDANDO_PAGAMENTO');
      expect(result.revertedToAguardandoPagamento).toBe(false);
    });

    it('falls back to a default dataVencimento when the pedido has none (legacy data)', async () => {
      seedPaidPedido('p1', { dataVencimento: undefined });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.dataVencimento).toBeDefined();
      // Refund still applied.
      expect(stored.pagamentos[1].valor).toBe(-200);
    });

    it('treats pagamentos: undefined as empty list (legacy data tolerance)', async () => {
      seedPaidPedido('p1', {
        pagamentos: undefined,
        totalPago: 0,
        statusPagamento: 'PENDENTE',
        status: 'AGUARDANDO_PAGAMENTO',
      });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.pagamentos).toHaveLength(1);
      expect(stored.pagamentos[0].valor).toBe(-200);
    });

    it('does NOT change status when pedido is CANCELADO', async () => {
      seedPaidPedido('p1', { status: 'CANCELADO' });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.revertedToAguardandoPagamento).toBe(false);

      const stored = store.get('pedidos/p1')!;
      // Refund still recorded.
      expect(stored.pagamentos).toHaveLength(2);
      expect(stored.pagamentos[1].valor).toBe(-200);
      // Status preserved.
      expect(stored.status).toBe('CANCELADO');
    });

    it('does NOT change status for pedido in EM_PRODUCAO (don\'t revert downstream operational state)', async () => {
      seedPaidPedido('p1', { status: 'EM_PRODUCAO' });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.status).toBe('EM_PRODUCAO');
      expect(stored.statusPagamento).toBe('PENDENTE');
      expect(stored.pagamentos[1].valor).toBe(-200);
    });

    it('does NOT change status for pedido in PRONTO', async () => {
      seedPaidPedido('p1', { status: 'PRONTO' });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      const stored = store.get('pedidos/p1')!;
      expect(stored.status).toBe('PRONTO');
      expect(stored.pagamentos[1].valor).toBe(-200);
    });

    it('does NOT change status for pedido in ENTREGUE', async () => {
      seedPaidPedido('p1', { status: 'ENTREGUE' });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(ref as any, makeRefundEvent());

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.revertedToAguardandoPagamento).toBe(false);

      const stored = store.get('pedidos/p1')!;
      expect(stored.status).toBe('ENTREGUE');
      expect(stored.pagamentos[1].valor).toBe(-200);
    });

    it('partial refund on CONFIRMADO that still leaves balance fully paid — does NOT revert', async () => {
      // Pedido has R$ 250 paid against a R$ 200 total (overpayment / tip
      // scenario). A R$ 30 refund leaves R$ 220, still >= total → stays PAGO.
      seedPaidPedido('p1', {
        pagamentos: [
          {
            id: 'pag-1',
            data: tsFromDate(new Date('2026-04-20T10:00:00Z')),
            valor: 250,
            metodo: 'PIX',
            createdAt: tsFromDate(new Date('2026-04-20T10:00:00Z')),
            createdBy: 'asaas-webhook',
          },
        ],
        totalPago: 250,
      });
      const ref = adminDb.collection('pedidos').doc('p1');

      const result = await recordChargeConfirmation(
        ref as any,
        makeRefundEvent({
          id: 'evt-partial-3',
          type: 'PAYMENT_PARTIALLY_REFUNDED',
          status: 'PARTIALLY_REFUNDED',
          amount: 30,
        }),
      );

      expect(result.kind).toBe('refund_recorded');
      if (result.kind !== 'refund_recorded') return;
      expect(result.totalPago).toBe(220);
      expect(result.statusPagamento).toBe('PAGO');
      expect(result.revertedToAguardandoPagamento).toBe(false);

      const stored = store.get('pedidos/p1')!;
      expect(stored.status).toBe('CONFIRMADO');
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency — handled upstream by dispatcher, but verify it works for
  // refund events too.
  // -------------------------------------------------------------------------
  describe('idempotency', () => {
    it('replays of the same refund event id are idempotent', async () => {
      seedPaidPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');

      const first = await recordChargeConfirmation(ref as any, makeRefundEvent());
      expect(first.kind).toBe('refund_recorded');

      const second = await recordChargeConfirmation(ref as any, makeRefundEvent());
      expect(second.kind).toBe('idempotent');

      const stored = store.get('pedidos/p1')!;
      // Original Pagamento + 1 refund Pagamento — second invocation was a no-op.
      expect(stored.pagamentos).toHaveLength(2);
    });
  });
});
