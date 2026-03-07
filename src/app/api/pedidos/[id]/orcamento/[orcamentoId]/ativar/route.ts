import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';

// PUT /api/pedidos/[id]/orcamento/[orcamentoId]/ativar - Activate an orcamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orcamentoId: string }> }
) {
  try {
    const { id, orcamentoId } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para ativar orçamento');
    }

    const pedidoDoc = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!pedidoDoc.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    const pedidoData = pedidoDoc.data()!;
    const orcamentos = pedidoData.orcamentos || [];

    const orcIndex = orcamentos.findIndex((o: { id: string }) => o.id === orcamentoId);
    if (orcIndex === -1) {
      return NextResponse.json({ success: false, error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Deactivate all, activate the target
    const updatedOrcamentos = orcamentos.map((o: { id: string }) => ({
      ...o,
      isAtivo: o.id === orcamentoId,
    }));

    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update({
      orcamentos: updatedOrcamentos,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json({ success: true, message: 'Orcamento ativado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao ativar orcamento:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
