import type {
  BillingInfo,
  CardChargeResult,
  CardPaymentInput,
  ChargeRequest,
  NormalizedChargeStatus,
  PixChargeResult,
} from '../types';
import { stripDocumentDigits } from '../../validators/billing';
import type { AsaasClient } from './client';
import { normalizeAsaasStatus } from './normalize';

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  externalReference?: string;
  billingType?: string;
}

interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

/**
 * Format `date` as a YYYY-MM-DD string in UTC. Asaas treats `dueDate` as
 * a calendar day, so we use UTC consistently to avoid drift across timezones.
 */
function formatYmdUtc(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function tomorrowYmdUtc(now: Date = new Date()): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return formatYmdUtc(d);
}

export async function createPixCharge(
  client: AsaasClient,
  req: ChargeRequest,
): Promise<PixChargeResult> {
  const payment = await client.post<AsaasPayment>('/payments', {
    customer: req.providerCustomerId,
    billingType: 'PIX',
    value: req.amount,
    dueDate: tomorrowYmdUtc(),
    description: req.description,
    externalReference: req.externalReference,
  });

  const qr = await client.get<AsaasPixQrCode>(`/payments/${payment.id}/pixQrCode`);

  return {
    chargeId: payment.id,
    status: normalizeAsaasStatus(payment.status),
    amount: payment.value,
    qrCodeBase64: qr.encodedImage,
    copyPaste: qr.payload,
    expiresAt: new Date(qr.expirationDate),
  };
}

export async function createCardCharge(
  client: AsaasClient,
  req: ChargeRequest,
  card: CardPaymentInput,
  holder: BillingInfo,
): Promise<CardChargeResult> {
  const holderPhone = holder.telefone ? stripDocumentDigits(holder.telefone) : '';

  const payment = await client.post<AsaasPayment>('/payments', {
    customer: req.providerCustomerId,
    billingType: 'CREDIT_CARD',
    value: req.amount,
    dueDate: tomorrowYmdUtc(),
    description: req.description,
    externalReference: req.externalReference,
    creditCard: {
      holderName: card.holderName,
      number: card.number,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      ccv: card.cvv,
    },
    creditCardHolderInfo: {
      name: holder.nome,
      email: holder.email,
      cpfCnpj: stripDocumentDigits(holder.cpfCnpj),
      postalCode: '00000000',
      addressNumber: '0',
      mobilePhone: holderPhone,
    },
    remoteIp: card.remoteIp,
  });

  return {
    chargeId: payment.id,
    status: normalizeAsaasStatus(payment.status),
    amount: payment.value,
  };
}

export async function getChargeStatus(
  client: AsaasClient,
  chargeId: string,
): Promise<NormalizedChargeStatus> {
  const payment = await client.get<AsaasPayment>(`/payments/${encodeURIComponent(chargeId)}`);
  return normalizeAsaasStatus(payment?.status);
}

// Exported for tests.
export const __test__ = { tomorrowYmdUtc, formatYmdUtc };
