import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { withPaymentDefaults } from '@/lib/pedidos-server';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import type { Pedido, PedidoStatus } from '@/types/pedido';

const PEDIDOS_COLLECTION = 'pedidos';

// Statuses that no longer need production attention — undated orders in these
// states are NOT surfaced in the "sem-data" bucket.
const CLOSED_STATUSES: PedidoStatus[] = ['CANCELADO', 'ENTREGUE'];

function parseIsoDayStart(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).getTime();
}

function parseIsoDayEnd(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).getTime();
}

function extractTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number };
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

/**
 * GET /api/pedidos/resumo?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns the full (unpaginated) set of orders relevant to the production /
 * financial summary for the given range:
 *   - every active order whose `dataEntrega` falls within [from, to]; plus
 *   - every active, still-open order with no `dataEntrega` (the "sem-data"
 *     bucket — these need scheduling and still have to be produced).
 *
 * Mirrors the in-memory filtering approach of GET /api/pedidos (fetch all
 * active orders, filter in memory) so no extra composite index is required.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar pedidos');
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros "from" e "to" (YYYY-MM-DD) são obrigatórios' },
        { status: 400 }
      );
    }

    const fromMs = parseIsoDayStart(from);
    const toMs = parseIsoDayEnd(to);

    const snapshot = await adminDb
      .collection(PEDIDOS_COLLECTION)
      .where('isActive', '==', true)
      .get();

    const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<
      Pedido & Record<string, unknown>
    >;

    const selected = all.filter((p) => {
      // Cancelled orders never appear in the resumo (dated or undated).
      if (p.status === 'CANCELADO') return false;
      const ms = extractTimestampMs(p.dataEntrega);
      if (ms === null) {
        // Undated: keep only still-open orders for the sem-data bucket.
        return !CLOSED_STATUSES.includes(p.status);
      }
      return ms >= fromMs && ms <= toMs;
    });

    const data = selected.map((p) => withPaymentDefaults(p));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      from,
      to,
    });
  } catch (error) {
    logError('PEDIDOS_RESUMO_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
