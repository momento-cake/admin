import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updatePedidoSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { calcularTotalPedido, roundCurrency } from '@/lib/payment-logic';
import { withPaymentDefaults } from '@/lib/pedidos-server';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import type { Pedido } from '@/types/pedido';

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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 GET /api/pedidos/${id} - Fetching pedido`);
    }

    const docSnapshot = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    const pedido = withPaymentDefaults({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    } as Pedido & Record<string, unknown>);

    return NextResponse.json({
      success: true,
      data: pedido,
    });
  } catch (error) {
    logError('PEDIDO_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`✏️ PUT /api/pedidos/${id} - Updating pedido`);
    }

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

    // Hard gate: cannot transition to ENTREGUE unless the pedido is fully paid.
    if (validation.data.status === 'ENTREGUE') {
      const existing = existingDoc.data() as Pedido & Record<string, unknown>;
      const partial = {
        id,
        orcamentos: existing.orcamentos || [],
        entrega: existing.entrega,
      } as Pedido;
      const total = calcularTotalPedido(partial);
      const totalPago = roundCurrency(
        typeof existing.totalPago === 'number' ? existing.totalPago : 0
      );
      if (total > 0 && totalPago < total) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Pedido tem saldo em aberto. Registre o pagamento antes de marcar como entregue.',
            details: { total, totalPago, saldo: roundCurrency(total - totalPago) },
          },
          { status: 409 }
        );
      }
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
      data: withPaymentDefaults({
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as Pedido & Record<string, unknown>),
    });
  } catch (error) {
    logError('PEDIDO_PUT', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🗑️ DELETE /api/pedidos/${id} - Soft-deleting pedido`);
    }

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
    logError('PEDIDO_DELETE', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
