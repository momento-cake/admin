import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getPaymentProvider } from '@/lib/payments/registry';
import { roundCurrency } from '@/lib/payment-logic';
import { recordChargeConfirmation } from '@/lib/pedido-payment-record';
import { createCardChargeSchema } from '@/lib/validators/charge';
import type { PedidoBilling, WebhookEvent } from '@/lib/payments/types';

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

function getRemoteIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '0.0.0.0';
}

// POST /api/public/pedidos/[token]/charge/card
// Creates an Asaas credit-card charge. The card data is sent encrypted by the
// frontend (Asaas tokenization handled at the provider layer). If Asaas
// confirms the payment synchronously, we record the Pagamento immediately —
// otherwise the webhook will reconcile later.
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'JSON inválido' },
        { status: 400 },
      );
    }

    const validation = createCardChargeSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validação falhou', details: errors },
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
    const remoteIp = getRemoteIp(request);

    const result = await provider.createCardCharge(
      {
        pedidoId: pedidoDoc.id,
        numeroPedido,
        amount: amountDue,
        description: `Pedido ${numeroPedido}`,
        providerCustomerId: customer.providerCustomerId,
        externalReference: pedidoDoc.id,
      },
      { ...validation.data.card, remoteIp },
      {
        nome: billing.nome,
        cpfCnpj: billing.cpfCnpj,
        email: billing.email,
        telefone: billing.telefone,
      },
    );

    const paymentSession = {
      provider: provider.name,
      providerCustomerId: customer.providerCustomerId,
      chargeId: result.chargeId,
      method: 'CARTAO_CREDITO' as const,
      status: result.status,
      amount: roundCurrency(result.amount),
      createdAt: FieldValue.serverTimestamp(),
      processedWebhookEventIds: [] as string[],
    };

    await pedidoDoc.ref.update({
      paymentSession,
      updatedAt: FieldValue.serverTimestamp(),
    });

    let immediatelyConfirmed = false;
    if (result.status === 'CONFIRMED') {
      // Synthesize a webhook-like event so the same recording logic runs.
      const syntheticEvent: WebhookEvent = {
        id: `card-${result.chargeId}`,
        type: 'PAYMENT_CONFIRMED',
        chargeId: result.chargeId,
        externalReference: pedidoDoc.id,
        status: 'CONFIRMED',
        amount: result.amount,
        paymentDate: new Date(),
        paymentMethod: 'CARTAO_CREDITO',
      };
      const recordResult = await recordChargeConfirmation(
        pedidoDoc.ref,
        syntheticEvent,
      );
      immediatelyConfirmed = recordResult.kind === 'recorded';
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentSession: sanitizePaymentSession(paymentSession),
        immediatelyConfirmed,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao gerar cobrança no cartão:', error);
    const message =
      error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
