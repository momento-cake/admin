import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { billingSchema } from '@/lib/validators/billing';

const PEDIDOS_COLLECTION = 'pedidos';

// PATCH /api/public/pedidos/[token]/billing
// Customer submits CPF/CNPJ + contact info as a prerequisite to creating a
// charge. We only allow this while the pedido is sitting in
// AGUARDANDO_PAGAMENTO — otherwise the pedido has either not been confirmed
// yet or has already moved on.
export async function PATCH(
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

    const validation = billingSchema.safeParse(body);
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
            'Este pedido não aceita dados de pagamento no status atual',
        },
        { status: 400 },
      );
    }

    const billing = {
      nome: validation.data.nome,
      cpfCnpj: validation.data.cpfCnpj,
      email: validation.data.email,
      telefone: validation.data.telefone || undefined,
    };

    await pedidoDoc.ref.update({
      billing: {
        ...billing,
        confirmedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: { billing },
    });
  } catch (error) {
    console.error('❌ Erro ao salvar billing público:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
