import type {
  Pagamento,
  Pedido,
  StatusPagamento,
} from '@/types/pedido';

/**
 * Rounds a currency amount to 2 decimal places, avoiding IEEE-754 drift
 * (e.g. 0.1 + 0.2 = 0.30000000000000004 → 0.3).
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Derives the payment lifecycle status for a pedido.
 *
 * PAGO      — fully paid (even if past due).
 * PARCIAL   — partial payment, not yet past due.
 * VENCIDO   — past due AND not fully paid (regardless of partial or zero).
 * PENDENTE  — no payments, not past due.
 *
 * Vencimento on the same day as `now` counts as not-yet-overdue.
 */
export function deriveStatusPagamento(args: {
  total: number;
  totalPago: number;
  dataVencimento: Date;
  now: Date;
}): StatusPagamento {
  const total = roundCurrency(args.total);
  const pago = roundCurrency(args.totalPago);

  if (pago >= total && total > 0) return 'PAGO';
  if (total === 0 && pago > 0) return 'PAGO';

  const endOfVenc = new Date(args.dataVencimento);
  endOfVenc.setHours(23, 59, 59, 999);
  const overdue = args.now.getTime() > endOfVenc.getTime();

  if (pago > 0) return overdue ? 'VENCIDO' : 'PARCIAL';
  return overdue ? 'VENCIDO' : 'PENDENTE';
}

/**
 * Computes the billable total for a pedido = active orcamento total + freight.
 */
export function calcularTotalPedido(pedido: Pedido): number {
  const active = pedido.orcamentos.find((o) => o.isAtivo);
  const orcTotal = active?.total ?? 0;
  const frete = pedido.entrega?.freteTotal ?? 0;
  return roundCurrency(orcTotal + frete);
}

/**
 * Default `dataVencimento`: the delivery date if set, otherwise createdAt + 7 days.
 */
export function defaultDataVencimento(args: {
  dataEntrega: Date | null | undefined;
  createdAt: Date;
}): Date {
  if (args.dataEntrega) return new Date(args.dataEntrega);
  const fallback = new Date(args.createdAt);
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

/**
 * Sums all valores in the pagamentos array. Safe against floating drift.
 */
export function sumPagamentos(pagamentos: Pagamento[]): number {
  return roundCurrency(pagamentos.reduce((sum, p) => sum + p.valor, 0));
}

/**
 * SDK-agnostic timestamp shape — both firebase/firestore's Timestamp and
 * firebase-admin/firestore's Timestamp expose `toDate()`.
 */
interface TimestampLike {
  toDate(): Date;
}

function toDateSafe(t: TimestampLike | Date | null | undefined): Date | null {
  if (!t) return null;
  if (t instanceof Date) return t;
  if (typeof (t as TimestampLike).toDate === 'function') {
    return (t as TimestampLike).toDate();
  }
  return null;
}

/**
 * Resolves the payment fields on a Pedido given possibly-missing legacy data.
 * Used both on client reads (docToPedido) and server reads. Returns plain JS
 * values so callers can wrap them in their SDK's Timestamp type as needed.
 */
export function resolvePaymentFields(args: {
  pagamentos?: unknown;
  totalPago?: unknown;
  dataVencimento?: TimestampLike | Date | null;
  dataEntrega?: TimestampLike | Date | null;
  createdAt: TimestampLike | Date;
  total: number;
  now?: Date;
}): {
  pagamentos: Pagamento[];
  totalPago: number;
  dataVencimentoDate: Date;
  statusPagamento: StatusPagamento;
} {
  const pagamentos = Array.isArray(args.pagamentos)
    ? (args.pagamentos as Pagamento[])
    : [];

  const explicitTotalPago =
    typeof args.totalPago === 'number' ? args.totalPago : null;
  const totalPago = explicitTotalPago ?? sumPagamentos(pagamentos);

  const createdAtDate = toDateSafe(args.createdAt) ?? new Date();
  const vencFromRecord = toDateSafe(args.dataVencimento);
  const dataVencimentoDate =
    vencFromRecord ??
    defaultDataVencimento({
      dataEntrega: toDateSafe(args.dataEntrega ?? null),
      createdAt: createdAtDate,
    });

  const statusPagamento = deriveStatusPagamento({
    total: args.total,
    totalPago,
    dataVencimento: dataVencimentoDate,
    now: args.now ?? new Date(),
  });

  return {
    pagamentos,
    totalPago: roundCurrency(totalPago),
    dataVencimentoDate,
    statusPagamento,
  };
}
