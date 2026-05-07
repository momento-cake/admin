import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const PEDIDOS_COLLECTION = 'pedidos';

// Server-side cap for "stuck in risk analysis" UX. After this threshold the
// response carries a `details.riskAnalysisStuck` flag so the UI can switch
// from the polite "estamos analisando" copy to a clearer "isso está demorando"
// message without us touching the actual `status` value (still
// PENDING_RISK_ANALYSIS until the webhook resolves it).
const RISK_ANALYSIS_STUCK_MS = 10 * 60 * 1000;

interface MinimalPagamento {
  data?: { toDate?: () => Date; seconds?: number; nanoseconds?: number };
}

interface MinimalPaymentSession {
  status?: string;
  method?: string;
  expiresAt?: { toDate?: () => Date; seconds?: number };
  createdAt?: { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  riskAnalysisSince?: { toMillis?: () => number; seconds?: number; nanoseconds?: number };
}

function timestampToMs(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.toMillis === 'function') {
    try {
      return (obj.toMillis as () => number)();
    } catch {
      return null;
    }
  }
  if (typeof obj.seconds === 'number') {
    const nanos = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : 0;
    return obj.seconds * 1000 + Math.floor(nanos / 1e6);
  }
  return null;
}

// GET /api/public/pedidos/[token]/payment-status
// Cheap polling endpoint used by the customer checkout UI to wait for an
// asynchronous PIX payment confirmation. Returns just enough state for the UI
// to flip its status banner.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 400 },
      );
    }

    const snapshot = await adminDb
      .collection(PEDIDOS_COLLECTION)
      .where('publicToken', '==', token)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 },
      );
    }

    const data = snapshot.docs[0].data();

    const session = data.paymentSession as MinimalPaymentSession | undefined;
    const paymentSession = session
      ? {
          status: session.status ?? null,
          method: session.method ?? null,
          expiresAt: session.expiresAt ?? null,
        }
      : null;

    const pagamentos = Array.isArray(data.pagamentos)
      ? (data.pagamentos as MinimalPagamento[])
      : [];
    const last = pagamentos[pagamentos.length - 1];
    const paidAt = last?.data ?? null;

    // Detect a charge that has been stuck in PENDING_RISK_ANALYSIS for more
    // than RISK_ANALYSIS_STUCK_MS. We do NOT change the `status` value — only
    // expose a flag so the UI can switch its message. Prefer
    // `riskAnalysisSince` if present, fall back to `createdAt`.
    let details: { riskAnalysisStuck?: boolean; sinceMs?: number } | undefined;
    if (session?.status === 'PENDING_RISK_ANALYSIS') {
      const sinceMs =
        timestampToMs(session.riskAnalysisSince) ??
        timestampToMs(session.createdAt);
      if (sinceMs !== null) {
        const elapsed = Date.now() - sinceMs;
        if (elapsed > RISK_ANALYSIS_STUCK_MS) {
          details = { riskAnalysisStuck: true, sinceMs: elapsed };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: data.status,
        paymentSession,
        paidAt,
        ...(details ? { details } : {}),
      },
    });
  } catch (error) {
    logError('PUBLIC_PEDIDO_STATUS_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
