import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAsaasProvider } from '@/lib/payments/asaas';

const BASE_URL = 'https://api-sandbox.asaas.com/v3';
const API_KEY = 'test_key';
const WEBHOOK_TOKEN = 'wh_secret';

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('createAsaasProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 4, 25, 12, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('exposes the asaas provider name', () => {
    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    expect(provider.name).toBe('asaas');
  });

  it('ensureCustomer wires through to the underlying client', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ data: [{ id: 'cus_99' }] }));

    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    const res = await provider.ensureCustomer({
      nome: 'A',
      cpfCnpj: '52998224725',
      email: 'a@b.com',
    });
    expect(res.providerCustomerId).toBe('cus_99');
  });

  it('createPixCharge wires through to client (POST + GET)', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(mockResponse({ id: 'pay_p1', status: 'PENDING', value: 10 }))
      .mockResolvedValueOnce(
        mockResponse({ encodedImage: 'i', payload: 'c', expirationDate: '2026-05-26' }),
      );

    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    const res = await provider.createPixCharge({
      pedidoId: 'p1',
      numeroPedido: '1',
      amount: 10,
      description: 'd',
      providerCustomerId: 'cus_1',
    });
    expect(res.chargeId).toBe('pay_p1');
    expect(res.status).toBe('PENDING');
  });

  it('createCardCharge issues a single POST', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockResponse({ id: 'pay_c1', status: 'CONFIRMED', value: 25 }),
    );

    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    const res = await provider.createCardCharge(
      {
        pedidoId: 'p1',
        numeroPedido: '1',
        amount: 25,
        description: 'd',
        providerCustomerId: 'cus_1',
      },
      {
        number: '5162306219378829',
        holderName: 'A B',
        expiryMonth: '12',
        expiryYear: '2030',
        cvv: '318',
      },
      { nome: 'A B', cpfCnpj: '52998224725', email: 'a@b.com' },
    );
    expect(res).toEqual({ chargeId: 'pay_c1', status: 'CONFIRMED', amount: 25 });
  });

  it('getChargeStatus returns normalized status', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ id: 'x', status: 'RECEIVED' }));

    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    expect(await provider.getChargeStatus('x')).toBe('CONFIRMED');
  });

  it('parseWebhook uses the configured webhook token', () => {
    const provider = createAsaasProvider({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      webhookToken: WEBHOOK_TOKEN,
    });
    const headers = new Headers({ 'asaas-access-token': WEBHOOK_TOKEN });
    const body = JSON.stringify({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_w', status: 'RECEIVED', value: 5, billingType: 'PIX' },
    });

    const evt = provider.parseWebhook(body, headers);
    expect(evt?.type).toBe('PAYMENT_RECEIVED');
    expect(evt?.chargeId).toBe('pay_w');
  });

  it('parseWebhook fails closed when no webhookToken is configured', () => {
    const provider = createAsaasProvider({ apiKey: API_KEY, baseUrl: BASE_URL });
    const headers = new Headers({ 'asaas-access-token': 'anything' });
    const body = JSON.stringify({
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_w', status: 'RECEIVED', value: 5 },
    });
    expect(provider.parseWebhook(body, headers)).toBeNull();
  });
});
