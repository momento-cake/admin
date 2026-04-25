import type { BillingInfo } from '../types';
import { stripDocumentDigits } from '../../validators/billing';
import type { AsaasClient } from './client';

interface AsaasCustomerListResponse {
  data?: Array<{ id: string }>;
}

interface AsaasCustomer {
  id: string;
}

/**
 * Find an existing Asaas customer by CPF/CNPJ; create one if none is found.
 * Returns `{ providerCustomerId }` for the existing or newly created customer.
 *
 * Notes:
 * - CPF/CNPJ is sanitized to digits only before the API call.
 * - `notificationDisabled: true` because the merchant (not Asaas) drives
 *   customer-facing communication for this storefront.
 */
export async function ensureCustomer(
  client: AsaasClient,
  billing: BillingInfo,
): Promise<{ providerCustomerId: string }> {
  const cpfCnpj = stripDocumentDigits(billing.cpfCnpj);

  const search = await client.get<AsaasCustomerListResponse>(
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
  );

  const existing = search?.data?.[0];
  if (existing?.id) {
    return { providerCustomerId: existing.id };
  }

  const phone = billing.telefone ? stripDocumentDigits(billing.telefone) : '';

  const payload: Record<string, unknown> = {
    name: billing.nome,
    cpfCnpj,
    email: billing.email,
    notificationDisabled: true,
  };
  if (phone) {
    payload.mobilePhone = phone;
  }

  const created = await client.post<AsaasCustomer>('/customers', payload);
  return { providerCustomerId: created.id };
}
