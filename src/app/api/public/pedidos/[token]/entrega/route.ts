import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { pedidoEntregaSchema } from '@/lib/validators/pedido';

const PEDIDOS_COLLECTION = 'pedidos';

// PATCH /api/public/pedidos/[token]/entrega - Update delivery option (no auth required)
// Allows the client to toggle between ENTREGA and RETIRADA and update address
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    console.log(`🌐 PATCH /api/public/pedidos/${token}/entrega - Updating delivery option`);

    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = pedidoEntregaSchema.safeParse(body);
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

    const snapshot = await adminDb
      .collection(PEDIDOS_COLLECTION)
      .where('publicToken', '==', token)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const pedidoDoc = snapshot.docs[0];
    const data = pedidoDoc.data();

    // Entrega is the customer's pre-confirmation choice. Once they confirm
    // (status = AGUARDANDO_PAGAMENTO) or the pedido is confirmed (CONFIRMADO),
    // the address is locked — otherwise a customer could redirect a paid
    // delivery after the fact.
    if (data.status !== 'AGUARDANDO_APROVACAO') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido já confirmado — endereço não pode mais ser alterado',
        },
        { status: 409 }
      );
    }

    await pedidoDoc.ref.update({
      entrega: validation.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { entrega: validation.data },
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar entrega pública:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
