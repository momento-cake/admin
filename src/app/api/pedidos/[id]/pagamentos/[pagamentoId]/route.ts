import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import {
  calcularTotalPedido,
  resolvePaymentFields,
  sumPagamentos,
} from '@/lib/payment-logic';
import type { Pagamento, Pedido } from '@/types/pedido';

const PEDIDOS_COLLECTION = 'pedidos';

// DELETE /api/pedidos/[id]/pagamentos/[pagamentoId] — reverse a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pagamentoId: string }> }
) {
  try {
    const { id, pagamentoId } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    // Reversing a payment is a destructive op — admin-only (orders:delete).
    if (!canPerformActionFromRequest(auth, 'orders', 'delete')) {
      return forbiddenResponse('Sem permissão para excluir pagamentos');
    }

    const pedidoRef = adminDb.collection(PEDIDOS_COLLECTION).doc(id);
    const snapshot = await pedidoRef.get();
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const data = snapshot.data() as Pedido & Record<string, unknown>;
    const pagamentos: Pagamento[] = Array.isArray(data.pagamentos)
      ? (data.pagamentos as Pagamento[])
      : [];
    const removed = pagamentos.find((p) => p.id === pagamentoId);
    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      );
    }

    const updatedPagamentos = pagamentos.filter((p) => p.id !== pagamentoId);
    const totalPago = sumPagamentos(updatedPagamentos);

    const partialPedido = {
      id,
      orcamentos: data.orcamentos || [],
      entrega: data.entrega,
    } as Pedido;
    const total = calcularTotalPedido(partialPedido);

    const resolved = resolvePaymentFields({
      pagamentos: updatedPagamentos,
      totalPago,
      dataVencimento: data.dataVencimento as unknown as Timestamp,
      dataEntrega: data.dataEntrega as unknown as Timestamp,
      createdAt: data.createdAt as unknown as Timestamp,
      total,
    });

    await pedidoRef.update({
      pagamentos: updatedPagamentos,
      totalPago,
      statusPagamento: resolved.statusPagamento,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json({
      success: true,
      data: {
        removed,
        totalPago,
        statusPagamento: resolved.statusPagamento,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao excluir pagamento:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}
