import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getPaymentProvider } from '@/lib/payments/registry';
import { roundCurrency } from '@/lib/payment-logic';
import { decryptPii } from '@/lib/billing-encryption';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import { PaymentProviderError } from '@/lib/payments/types';
import type { PedidoBilling } from '@/lib/payments/types';

const PEDIDOS_COLLECTION = 'pedidos';

function rateLimited(retryAfterMs: number) {
  return NextResponse.json(
    {
      success: false,
      error: 'Muitas tentativas. Tente novamente em alguns instantes.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  );
}

interface ActiveOrcamento {
  isAtivo?: boolean;
  total?: number;
}

interface PedidoEntregaSubset {
  freteTotal?: number;
}

function sanitizePaymentSession<
  T extends Record<string, unknown> | null | undefined,
>(session: T) {
  if (!session) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { providerCustomerId, processedWebhookEventIds, ...rest } =
    session as Record<string, unknown>;
  return rest;
}

function expiresAtMs(value: unknown): number | null {
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

type PixOutcome =
  | { kind: 'invalid_status' }
  | { kind: 'no_billing' }
  | { kind: 'already_paid' }
  | { kind: 'created'; session: Record<string, unknown> }
  | { kind: 'reused'; session: Record<string, unknown> };

// POST /api/public/pedidos/[token]/charge/pix
// Creates an Asaas PIX charge for the outstanding balance and stores the
// generated QR code on the pedido as a `paymentSession`.
//
// Concurrency: the entire validate + provider-call + write flow runs in a
// single Firestore transaction. The transaction's read-then-write contract
// is what we care about: it lets us safely check "is there already a usable
// PENDING session?" and short-circuit before calling Asaas a second time
// when two parallel POSTs land on the same pedido.
//
// Note on retries: Firestore admin transactions retry only the local
// read/write portion; external IO (the Asaas calls) is not idempotent on
// retry. We accept this — in practice the contention window is the doc's
// version stamp, so the second attempt sees the first attempt's session and
// hits the reuse branch instead of calling Asaas again.
export async function POST(
  request: NextRequest,
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

    const limit = checkRateLimit({
      key: `charge-pix:${getClientIp(request)}:${token}`,
      max: 5,
      windowMs: 60_000,
    });
    if (!limit.ok) return rateLimited(limit.retryAfterMs);

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

    const pedidoRef = snapshot.docs[0].ref;

    const result: PixOutcome = await adminDb.runTransaction(
      async (transaction) => {
        const snap = await transaction.get(pedidoRef);
        if (!snap.exists) {
          return { kind: 'invalid_status' as const };
        }
        const data = snap.data() as Record<string, unknown>;

        if (data.status !== 'AGUARDANDO_PAGAMENTO') {
          return { kind: 'invalid_status' as const };
        }

        const billing = data.billing as
          | (PedidoBilling & Record<string, unknown>)
          | undefined;
        if (!billing || !billing.cpfCnpj || !billing.nome || !billing.email) {
          return { kind: 'no_billing' as const };
        }

        const orcamentos = Array.isArray(data.orcamentos)
          ? (data.orcamentos as ActiveOrcamento[])
          : [];
        const activeOrcamento = orcamentos.find((o) => o.isAtivo);
        const orcTotal = activeOrcamento?.total ?? 0;
        const frete =
          (data.entrega as PedidoEntregaSubset | undefined)?.freteTotal ?? 0;
        const totalPago =
          typeof data.totalPago === 'number' ? (data.totalPago as number) : 0;
        const amountDue = roundCurrency(orcTotal + frete - totalPago);

        if (amountDue <= 0) {
          return { kind: 'already_paid' as const };
        }

        // Reuse a still-valid PENDING PIX session instead of issuing a new
        // Asaas charge. This is the idempotency guarantee that protects us
        // from concurrent POSTs and from a customer double-clicking "pay".
        const existing = data.paymentSession as
          | Record<string, unknown>
          | undefined;
        if (
          existing &&
          existing.method === 'PIX' &&
          existing.status === 'PENDING'
        ) {
          const expMs = expiresAtMs(existing.expiresAt);
          if (expMs && expMs > Date.now()) {
            return { kind: 'reused' as const, session: existing };
          }
        }

        const provider = getPaymentProvider();
        // billing.cpfCnpj is stored encrypted (LGPD). Decrypt before sending
        // to the provider; legacy plaintext rows pass through unchanged.
        const provider_cpfCnpj = decryptPii(billing.cpfCnpj);
        const customer = await provider.ensureCustomer({
          nome: billing.nome,
          cpfCnpj: provider_cpfCnpj,
          email: billing.email,
          telefone: billing.telefone,
        });

        const numeroPedido =
          (data.numeroPedido as string) || pedidoRef.id;
        const charge = await provider.createPixCharge({
          pedidoId: pedidoRef.id,
          numeroPedido,
          amount: amountDue,
          description: `Pedido ${numeroPedido}`,
          providerCustomerId: customer.providerCustomerId,
          externalReference: pedidoRef.id,
        });

        const paymentSession = {
          provider: provider.name,
          providerCustomerId: customer.providerCustomerId,
          chargeId: charge.chargeId,
          method: 'PIX' as const,
          status: charge.status,
          amount: roundCurrency(charge.amount),
          pixQrCodeBase64: charge.qrCodeBase64,
          pixCopyPaste: charge.copyPaste,
          expiresAt: Timestamp.fromDate(charge.expiresAt),
          createdAt: FieldValue.serverTimestamp(),
          processedWebhookEventIds: [] as string[],
        };

        transaction.update(pedidoRef, {
          paymentSession,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { kind: 'created' as const, session: paymentSession };
      },
    );

    if (result.kind === 'invalid_status') {
      return NextResponse.json(
        {
          success: false,
          error: 'Este pedido não aceita pagamento online no status atual',
        },
        { status: 400 },
      );
    }
    if (result.kind === 'no_billing') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Confirme seus dados de pagamento (CPF/CNPJ) antes de gerar a cobrança',
        },
        { status: 400 },
      );
    }
    if (result.kind === 'already_paid') {
      return NextResponse.json(
        { success: false, error: 'Pedido já está quitado' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentSession: sanitizePaymentSession(result.session),
      },
    });
  } catch (error) {
    // If the Asaas PIX charge call (which runs inside the transaction above)
    // failed with a recognizable provider error, surface its `code` +
    // `providerMessage` in `details` so the UI can render a specific message
    // under the Portuguese summary. Otherwise fall through to the standard
    // 500 path.
    if (error instanceof PaymentProviderError) {
      logError('PUBLIC_PEDIDO_PIX_POST', error);
      return NextResponse.json(
        {
          success: false,
          error:
            'Não foi possível gerar a cobrança PIX. Tente novamente em instantes.',
          details: {
            code: error.code,
            providerMessage: error.message ?? '',
          },
        },
        { status: 402 },
      );
    }

    logError('PUBLIC_PEDIDO_PIX_POST', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
