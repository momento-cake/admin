import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { orcamentoSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';

// PUT /api/pedidos/[id]/orcamento/[orcamentoId] - Update an orcamento
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
      return forbiddenResponse('Sem permissão para atualizar orçamento');
    }

    const body = await request.json();

    const validation = orcamentoSchema.partial().safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validação falhou', details: errors },
        { status: 400 }
      );
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

    const existing = orcamentos[orcIndex];
    const data = validation.data;

    const itens = data.itens
      ? data.itens.map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          total: item.precoUnitario * item.quantidade,
        }))
      : existing.itens;

    const desconto = data.desconto ?? existing.desconto;
    const descontoTipo = data.descontoTipo ?? existing.descontoTipo;
    const acrescimo = data.acrescimo ?? existing.acrescimo;
    const subtotal = itens.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const descontoValor = descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto;
    const total = Math.max(0, subtotal - descontoValor + acrescimo);

    const updatedOrcamento = {
      ...existing,
      ...(data.status !== undefined && { status: data.status }),
      itens,
      subtotal,
      desconto,
      descontoTipo,
      acrescimo,
      total,
    };

    orcamentos[orcIndex] = updatedOrcamento;

    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update({
      orcamentos,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json({ success: true, data: updatedOrcamento });
  } catch (error) {
    console.error('❌ Erro ao atualizar orcamento:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
