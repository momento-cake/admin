import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const PEDIDOS_COLLECTION = 'pedidos';

interface MinimalPagamento {
  data?: { toDate?: () => Date; seconds?: number; nanoseconds?: number };
}

interface MinimalPaymentSession {
  status?: string;
  method?: string;
  expiresAt?: { toDate?: () => Date; seconds?: number };
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

    return NextResponse.json({
      success: true,
      data: {
        status: data.status,
        paymentSession,
        paidAt,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao consultar status de pagamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
