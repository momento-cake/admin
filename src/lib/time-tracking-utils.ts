/**
 * Time Tracking Utilities (shared client/server)
 *
 * Pure utility functions with no Firebase dependency.
 * Safe to import from both client components and server API routes.
 */

import { TimeMarking, MarkingType, AuditAction } from '@/types/time-tracking';

// ---------------------------------------------------------------------------
// Marking Order
// ---------------------------------------------------------------------------

const MARKING_ORDER: MarkingType[] = ['clock_in', 'lunch_out', 'lunch_in', 'clock_out'];

/**
 * Get the next expected marking type based on existing markings.
 */
export function getNextMarkingType(markings: TimeMarking[]): MarkingType | null {
  if (markings.length === 0) return 'clock_in';

  const types = markings.map((m) => m.type);
  for (const type of MARKING_ORDER) {
    if (!types.includes(type)) return type;
  }

  return null; // All markings done
}

/**
 * Format a marking type for display.
 */
export function formatMarkingType(type: MarkingType): string {
  const labels: Record<MarkingType, string> = {
    clock_in: 'Entrada',
    lunch_out: 'Saída Almoço',
    lunch_in: 'Retorno Almoço',
    clock_out: 'Saída',
  };
  return labels[type];
}

// ---------------------------------------------------------------------------
// Audit Display Helpers
// ---------------------------------------------------------------------------

/**
 * Format an audit action for display.
 */
export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    create: 'Registro criado',
    update: 'Registro atualizado',
    delete: 'Registro removido',
    manual_create: 'Marcação adicionada manualmente',
    manual_update: 'Marcação editada manualmente',
  };
  return labels[action] || action;
}

/**
 * Format a change field name for display.
 */
export function formatChangeField(field: string): string {
  const fieldLabels: Record<string, string> = {
    'markings': 'Marcações',
    'markings.clock_in': 'Entrada',
    'markings.lunch_out': 'Saída Almoço',
    'markings.lunch_in': 'Retorno Almoço',
    'markings.clock_out': 'Saída',
    'summary.status': 'Status',
    'entry': 'Registro de ponto',
  };
  return fieldLabels[field] || field;
}
