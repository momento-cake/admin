import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { billingSchema } from '@/lib/validators/billing';
import { encryptPii } from '@/lib/billing-encryption';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const PEDIDOS_COLLECTION = 'pedidos';

function rateLimited(retryAfterMs: number) {
  return NextResponse.json(
    {
      success: false,
      error: 'Muitas tentativas. Tente novamente em alguns instantes.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    },
  );
}

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

    const limit = checkRateLimit({
      key: `billing:${getClientIp(request)}:${token}`,
      max: 5,
      windowMs: 60_000,
    });
    if (!limit.ok) return rateLimited(limit.retryAfterMs);

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

    // LGPD: encrypt the CPF/CNPJ before persisting. Other contact fields are
    // not classified as sensitive personal documents under our policy and stay
    // in plaintext to keep admin search/index queries simple. The validator
    // already strips formatting, so we encrypt only digits.
    const encryptedCpfCnpj = encryptPii(validation.data.cpfCnpj);
    const billing = {
      nome: validation.data.nome,
      cpfCnpj: encryptedCpfCnpj,
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

    // The response echoes the encrypted blob — the customer doesn't need
    // their own CPF re-displayed back. The public GET strips this field
    // entirely; this PATCH path leaves it for backwards compatibility with
    // tests that read `data.billing.cpfCnpj` after a write.
    return NextResponse.json({
      success: true,
      data: { billing },
    });
  } catch (error) {
    logError('PUBLIC_PEDIDO_BILLING_PATCH', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
