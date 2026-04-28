import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCardCharge,
  createPixCharge,
  getChargeStatus,
  __test__,
} from '@/lib/payments/asaas/charge';
import type { AsaasClient } from '@/lib/payments/asaas/client';
import type { BillingInfo, CardPaymentInput, ChargeRequest } from '@/lib/payments/types';

function makeClient(): { client: AsaasClient; get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> } {
  const get = vi.fn();
  const post = vi.fn();
  return { client: { get, post } as unknown as AsaasClient, get, post };
}

const billing: BillingInfo = {
  nome: 'João Doe',
  cpfCnpj: '529.982.247-25',
  email: 'joao@example.com',
  telefone: '(11) 99999-1111',
};

const baseReq: ChargeRequest = {
  pedidoId: 'p1',
  numeroPedido: '0001',
  amount: 150.5,
  description: 'Pedido #0001',
  providerCustomerId: 'cus_1',
  externalReference: 'p1',
};

const card: CardPaymentInput = {
  number: '5162306219378829',
  holderName: 'JOAO DOE',
  expiryMonth: '12',
  expiryYear: '2030',
  cvv: '318',
  remoteIp: '127.0.0.1',
};

describe('formatYmdUtc / tomorrowYmdUtc', () => {
  it('formats UTC date as YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2026, 0, 5, 12, 0, 0));
    expect(__test__.formatYmdUtc(d)).toBe('2026-01-05');
  });

  it('tomorrow is one day after now in UTC', () => {
    const fixed = new Date(Date.UTC(2026, 4, 25, 23, 30, 0));
    const result = __test__.tomorrowYmdUtc(fixed);
    expect(result).toBe('2026-05-26');
  });

  it('tomorrow uses current date by default', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 10, 0, 0, 0)));
    expect(__test__.tomorrowYmdUtc()).toBe('2026-06-11');
    vi.useRealTimers();
  });
});

describe('createPixCharge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 25, 12, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a PIX payment then fetches the QR code and returns mapped result', async () => {
    const { client, get, post } = makeClient();
    post.mockResolvedValueOnce({
      id: 'pay_pix_1',
      status: 'PENDING',
      value: 150.5,
    });
    get.mockResolvedValueOnce({
      encodedImage: 'BASE64IMG',
      payload: '00020126...',
      expirationDate: '2026-05-26 23:59:59',
    });

    const result = await createPixCharge(client, baseReq);

    // First call: create payment
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/payments');
    expect(post.mock.calls[0][1]).toEqual({
      customer: 'cus_1',
      billingType: 'PIX',
      value: 150.5,
      dueDate: '2026-05-26',
      description: 'Pedido #0001',
      externalReference: 'p1',
    });

    // Second call: pixQrCode
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('/payments/pay_pix_1/pixQrCode');

    expect(result).toEqual({
      chargeId: 'pay_pix_1',
      status: 'PENDING',
      amount: 150.5,
      qrCodeBase64: 'BASE64IMG',
      copyPaste: '00020126...',
      expiresAt: new Date('2026-05-26 23:59:59'),
    });
  });

  it('normalizes confirmed/refunded/expired statuses', async () => {
    const { client, get, post } = makeClient();
    post.mockResolvedValueOnce({ id: 'p1', status: 'CONFIRMED', value: 10 });
    get.mockResolvedValueOnce({ encodedImage: 'a', payload: 'b', expirationDate: '2026-12-01' });
    expect((await createPixCharge(client, baseReq)).status).toBe('CONFIRMED');

    post.mockResolvedValueOnce({ id: 'p2', status: 'OVERDUE', value: 10 });
    get.mockResolvedValueOnce({ encodedImage: 'a', payload: 'b', expirationDate: '2026-12-01' });
    expect((await createPixCharge(client, baseReq)).status).toBe('EXPIRED');

    post.mockResolvedValueOnce({ id: 'p3', status: 'REFUNDED', value: 10 });
    get.mockResolvedValueOnce({ encodedImage: 'a', payload: 'b', expirationDate: '2026-12-01' });
    expect((await createPixCharge(client, baseReq)).status).toBe('REFUNDED');

    post.mockResolvedValueOnce({ id: 'p4', status: 'SOMETHING_NEW', value: 10 });
    get.mockResolvedValueOnce({ encodedImage: 'a', payload: 'b', expirationDate: '2026-12-01' });
    expect((await createPixCharge(client, baseReq)).status).toBe('FAILED');
  });

  it('propagates errors from underlying client', async () => {
    const { client, post } = makeClient();
    post.mockRejectedValueOnce(new Error('boom'));
    await expect(createPixCharge(client, baseReq)).rejects.toThrow('boom');
  });
});

describe('createCardCharge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 25, 12, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts CREDIT_CARD payment with sanitized holder fields and placeholder address', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValueOnce({ id: 'pay_card_1', status: 'CONFIRMED', value: 200 });

    const result = await createCardCharge(
      client,
      { ...baseReq, amount: 200 },
      card,
      billing,
    );

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/payments');
    const body = post.mock.calls[0][1];
    expect(body).toMatchObject({
      customer: 'cus_1',
      billingType: 'CREDIT_CARD',
      value: 200,
      dueDate: '2026-05-26',
      description: 'Pedido #0001',
      externalReference: 'p1',
      remoteIp: '127.0.0.1',
      creditCard: {
        holderName: 'JOAO DOE',
        number: '5162306219378829',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '318',
      },
      creditCardHolderInfo: {
        name: 'João Doe',
        email: 'joao@example.com',
        cpfCnpj: '52998224725',
        postalCode: '00000000',
        addressNumber: '0',
        mobilePhone: '11999991111',
      },
    });

    expect(result).toEqual({
      chargeId: 'pay_card_1',
      status: 'CONFIRMED',
      amount: 200,
    });
  });

  it('sends empty mobilePhone when holder telefone is missing', async () => {
    const { client, post } = makeClient();
    post.mockResolvedValueOnce({ id: 'pay_2', status: 'CONFIRMED', value: 50 });

    await createCardCharge(client, baseReq, card, { ...billing, telefone: undefined });

    expect(post.mock.calls[0][1].creditCardHolderInfo.mobilePhone).toBe('');
  });
});

describe('getChargeStatus', () => {
  it('returns normalized status for a known charge id', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValueOnce({ id: 'pay_X', status: 'RECEIVED', value: 1 });

    const status = await getChargeStatus(client, 'pay_X');
    expect(get.mock.calls[0][0]).toBe('/payments/pay_X');
    expect(status).toBe('CONFIRMED');
  });

  it('returns FAILED on unknown status', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValueOnce({ id: 'pay_X', status: 'UNKNOWN' });
    expect(await getChargeStatus(client, 'pay_X')).toBe('FAILED');
  });

  it('encodes the charge id in the path', async () => {
    const { client, get } = makeClient();
    get.mockResolvedValueOnce({ id: 'a/b', status: 'PENDING' });
    await getChargeStatus(client, 'a/b');
    expect(get.mock.calls[0][0]).toBe('/payments/a%2Fb');
  });
});
