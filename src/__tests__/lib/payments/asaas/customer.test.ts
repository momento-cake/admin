import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureCustomer } from '@/lib/payments/asaas/customer';
import type { AsaasClient } from '@/lib/payments/asaas/client';
import type { BillingInfo } from '@/lib/payments/types';

function makeClient(): { client: AsaasClient; get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> } {
  const get = vi.fn();
  const post = vi.fn();
  return { client: { get, post } as unknown as AsaasClient, get, post };
}

const baseBilling: BillingInfo = {
  nome: 'Maria Silva',
  cpfCnpj: '111.444.777-35',
  email: 'maria@example.com',
  telefone: '(11) 91234-5678',
};

describe('ensureCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing customer id when search has data[0]', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValueOnce({ data: [{ id: 'cus_existing' }] });

    const result = await ensureCustomer(client, baseBilling);

    expect(result.providerCustomerId).toBe('cus_existing');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('/customers?cpfCnpj=11144477735');
    expect(post).not.toHaveBeenCalled();
  });

  it('creates a new customer when search returns empty data', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValueOnce({ data: [] });
    post.mockResolvedValueOnce({ id: 'cus_new' });

    const result = await ensureCustomer(client, baseBilling);

    expect(result.providerCustomerId).toBe('cus_new');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/customers');

    const body = post.mock.calls[0][1];
    expect(body).toMatchObject({
      name: 'Maria Silva',
      cpfCnpj: '11144477735',
      email: 'maria@example.com',
      mobilePhone: '11912345678',
      notificationDisabled: true,
    });
  });

  it('creates customer when search response has no data array', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValueOnce({});
    post.mockResolvedValueOnce({ id: 'cus_x' });

    const result = await ensureCustomer(client, baseBilling);
    expect(result.providerCustomerId).toBe('cus_x');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('omits mobilePhone when telefone is empty/missing', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValueOnce({ data: [] });
    post.mockResolvedValueOnce({ id: 'cus_no_phone' });

    await ensureCustomer(client, { ...baseBilling, telefone: undefined });

    const body = post.mock.calls[0][1];
    expect(body.mobilePhone).toBeUndefined();
  });

  it('sanitizes CPF in search and create payload', async () => {
    const { client, get, post } = makeClient();
    get.mockResolvedValueOnce({ data: [] });
    post.mockResolvedValueOnce({ id: 'cus_sanitize' });

    await ensureCustomer(client, { ...baseBilling, cpfCnpj: '529.982.247-25' });

    expect(get.mock.calls[0][0]).toBe('/customers?cpfCnpj=52998224725');
    expect(post.mock.calls[0][1].cpfCnpj).toBe('52998224725');
  });
});
