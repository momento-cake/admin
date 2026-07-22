import { Timestamp } from 'firebase/firestore';
import { PedidoImagemReferencia, PedidoImagemReferenciaInput } from '@/types/pedido';

// ============================================================================
// ENUMS / TYPE UNIONS
// ============================================================================

/**
 * Lifecycle status of a whole mesversário journey (one per baby).
 */
export type MesversarioStatus = 'ATIVO' | 'CONCLUIDO' | 'CANCELADO';

/**
 * Status of a single monthly milestone within a mesversário.
 */
export type MesStatus =
  | 'PENDENTE'
  | 'EM_CONTATO'
  | 'ACORDADO'
  | 'PEDIDO_CRIADO'
  | 'ENTREGUE'
  | 'PULADO';

// ============================================================================
// LABELS
// ============================================================================

export const MESVERSARIO_STATUS_LABELS: Record<MesversarioStatus, string> = {
  ATIVO: 'Ativo',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export const MES_STATUS_LABELS: Record<MesStatus, string> = {
  PENDENTE: 'Pendente',
  EM_CONTATO: 'Em contato',
  ACORDADO: 'Acordado',
  PEDIDO_CRIADO: 'Pedido criado',
  ENTREGUE: 'Entregue',
  PULADO: 'Pulado',
};

// ============================================================================
// EMBEDDED INTERFACES
// ============================================================================

/**
 * The agreement captured with the family for a given month: theme, flavor,
 * free notes and reference images. All fields optional — it fills in as the
 * conversation with the family progresses.
 */
export interface MesversarioAcordo {
  tema?: string;
  sabor?: string;
  notas?: string;
  imagensReferencia?: PedidoImagemReferencia[];
}

/**
 * A single monthly milestone. Months 1..12 (12 = "1 ano").
 */
export interface MesversarioMes {
  numero: number;
  /** ISO date (YYYY-MM-DD) of this month's celebration. */
  dataComemoracao: string;
  status: MesStatus;
  acordo?: MesversarioAcordo;
  pedidoId?: string;
  pedidoNumero?: string;
  observacoes?: string;
  atualizadoEm?: Timestamp;
}

// ============================================================================
// MAIN MESVERSARIO INTERFACE
// ============================================================================

export interface Mesversario {
  id: string;

  // Client (denormalized snapshot)
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;

  // Baby — sourced from the client's RelatedPerson of relationship 'child'
  relatedPersonId: string;
  bebeNome: string;
  /** ISO date (YYYY-MM-DD) of birth. */
  dataNascimento: string;

  status: MesversarioStatus;
  meses: MesversarioMes[];
  observacoes?: string;

  // Metadata
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

// ============================================================================
// FORM / REQUEST DATA INTERFACES
// ============================================================================

export interface CreateMesversarioData {
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  relatedPersonId: string;
  bebeNome: string;
  /** ISO date (YYYY-MM-DD). */
  dataNascimento: string;
  observacoes?: string;
}

/**
 * Client-supplied acordo shape (reference images before server stamping).
 */
export interface MesversarioAcordoInput {
  tema?: string;
  sabor?: string;
  notas?: string;
  imagensReferencia?: PedidoImagemReferenciaInput[];
}

export interface UpdateMesData {
  status?: MesStatus;
  acordo?: MesversarioAcordoInput;
  observacoes?: string;
}

export interface UpdateMesversarioData {
  bebeNome?: string;
  /** ISO date (YYYY-MM-DD). Changing it recomputes the 12 celebration dates. */
  dataNascimento?: string;
  status?: MesversarioStatus;
  observacoes?: string;
}

export interface LinkPedidoData {
  pedidoId: string;
  pedidoNumero: string;
}

// ============================================================================
// QUERY / FILTER INTERFACES
// ============================================================================

export interface MesversarioFilters {
  status?: MesversarioStatus;
}

// ============================================================================
// VIEW / DASHBOARD INTERFACES
// ============================================================================

/**
 * A flattened "next-due month" per baby, used to power the dashboard buckets.
 */
export interface MesversarioDashboardEntry {
  clienteId: string;
  clienteNome: string;
  mesversarioId: string;
  bebeNome: string;
  numero: number;
  dataComemoracao: string;
  status: MesStatus;
  daysUntil: number;
  relativeLabel: string;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface MesversariosResponse {
  mesversarios: Mesversario[];
  total: number;
  count: number;
}
