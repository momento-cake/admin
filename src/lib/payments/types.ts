import type { Timestamp } from 'firebase-admin/firestore';

export type PaymentProviderName = 'asaas';

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO';

export type NormalizedChargeStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

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

export interface WebhookEvent {
  id: string;
  type: 'PAYMENT_CONFIRMED' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'PAYMENT_REFUNDED' | 'PAYMENT_DELETED' | 'OTHER';
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
