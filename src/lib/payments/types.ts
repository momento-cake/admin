import type { Timestamp } from 'firebase-admin/firestore';

export type PaymentProviderName = 'asaas';

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO';

export type NormalizedChargeStatus =
  | 'PENDING'
  | 'PENDING_RISK_ANALYSIS'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'DELETED';

export interface BillingInfo {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone?: string;
}

export interface ChargeRequest {
  pedidoId: string;
  numeroPedido: string;
  amount: number;
  description: string;
  providerCustomerId: string;
  externalReference?: string;
}

export interface PixChargeResult {
  chargeId: string;
  status: NormalizedChargeStatus;
  amount: number;
  qrCodeBase64: string;
  copyPaste: string;
  expiresAt: Date;
}

export interface CardChargeResult {
  chargeId: string;
  status: NormalizedChargeStatus;
  amount: number;
}

export interface CardPaymentInput {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  remoteIp?: string;
}

/**
 * Every Asaas webhook event we know about. Anything outside this set normalizes
 * to `'OTHER'` and is treated as observational only.
 */
export type AsaasEventType =
  // Lifecycle
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  // Money landed
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_ANTICIPATED'
  // Card risk pipeline
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
  | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED'
  // Negative / reversal
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'PAYMENT_REFUND_IN_PROGRESS'
  | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
  // Chargebacks
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
  // Collection
  | 'PAYMENT_DUNNING_RECEIVED'
  | 'PAYMENT_DUNNING_REQUESTED'
  // Splits
  | 'PAYMENT_SPLIT_CANCELLED'
  | 'PAYMENT_SPLIT_DIVERGENCE_BLOCK'
  | 'PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED'
  // Analytics
  | 'PAYMENT_CHECKOUT_VIEWED'
  | 'PAYMENT_BANK_SLIP_VIEWED'
  // Anything else Asaas may send in the future
  | 'OTHER';

export interface WebhookEvent {
  id: string;
  type: AsaasEventType;
  chargeId: string;
  externalReference?: string;
  status: NormalizedChargeStatus;
  amount: number;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
}

export interface PedidoPaymentSession {
  provider: PaymentProviderName;
  providerCustomerId: string;
  chargeId: string;
  method: PaymentMethod;
  status: NormalizedChargeStatus;
  amount: number;
  pixQrCodeBase64?: string;
  pixCopyPaste?: string;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  lastWebhookAt?: Timestamp;
  processedWebhookEventIds?: string[];
}

export interface PedidoBilling {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone?: string;
  confirmedAt: Timestamp;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly providerName: PaymentProviderName,
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
