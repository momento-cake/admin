import { Timestamp } from 'firebase/firestore';
import { Address } from '@/types/client';
import type {
  PedidoBilling as PaymentsPedidoBilling,
  PedidoPaymentSession as PaymentsPedidoPaymentSession,
} from '@/lib/payments/types';

// Re-export store settings types so consumers can import from either file
export type { StoreAddress, StoreSettings, StoreHours } from '@/types/store-settings';
export { DIAS_SEMANA } from '@/types/store-settings';

/**
 * Customer billing snapshot captured during the public checkout (CPF/CNPJ etc.).
 * Re-exported from `@/lib/payments/types` so Pedido consumers can refer to it
 * via the same module that owns the rest of the Pedido shape.
 */
export type PedidoBilling = PaymentsPedidoBilling;

/**
 * In-flight payment session attached to a pedido (PIX or card via Asaas).
 * Re-exported from `@/lib/payments/types` for the same reason as `PedidoBilling`.
 */
export type PedidoPaymentSession = PaymentsPedidoPaymentSession;

// ============================================================================
// ENUMS / TYPE UNIONS
// ============================================================================

export type PedidoStatus =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO'
  | 'CONFIRMADO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'EM_PRODUCAO'
  | 'PRONTO'
  | 'ENTREGUE'
  | 'CANCELADO';

export type OrcamentoStatus =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'APROVADO'
  | 'REJEITADO';

export type EntregaTipo = 'ENTREGA' | 'RETIRADA';

export type DescontoTipo = 'valor' | 'percentual';

export type NfStatus = 'PENDENTE' | 'EMITIDA' | 'CANCELADA';

export type PagamentoMetodo =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'
  | 'TRANSFERENCIA'
  | 'OUTRO';

export type StatusPagamento = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'VENCIDO';

// ============================================================================
// LABELS
// ============================================================================

export const PEDIDO_STATUS_LABELS: Record<PedidoStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  CONFIRMADO: 'Confirmado',
  AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
  EM_PRODUCAO: 'Em Produção',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const PAGAMENTO_METODO_LABELS: Record<PagamentoMetodo, string> = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  OUTRO: 'Outro',
};

export const STATUS_PAGAMENTO_LABELS: Record<StatusPagamento, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  VENCIDO: 'Vencido',
};

export const ORCAMENTO_STATUS_LABELS: Record<OrcamentoStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
};

export const ENTREGA_TIPO_LABELS: Record<EntregaTipo, string> = {
  ENTREGA: 'Entrega',
  RETIRADA: 'Retirada',
};

// ============================================================================
// EMBEDDED INTERFACES
// ============================================================================

/**
 * A single item within an orcamento (quote).
 * Can be linked to a product or be a custom line item.
 */
export interface PedidoItem {
  id: string;
  produtoId?: string | null;
  nome: string;
  descricao?: string;
  precoUnitario: number;
  quantidade: number;
  total: number;
}

/**
 * A quote version embedded in a Pedido.
 * Only one orcamento can be active (isAtivo) at a time.
 */
export interface Orcamento {
  id: string;
  versao: number;
  isAtivo: boolean;
  status: OrcamentoStatus;
  itens: PedidoItem[];
  subtotal: number;
  desconto: number;
  descontoTipo: DescontoTipo;
  acrescimo: number;
  total: number;
  criadoEm: Timestamp;
  criadoPor: string;
}

/**
 * Internal packaging for a pedido.
 * Not visible on the public page.
 */
export interface PedidoPacote {
  id: string;
  nome: string;
  custo: number;
  itemIds: string[];
}

/**
 * A single payment event recorded against a pedido.
 * Multiple Pagamento records accumulate against the order total.
 */
export interface Pagamento {
  id: string;
  data: Timestamp;
  valor: number;
  metodo: PagamentoMetodo;
  observacao?: string;
  comprovanteUrl?: string | null;
  comprovantePath?: string | null;
  comprovanteTipo?: 'pdf' | 'image' | null;
  createdAt: Timestamp;
  createdBy: string;
}

/**
 * Anomaly record — chargebacks, deletions, restorations, card declines after
 * approval. Captured separately from `pagamentos` so the money log stays a
 * pure record of receipts/refunds while the operational signals stay queryable.
 */
export type PaymentAnomalyKind =
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'CHARGEBACK_REVERSAL_AWAITING'
  | 'CARD_REPROVED_BY_RISK'
  | 'CARD_CAPTURE_REFUSED'
  | 'CHARGE_DELETED'
  | 'CHARGE_RESTORED'
  | 'CASH_RECEIPT_UNDONE';

export interface PaymentAnomaly {
  id: string;
  kind: PaymentAnomalyKind;
  /** The Asaas event name that triggered this anomaly, for traceability. */
  sourceEvent: string;
  /** The Asaas charge id involved. */
  chargeId: string;
  /** Optional amount associated with the event (e.g. chargeback amount). */
  amount?: number;
  /** Free-form description shown to ops. */
  message: string;
  recordedAt: Timestamp;
}

export const PAYMENT_ANOMALY_LABELS: Record<PaymentAnomalyKind, string> = {
  CHARGEBACK_REQUESTED: 'Chargeback solicitado',
  CHARGEBACK_DISPUTE: 'Chargeback em disputa',
  CHARGEBACK_REVERSAL_AWAITING: 'Aguardando estorno de chargeback',
  CARD_REPROVED_BY_RISK: 'Cartão reprovado na análise de risco',
  CARD_CAPTURE_REFUSED: 'Captura de cartão recusada',
  CHARGE_DELETED: 'Cobrança removida no Asaas',
  CHARGE_RESTORED: 'Cobrança restaurada no Asaas',
  CASH_RECEIPT_UNDONE: 'Recebimento em dinheiro desfeito',
};

/**
 * Delivery / pickup details for a pedido.
 */
export interface PedidoEntrega {
  tipo: EntregaTipo;

  // Delivery fields
  enderecoEntrega?: Address;
  enderecoEntregaClienteId?: string;
  distanciaKm?: number;
  custoPorKm: number;
  taxaExtra: number;
  taxaExtraNota?: string;
  freteTotal: number;

  // Pickup fields
  enderecoRetiradaId?: string;
  enderecoRetiradaNome?: string;
}

// ============================================================================
// MAIN PEDIDO INTERFACE
// ============================================================================

export interface Pedido {
  id: string;

  // Reference
  numeroPedido: string;
  publicToken: string;

  // Client
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;

  // Status
  status: PedidoStatus;

  // Orcamentos (embedded)
  orcamentos: Orcamento[];

  // Packaging (internal only)
  pacotes: PedidoPacote[];

  // Delivery
  entrega: PedidoEntrega;

  // Dates
  dataEntrega?: Timestamp;
  observacoes?: string;
  observacoesCliente?: string;

  // Payments
  pagamentos: Pagamento[];
  totalPago: number;
  dataVencimento: Timestamp;
  statusPagamento: StatusPagamento;

  // NF placeholder fields
  nfStatus?: NfStatus | null;
  nfProvider?: string | null;
  nfExternalId?: string | null;
  nfEmittedAt?: Timestamp | null;

  // Customer self-service checkout
  billing?: PedidoBilling;
  paymentSession?: PedidoPaymentSession;

  // Operational signals from the payment provider that aren't pure money flow
  // (chargebacks, card declines after approval, charge deletions, etc.).
  // Optional and append-only.
  paymentAnomalies?: PaymentAnomaly[];

  // Metadata
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy?: string;
}

// Store settings types are defined in @/types/store-settings and re-exported above.

export interface PedidoCounter {
  lastNumber: number;
}

// ============================================================================
// FORM / REQUEST DATA INTERFACES
// ============================================================================

export interface CreatePedidoData {
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  status?: PedidoStatus;
  orcamentos?: CreateOrcamentoData[];
  pacotes?: PedidoPacote[];
  entrega: PedidoEntrega;
  dataEntrega?: Timestamp;
  observacoes?: string;
  observacoesCliente?: string;
}

export interface UpdatePedidoData {
  clienteId?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  status?: PedidoStatus;
  pacotes?: PedidoPacote[];
  entrega?: PedidoEntrega;
  dataEntrega?: Timestamp | null;
  dataVencimento?: Timestamp;
  observacoes?: string;
  observacoesCliente?: string;
  nfStatus?: NfStatus | null;
  nfProvider?: string | null;
  nfExternalId?: string | null;
  nfEmittedAt?: Timestamp | null;
}

export interface CreatePagamentoData {
  data: Date;
  valor: number;
  metodo: PagamentoMetodo;
  observacao?: string;
  comprovanteUrl?: string | null;
  comprovantePath?: string | null;
  comprovanteTipo?: 'pdf' | 'image' | null;
}

export interface CreateOrcamentoData {
  itens: PedidoItem[];
  desconto?: number;
  descontoTipo?: DescontoTipo;
  acrescimo?: number;
}

export interface UpdateOrcamentoData {
  status?: OrcamentoStatus;
  itens?: PedidoItem[];
  desconto?: number;
  descontoTipo?: DescontoTipo;
  acrescimo?: number;
}

// ============================================================================
// QUERY / FILTER INTERFACES
// ============================================================================

export interface PedidoFilters {
  searchQuery?: string;
  status?: PedidoStatus;
  clienteId?: string;
  /** Inclusive lower bound on `dataEntrega`, ISO YYYY-MM-DD. */
  dateFrom?: string;
  /** Inclusive upper bound on `dataEntrega`, ISO YYYY-MM-DD. */
  dateTo?: string;
}

export interface PedidoQueryFilters extends PedidoFilters {
  limit?: number;
  page?: number;
  sortBy?: 'createdAt' | 'numeroPedido' | 'dataEntrega';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface PedidosResponse {
  pedidos: Pedido[];
  total: number;
  count: number;
}
