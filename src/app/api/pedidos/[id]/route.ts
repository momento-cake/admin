import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updatePedidoSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';

// GET /api/pedidos/[id] - Get a single pedido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar pedidos');
    }

    console.log(`🔍 GET /api/pedidos/${id} - Fetching pedido`);

    const docSnapshot = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { id: docSnapshot.id, ...docSnapshot.data() },
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedido:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/pedidos/[id] - Update a pedido
export async function PUT(
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
      return forbiddenResponse('Sem permissão para atualizar pedidos');
    }

    console.log(`✏️ PUT /api/pedidos/${id} - Updating pedido`);

    const body = await request.json();

    const validation = updatePedidoSchema.safeParse(body);
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

    const existingDoc = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      ...validation.data,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update(updatePayload);

    const updatedDoc = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();

    return NextResponse.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar pedido:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/pedidos/[id] - Soft-delete a pedido
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'delete')) {
      return forbiddenResponse('Sem permissão para excluir pedidos');
    }

    console.log(`🗑️ DELETE /api/pedidos/${id} - Soft-deleting pedido`);

    const docSnapshot = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json({ success: true, message: 'Pedido excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir pedido:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
