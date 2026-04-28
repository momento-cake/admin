import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAsaasClient } from '@/lib/payments/asaas/client';
import { PaymentProviderError } from '@/lib/payments/types';

const BASE_URL = 'https://api-sandbox.asaas.com/v3';
const API_KEY = 'test_api_key_123';

function mockResponse(body: unknown, init: { status?: number; statusText?: string } = {}) {
  const status = init.status ?? 200;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? '',
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

describe('createAsaasClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws when apiKey is missing', () => {
    expect(() => createAsaasClient({ apiKey: '', baseUrl: BASE_URL })).toThrow(/api key/i);
  });

  it('throws when baseUrl is missing', () => {
    expect(() => createAsaasClient({ apiKey: API_KEY, baseUrl: '' })).toThrow(/base url/i);
  });

  it('GET sends access_token header and returns parsed JSON', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ id: 'cus_1' }));

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const result = await client.get<{ id: string }>('/customers/cus_1');

    expect(result).toEqual({ id: 'cus_1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/customers/cus_1`);
    expect(init.method).toBe('GET');
    expect(init.headers.access_token).toBe(API_KEY);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBeUndefined();
  });

  it('POST serializes body and returns parsed JSON', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({ id: 'pay_1', status: 'PENDING' }));

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    const result = await client.post<{ id: string }>('/payments', { value: 10 });

    expect(result.id).toBe('pay_1');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ value: 10 }));
  });

  it('joins baseUrl and path correctly when base has trailing slash', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse({}));

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: `${BASE_URL}/` });
    await client.get('customers');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/customers`);
  });

  it('throws PaymentProviderError with Asaas error code/description on non-2xx', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          errors: [{ code: 'invalid_cpfCnpj', description: 'CPF/CNPJ inválido' }],
        },
        { status: 400, statusText: 'Bad Request' },
      ),
    );

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    await expect(client.post('/customers', {})).rejects.toBeInstanceOf(PaymentProviderError);

    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          errors: [{ code: 'invalid_value', description: 'Valor inválido' }],
        },
        { status: 422 },
      ),
    );

    try {
      await client.post('/payments', {});
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentProviderError);
      const e = err as PaymentProviderError;
      expect(e.providerName).toBe('asaas');
      expect(e.code).toBe('invalid_value');
      expect(e.message).toBe('Valor inválido');
      expect(e.httpStatus).toBe(422);
    }
  });

  it('falls back to http_<status> when Asaas error body is missing', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockResponse('not json', { status: 500, statusText: 'Server Error' }),
    );

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    try {
      await client.get('/anything');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentProviderError);
      const e = err as PaymentProviderError;
      expect(e.code).toBe('http_500');
      expect(e.httpStatus).toBe(500);
    }
  });

  it('uses generic fallback message when both error body and statusText are absent', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse('', { status: 503, statusText: '' }));

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    try {
      await client.get('/anything');
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as PaymentProviderError;
      expect(e.code).toBe('http_503');
      expect(e.message).toBe('Asaas request failed with status 503');
    }
  });

  it('handles empty body on success without throwing', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockResponse('', { status: 204 }));

    const client = createAsaasClient({ apiKey: API_KEY, baseUrl: BASE_URL });
    await expect(client.get('/anything')).resolves.toBeUndefined();
  });
});
