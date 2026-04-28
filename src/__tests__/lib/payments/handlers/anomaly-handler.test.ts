/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory Firestore mock — same shape as src/__tests__/api/pedido-payment-record.test.ts
// but kept local so this handler-level suite can stand on its own.
// ---------------------------------------------------------------------------

type DocData = Record<string, any>;

const DELETE_SENTINEL = Symbol('FieldValue.delete');

const store = new Map<string, DocData>();

function applyPayload(target: DocData, payload: DocData) {
  for (const [k, v] of Object.entries(payload)) {
    if (k.includes('.')) {
      const [head, tail] = k.split('.');
      const parent = (target[head] ?? {}) as DocData;
      if (v === DELETE_SENTINEL) {
        const { [tail]: _drop, ...rest } = parent;
        void _drop;
        target[head] = rest;
      } else {
        target[head] = { ...parent, [tail]: v };
      }
    } else if (v === DELETE_SENTINEL) {
      delete target[k];
    } else {
      target[k] = v;
    }
  }
}

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
      applyPayload(next, payload);
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
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
    delete: vi.fn(() => DELETE_SENTINEL),
  },
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
import type { WebhookEvent, AsaasEventType } from '@/lib/payments/types';
import { ANOMALY_EVENT_TYPES } from '@/lib/payments/handlers/anomaly-handler';

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

function makeAnomalyEvent(
  type: AsaasEventType,
  overrides: Partial<WebhookEvent> = {},
): WebhookEvent {
  return {
    id: `evt-${type}`,
    type,
    chargeId: 'pay_x',
    externalReference: 'p1',
    status: 'PENDING',
    amount: 0,
    ...overrides,
  };
}

describe('handleAnomaly (via recordChargeConfirmation dispatcher)', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it.each<[AsaasEventType, string]>([
    ['PAYMENT_CHARGEBACK_REQUESTED', 'CHARGEBACK_REQUESTED'],
    ['PAYMENT_CHARGEBACK_DISPUTE', 'CHARGEBACK_DISPUTE'],
    ['PAYMENT_AWAITING_CHARGEBACK_REVERSAL', 'CHARGEBACK_REVERSAL_AWAITING'],
    ['PAYMENT_REPROVED_BY_RISK_ANALYSIS', 'CARD_REPROVED_BY_RISK'],
    ['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'CARD_CAPTURE_REFUSED'],
    ['PAYMENT_RESTORED', 'CHARGE_RESTORED'],
    ['PAYMENT_RECEIVED_IN_CASH_UNDONE', 'CASH_RECEIPT_UNDONE'],
  ])('maps %s → PaymentAnomalyKind=%s and appends to paymentAnomalies', async (
    eventType,
    expectedKind,
  ) => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent(eventType),
    );

    expect(result.kind).toBe('anomaly_recorded');
    if (result.kind !== 'anomaly_recorded') return;
    expect(result.kind_).toBe(expectedKind);
    expect(result.eventId).toBe(`evt-${eventType}`);
    expect(result.anomalyId).toBeTruthy();

    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies).toHaveLength(1);
    expect(stored.paymentAnomalies[0].kind).toBe(expectedKind);
    expect(stored.paymentAnomalies[0].sourceEvent).toBe(eventType);
    expect(stored.paymentAnomalies[0].chargeId).toBe('pay_x');
    expect(stored.paymentAnomalies[0].message).toBeTruthy();
    expect(stored.paymentAnomalies[0].id).toBe(result.anomalyId);
    // Session-state patch from dispatcher still applied.
    expect(stored.paymentSession.processedWebhookEventIds).toEqual([
      `evt-${eventType}`,
    ]);
    expect(stored.lastModifiedBy).toBe('asaas-webhook');
    expect(stored.updatedAt).toBe('SERVER_TS');
  });

  it('does NOT change pedido.status for chargeback / decline / restore signals', async () => {
    seedPedido('p1', { status: 'CONFIRMADO' });
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
        amount: 200,
        status: 'CHARGEBACK_REQUESTED',
      }),
    );
    const stored = store.get('pedidos/p1')!;
    expect(stored.status).toBe('CONFIRMADO');
    expect(stored.statusPagamento).toBe('PENDENTE'); // untouched
  });

  it('initializes paymentAnomalies as a new array when the pedido has no prior anomalies', async () => {
    seedPedido('p1'); // no paymentAnomalies field
    const ref = adminDb.collection('pedidos').doc('p1');
    const stored0 = store.get('pedidos/p1')!;
    expect(stored0.paymentAnomalies).toBeUndefined();

    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED'),
    );

    const stored = store.get('pedidos/p1')!;
    expect(Array.isArray(stored.paymentAnomalies)).toBe(true);
    expect(stored.paymentAnomalies).toHaveLength(1);
  });

  it('appends multiple anomalies for the same chargeId in chronological order', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');

    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
        id: 'evt-a',
        amount: 200,
        status: 'CHARGEBACK_REQUESTED',
      }),
    );
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_DISPUTE', {
        id: 'evt-b',
        amount: 200,
        status: 'CHARGEBACK_DISPUTE',
      }),
    );

    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies).toHaveLength(2);
    expect(stored.paymentAnomalies[0].kind).toBe('CHARGEBACK_REQUESTED');
    expect(stored.paymentAnomalies[1].kind).toBe('CHARGEBACK_DISPUTE');
    expect(stored.paymentAnomalies[0].chargeId).toBe('pay_x');
    expect(stored.paymentAnomalies[1].chargeId).toBe('pay_x');
  });

  it('PAYMENT_DELETED clears paymentSession.chargeId while preserving session audit/idempotency state', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const result = await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_DELETED', {
        id: 'evt-del',
        status: 'DELETED',
      }),
    );

    expect(result.kind).toBe('anomaly_recorded');
    if (result.kind !== 'anomaly_recorded') return;
    expect(result.kind_).toBe('CHARGE_DELETED');

    const stored = store.get('pedidos/p1')!;
    // chargeId is GONE — customer polling can detect this as a dead session.
    expect(stored.paymentSession.chargeId).toBeUndefined();
    // Status is the new DELETED status (from dispatcher's sessionPatch).
    expect(stored.paymentSession.status).toBe('DELETED');
    // Audit / idempotency still intact for replay protection.
    expect(stored.paymentSession.processedWebhookEventIds).toEqual(['evt-del']);
    expect(stored.paymentSession.provider).toBe('asaas');
    // The anomaly was appended.
    expect(stored.paymentAnomalies).toHaveLength(1);
    expect(stored.paymentAnomalies[0].kind).toBe('CHARGE_DELETED');
  });

  it('PAYMENT_RESTORED arriving after PAYMENT_DELETED keeps both anomalies in chronological order', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_DELETED', {
        id: 'evt-del',
        status: 'DELETED',
      }),
    );
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_RESTORED', {
        id: 'evt-rest',
        status: 'PENDING',
      }),
    );

    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies).toHaveLength(2);
    expect(stored.paymentAnomalies[0].kind).toBe('CHARGE_DELETED');
    expect(stored.paymentAnomalies[1].kind).toBe('CHARGE_RESTORED');
    // PAYMENT_RESTORED does NOT re-populate chargeId (Asaas restoration creates
    // a new charge — the customer would re-open a session).
    expect(stored.paymentSession.chargeId).toBeUndefined();
  });

  it('omits `amount` on the anomaly when event.amount is 0', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
        amount: 0,
        status: 'CHARGEBACK_REQUESTED',
      }),
    );
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies[0].amount).toBeUndefined();
    expect('amount' in stored.paymentAnomalies[0]).toBe(false);
  });

  it('omits `amount` on the anomaly when event.amount is undefined', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
        amount: undefined as unknown as number,
        status: 'CHARGEBACK_REQUESTED',
      }),
    );
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies[0].amount).toBeUndefined();
  });

  it('preserves `amount` when event.amount > 0 (e.g. chargeback amount)', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
        amount: 199.9,
        status: 'CHARGEBACK_REQUESTED',
      }),
    );
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies[0].amount).toBe(199.9);
  });

  it('replayed anomaly events are idempotent (no duplicate anomaly appended)', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    const event = makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
      id: 'evt-dup',
      amount: 200,
      status: 'CHARGEBACK_REQUESTED',
    });
    const first = await recordChargeConfirmation(ref as any, event);
    const second = await recordChargeConfirmation(ref as any, event);

    expect(first.kind).toBe('anomaly_recorded');
    expect(second.kind).toBe('idempotent');
    const stored = store.get('pedidos/p1')!;
    expect(stored.paymentAnomalies).toHaveLength(1);
  });

  it('honors a fallback id (`anom-<eventId>`) when crypto.randomUUID is unavailable', async () => {
    const originalCrypto = (globalThis as any).crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      seedPedido('p1');
      const ref = adminDb.collection('pedidos').doc('p1');
      const result = await recordChargeConfirmation(
        ref as any,
        makeAnomalyEvent('PAYMENT_CHARGEBACK_REQUESTED', {
          id: 'evt-no-crypto',
          status: 'CHARGEBACK_REQUESTED',
        }),
      );
      expect(result.kind).toBe('anomaly_recorded');
      if (result.kind !== 'anomaly_recorded') return;
      expect(result.anomalyId).toBe('anom-evt-no-crypto');
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        writable: true,
        value: originalCrypto,
      });
    }
  });

  it('writes lastModifiedBy=asaas-webhook and a server timestamp on updatedAt', async () => {
    seedPedido('p1');
    const ref = adminDb.collection('pedidos').doc('p1');
    await recordChargeConfirmation(
      ref as any,
      makeAnomalyEvent('PAYMENT_REPROVED_BY_RISK_ANALYSIS', {
        amount: 200,
        status: 'FAILED',
      }),
    );
    const stored = store.get('pedidos/p1')!;
    expect(stored.lastModifiedBy).toBe('asaas-webhook');
    expect(stored.updatedAt).toBe('SERVER_TS');
  });

  it('exports an event-type set that matches the kind map (every routed event has a mapping)', () => {
    // Sanity guard so a future addition to the dispatcher set without a kind
    // mapping is caught here instead of as a runtime fall-through.
    const all: AsaasEventType[] = [
      'PAYMENT_DELETED',
      'PAYMENT_RESTORED',
      'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
      'PAYMENT_RECEIVED_IN_CASH_UNDONE',
    ];
    for (const t of all) expect(ANOMALY_EVENT_TYPES.has(t)).toBe(true);
    expect(ANOMALY_EVENT_TYPES.size).toBe(all.length);
  });
});
