import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getPaymentProvider } from '@/lib/payments/registry';
import { roundCurrency } from '@/lib/payment-logic';
import type { PedidoBilling } from '@/lib/payments/types';

const PEDIDOS_COLLECTION = 'pedidos';

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

// POST /api/public/pedidos/[token]/charge/pix
// Creates an Asaas PIX charge for the outstanding balance and stores the
// generated QR code on the pedido as a `paymentSession`. Idempotency is
// "best-effort": this re-creates a session each call, which is intentional
// since Asaas charges expire and the customer may need a fresh QR code.
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

    const pedidoDoc = snapshot.docs[0];
    const data = pedidoDoc.data();

    if (data.status !== 'AGUARDANDO_PAGAMENTO') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Este pedido não aceita pagamento online no status atual',
        },
        { status: 400 },
      );
    }

    const billing = data.billing as
      | (PedidoBilling & Record<string, unknown>)
      | undefined;
    if (!billing || !billing.cpfCnpj || !billing.nome || !billing.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Confirme seus dados de pagamento (CPF/CNPJ) antes de gerar a cobrança',
        },
        { status: 400 },
      );
    }

    const orcamentos = Array.isArray(data.orcamentos)
      ? (data.orcamentos as ActiveOrcamento[])
      : [];
    const activeOrcamento = orcamentos.find((o) => o.isAtivo);
    const orcTotal = activeOrcamento?.total ?? 0;
    const frete =
      ((data.entrega as PedidoEntregaSubset | undefined)?.freteTotal) ?? 0;
    const totalPago =
      typeof data.totalPago === 'number' ? (data.totalPago as number) : 0;
    const amountDue = roundCurrency(orcTotal + frete - totalPago);

    if (amountDue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido já está quitado' },
        { status: 400 },
      );
    }

    const provider = getPaymentProvider();
    const customer = await provider.ensureCustomer({
      nome: billing.nome,
      cpfCnpj: billing.cpfCnpj,
      email: billing.email,
      telefone: billing.telefone,
    });

    const numeroPedido = (data.numeroPedido as string) || pedidoDoc.id;
    const result = await provider.createPixCharge({
      pedidoId: pedidoDoc.id,
      numeroPedido,
      amount: amountDue,
      description: `Pedido ${numeroPedido}`,
      providerCustomerId: customer.providerCustomerId,
      externalReference: pedidoDoc.id,
    });

    const paymentSession = {
      provider: provider.name,
      providerCustomerId: customer.providerCustomerId,
      chargeId: result.chargeId,
      method: 'PIX' as const,
      status: result.status,
      amount: roundCurrency(result.amount),
      pixQrCodeBase64: result.qrCodeBase64,
      pixCopyPaste: result.copyPaste,
      expiresAt: Timestamp.fromDate(result.expiresAt),
      createdAt: FieldValue.serverTimestamp(),
      processedWebhookEventIds: [] as string[],
    };

    await pedidoDoc.ref.update({
      paymentSession,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentSession: sanitizePaymentSession(paymentSession),
      },
    });
  } catch (error) {
    console.error('❌ Erro ao gerar cobrança PIX:', error);
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
