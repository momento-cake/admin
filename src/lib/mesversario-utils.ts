/**
 * Mesversário utilities — date math, labels and progress helpers.
 *
 * Dates are handled as local calendar parts (split on '-') and re-formatted
 * without ever going through a UTC conversion, mirroring the approach in
 * `special-dates-utils.ts`. This avoids the classic "day shifts by one"
 * timezone bug for negative-offset zones like America/Sao_Paulo.
 */

import { addMonths } from 'date-fns';
import type { Mesversario, MesversarioMes, MesStatus } from '@/types/mesversario';
import { MES_STATUS_LABELS } from '@/types/mesversario';

/** Format a Date's local Y/M/D as an ISO YYYY-MM-DD string (no UTC shift). */
function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse an ISO YYYY-MM-DD string into a local-midnight Date. */
function parseLocalIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Compute the 12 monthly celebration dates for a baby, as ISO YYYY-MM-DD
 * strings. Uses date-fns `addMonths`, which clamps the day-of-month when the
 * target month is shorter (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function computeMesversarioDates(birthDate: string): string[] {
  const base = parseLocalIso(birthDate);
  const dates: string[] = [];
  for (let i = 1; i <= 12; i++) {
    dates.push(toLocalIso(addMonths(base, i)));
  }
  return dates;
}

/**
 * Recompute the 12 celebration dates for a new birth date while preserving each
 * month's own state — status, acordo, pedido link and observações all carry
 * over untouched; only `dataComemoracao` shifts. Used when editing a
 * mesversário's birth date so an in-flight journey keeps its agreements.
 */
export function recomputeMesesDates(
  meses: MesversarioMes[],
  newBirthDate: string
): MesversarioMes[] {
  const dates = computeMesversarioDates(newBirthDate);
  return meses.map((mes) => ({
    ...mes,
    dataComemoracao: dates[mes.numero - 1],
  }));
}

/**
 * Human label for a milestone. Months 1..11 use the Portuguese ordinal; month
 * 12 is the first-birthday milestone.
 */
export function getMesLabel(numero: number): string {
  if (numero === 12) return '1 ano 🎉';
  return `${numero}º mês`;
}

/**
 * Whole-day difference between a target ISO date and today (local midnight).
 * Positive for the future, negative for the past, 0 for today. Unlike an
 * annual-birthday calculation this never rolls a past date forward — a
 * mesversário date happens exactly once.
 */
export function daysUntil(iso: string): number {
  const target = parseLocalIso(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Build the initial 12 monthly milestones (all PENDENTE) for a baby.
 */
export function buildMeses(birthDate: string): MesversarioMes[] {
  const dates = computeMesversarioDates(birthDate);
  return dates.map((dataComemoracao, index) => ({
    numero: index + 1,
    dataComemoracao,
    status: 'PENDENTE' as MesStatus,
  }));
}

/** A month counts as "in progress or complete" once an order exists for it. */
function isMesDone(status: MesStatus): boolean {
  return status === 'ENTREGUE' || status === 'PEDIDO_CRIADO';
}

/**
 * Progress across the 12-month journey. `done` counts months that have an
 * order created or already delivered.
 */
export function getMesversarioProgress(m: Mesversario): { done: number; total: number } {
  const done = (m.meses || []).filter((mes) => isMesDone(mes.status)).length;
  return { done, total: 12 };
}

/**
 * The month that still needs attention next — not yet delivered and not
 * skipped. Prefers the nearest celebration that is today or still ahead, since
 * that is the one the family will actually celebrate next. A baby registered
 * mid-journey has earlier pending months whose dates already passed; those are
 * missed celebrations, so they are not treated as the next actionable month
 * unless nothing upcoming remains. Returns null when the journey is settled.
 */
export function getNextDueMes(m: Mesversario): MesversarioMes | null {
  const pending = (m.meses || [])
    .filter((mes) => mes.status !== 'ENTREGUE' && mes.status !== 'PULADO')
    .map((mes) => ({ mes, d: daysUntil(mes.dataComemoracao) }))
    .sort((a, b) => a.d - b.d);
  if (pending.length === 0) return null;

  // Nearest celebration that is today or in the future.
  const upcoming = pending.find((p) => p.d >= 0);
  if (upcoming) return upcoming.mes;

  // Everything left is overdue — surface the most recent past month so an
  // all-overdue journey still shows something to reconcile (agree or skip).
  return pending[pending.length - 1].mes;
}

/** pt-BR label for a month status. */
export function getMesStatusLabel(status: MesStatus): string {
  return MES_STATUS_LABELS[status];
}

const MES_STATUS_COLORS: Record<MesStatus, string> = {
  PENDENTE: 'bg-stone-100 text-stone-700 ring-stone-200',
  EM_CONTATO: 'bg-amber-50 text-amber-800 ring-amber-200',
  ACORDADO: 'bg-sky-50 text-sky-800 ring-sky-200',
  PEDIDO_CRIADO: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  ENTREGUE: 'bg-teal-50 text-teal-800 ring-teal-200',
  PULADO: 'bg-rose-50 text-rose-800 ring-rose-200',
};

/** Tailwind class string (soft bg + text + ring) for a month status badge. */
export function getMesStatusColor(status: MesStatus): string {
  return MES_STATUS_COLORS[status];
}
