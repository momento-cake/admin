import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { orcamentoSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';

// POST /api/pedidos/[id]/orcamento - Add a new orcamento to a pedido
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para adicionar orçamento');
    }

    const body = await request.json();

    const validation = orcamentoSchema.safeParse(body);
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
    const existingOrcamentos = pedidoData.orcamentos || [];

    const data = validation.data;
    const itens = data.itens.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      total: item.precoUnitario * item.quantidade,
    }));

    const desconto = data.desconto ?? 0;
    const descontoTipo = data.descontoTipo ?? 'valor';
    const acrescimo = data.acrescimo ?? 0;
    const subtotal = itens.reduce((sum, item) => sum + item.total, 0);
    const descontoValor = descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto;
    const total = Math.max(0, subtotal - descontoValor + acrescimo);

    const maxVersao = existingOrcamentos.reduce(
      (max: number, o: { versao: number }) => Math.max(max, o.versao),
      0
    );

    const newOrcamento = {
      id: crypto.randomUUID(),
      versao: maxVersao + 1,
      isAtivo: false,
      status: 'RASCUNHO',
      itens,
      subtotal,
      desconto,
      descontoTipo,
      acrescimo,
      total,
      criadoEm: new Date().toISOString(),
      criadoPor: auth.uid,
    };

    const updatedOrcamentos = [...existingOrcamentos, newOrcamento];

    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update({
      orcamentos: updatedOrcamentos,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json(
      { success: true, data: newOrcamento },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Erro ao adicionar orcamento:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
