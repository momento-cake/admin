import { describe, expect, it } from 'vitest';
import { parseAsaasWebhook, verifyAsaasToken } from '@/lib/payments/asaas/webhook';

const TOKEN = 'webhook_secret_token';

function makeHeaders(values: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(values)) {
    h.set(k, v);
  }
  return h;
}

describe('verifyAsaasToken', () => {
  it('returns true when token matches', () => {
    expect(verifyAsaasToken(makeHeaders({ 'asaas-access-token': TOKEN }), TOKEN)).toBe(true);
  });

  it('returns false on mismatch', () => {
    expect(verifyAsaasToken(makeHeaders({ 'asaas-access-token': 'other' }), TOKEN)).toBe(false);
  });

  it('returns false when header is missing', () => {
    expect(verifyAsaasToken(makeHeaders({}), TOKEN)).toBe(false);
  });

  it('fails closed when expectedToken is undefined or empty', () => {
    expect(verifyAsaasToken(makeHeaders({ 'asaas-access-token': 'x' }), undefined)).toBe(false);
    expect(verifyAsaasToken(makeHeaders({ 'asaas-access-token': 'x' }), '')).toBe(false);
  });
});

describe('parseAsaasWebhook', () => {
  const validHeaders = makeHeaders({ 'asaas-access-token': TOKEN });

  function payload(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: 'pay_123',
        status: 'CONFIRMED',
        value: 99.9,
        externalReference: 'pedido_42',
        billingType: 'PIX',
        paymentDate: '2026-04-25',
        ...((overrides.payment ?? {}) as object),
      },
      ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== 'payment')),
    });
  }

  it('returns a mapped WebhookEvent on a valid PIX confirmation', () => {
    const evt = parseAsaasWebhook(payload(), validHeaders, TOKEN);
    expect(evt).not.toBeNull();
    expect(evt).toMatchObject({
      id: 'PAYMENT_CONFIRMED:pay_123',
      type: 'PAYMENT_CONFIRMED',
      chargeId: 'pay_123',
      externalReference: 'pedido_42',
      status: 'CONFIRMED',
      amount: 99.9,
      paymentMethod: 'PIX',
    });
    expect(evt?.paymentDate).toBeInstanceOf(Date);
  });

  it('maps CREDIT_CARD billing type to CARTAO_CREDITO', () => {
    const evt = parseAsaasWebhook(
      payload({ payment: { billingType: 'CREDIT_CARD' } }),
      validHeaders,
      TOKEN,
    );
    expect(evt?.paymentMethod).toBe('CARTAO_CREDITO');
  });

  it('returns paymentMethod undefined for unknown billing types', () => {
    const evt = parseAsaasWebhook(
      payload({ payment: { billingType: 'BOLETO' } }),
      validHeaders,
      TOKEN,
    );
    expect(evt?.paymentMethod).toBeUndefined();
  });

  it.each([
    ['PAYMENT_CONFIRMED', 'PAYMENT_CONFIRMED'],
    ['PAYMENT_RECEIVED', 'PAYMENT_RECEIVED'],
    ['PAYMENT_OVERDUE', 'PAYMENT_OVERDUE'],
    ['PAYMENT_REFUNDED', 'PAYMENT_REFUNDED'],
    ['PAYMENT_DELETED', 'PAYMENT_DELETED'],
  ])('maps event %s to type %s', (event, expected) => {
    const evt = parseAsaasWebhook(payload({ event }), validHeaders, TOKEN);
    expect(evt?.type).toBe(expected);
  });

  it('maps unknown event to OTHER and still preserves chargeId', () => {
    const evt = parseAsaasWebhook(
      payload({ event: 'PAYMENT_CHECKOUT_VIEWED' }),
      validHeaders,
      TOKEN,
    );
    expect(evt?.type).toBe('OTHER');
    expect(evt?.chargeId).toBe('pay_123');
    expect(evt?.id).toBe('PAYMENT_CHECKOUT_VIEWED:pay_123');
  });

  it('returns null when token is invalid', () => {
    const headers = makeHeaders({ 'asaas-access-token': 'wrong' });
    expect(parseAsaasWebhook(payload(), headers, TOKEN)).toBeNull();
  });

  it('returns null when token is missing entirely', () => {
    expect(parseAsaasWebhook(payload(), makeHeaders({}), TOKEN)).toBeNull();
  });

  it('returns null when expectedToken is not configured', () => {
    expect(parseAsaasWebhook(payload(), validHeaders, undefined)).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(parseAsaasWebhook('not-json', validHeaders, TOKEN)).toBeNull();
  });

  it('returns null when event or payment.id is missing', () => {
    const noEvent = JSON.stringify({ payment: { id: 'p_1', status: 'CONFIRMED', value: 1 } });
    expect(parseAsaasWebhook(noEvent, validHeaders, TOKEN)).toBeNull();

    const noPayment = JSON.stringify({ event: 'PAYMENT_CONFIRMED' });
    expect(parseAsaasWebhook(noPayment, validHeaders, TOKEN)).toBeNull();

    const noPaymentId = JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { status: 'CONFIRMED' } });
    expect(parseAsaasWebhook(noPaymentId, validHeaders, TOKEN)).toBeNull();
  });

  it('uses 0 amount when value is missing or non-numeric', () => {
    const noValue = JSON.stringify({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'p1', status: 'CONFIRMED' },
    });
    const evt = parseAsaasWebhook(noValue, validHeaders, TOKEN);
    expect(evt?.amount).toBe(0);
  });

  it('handles missing paymentDate gracefully', () => {
    const body = JSON.stringify({
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'p1', status: 'CONFIRMED', value: 10 },
    });
    const evt = parseAsaasWebhook(body, validHeaders, TOKEN);
    expect(evt?.paymentDate).toBeUndefined();
  });

  it('builds idempotency id as `${event}:${paymentId}`', () => {
    const evt1 = parseAsaasWebhook(payload(), validHeaders, TOKEN);
    const evt2 = parseAsaasWebhook(payload(), validHeaders, TOKEN);
    expect(evt1?.id).toBe('PAYMENT_CONFIRMED:pay_123');
    expect(evt2?.id).toBe(evt1?.id);
  });
});
