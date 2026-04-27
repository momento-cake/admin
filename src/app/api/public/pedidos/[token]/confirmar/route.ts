import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
const STORE_ADDRESSES_COLLECTION = 'storeAddresses';
const STORE_HOURS_COLLECTION = 'storeHours';

const DIAS_SEMANA_DEFAULTS = [
  { diaSemana: 0, diaSemanaLabel: 'Domingo', abreAs: '08:00', fechaAs: '18:00', fechado: true },
  { diaSemana: 1, diaSemanaLabel: 'Segunda', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 2, diaSemanaLabel: 'Terça', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 3, diaSemanaLabel: 'Quarta', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 4, diaSemanaLabel: 'Quinta', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 5, diaSemanaLabel: 'Sexta', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 6, diaSemanaLabel: 'Sábado', abreAs: '08:00', fechaAs: '13:00', fechado: false },
];

// POST /api/public/pedidos/[token]/confirmar - Confirm a pedido by public token (no auth required)
// Only allows confirmation of orders with status AGUARDANDO_APROVACAO. The
// pedido transitions to AGUARDANDO_PAGAMENTO so the customer can complete the
// online checkout (billing data + PIX/cartão) before we mark it CONFIRMADO.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 400 }
      );
    }

    const limit = checkRateLimit({
      key: `confirmar:${getClientIp(request)}:${token}`,
      max: 3,
      windowMs: 60_000,
    });
    if (!limit.ok) return rateLimited(limit.retryAfterMs);

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

    const docRef = snapshot.docs[0].ref;

    // Use transaction to prevent race condition on concurrent confirmation
    const data = await adminDb.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(docRef);
      if (!freshDoc.exists) {
        throw new Error('NOT_FOUND');
      }

      const freshData = freshDoc.data()!;
      if (freshData.status !== 'AGUARDANDO_APROVACAO') {
        throw new Error('INVALID_STATUS');
      }

      transaction.update(docRef, {
        status: 'AGUARDANDO_PAGAMENTO',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return freshData;
    }).catch((err) => {
      if (err.message === 'NOT_FOUND') {
        return { _error: 'NOT_FOUND' as const };
      }
      if (err.message === 'INVALID_STATUS') {
        return { _error: 'INVALID_STATUS' as const };
      }
      throw err;
    });

    if ('_error' in data) {
      if (data._error === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: 'Pedido não encontrado' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Este pedido não pode ser confirmado no status atual' },
        { status: 400 }
      );
    }

    // Build public-safe response (same filter as GET), strip internal fields
    const rawOrcamento = (data.orcamentos || []).find(
      (o: { isAtivo: boolean }) => o.isAtivo
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const activeOrcamento = rawOrcamento
      ? (() => { const { criadoPor, criadoEm, ...safe } = rawOrcamento; return safe; })()
      : null;

    // Fetch store addresses and hours for consistent response shape
    const [addressesSnap, hoursSnap] = await Promise.all([
      adminDb
        .collection(STORE_ADDRESSES_COLLECTION)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'asc')
        .get(),
      adminDb
        .collection(STORE_HOURS_COLLECTION)
        .orderBy('diaSemana', 'asc')
        .get(),
    ]);

    const storeAddresses = addressesSnap.docs.map((d) => ({
      id: d.id,
      nome: d.data().nome,
      cep: d.data().cep || undefined,
      estado: d.data().estado || undefined,
      cidade: d.data().cidade || undefined,
      bairro: d.data().bairro || undefined,
      endereco: d.data().endereco || undefined,
      numero: d.data().numero || undefined,
      complemento: d.data().complemento || undefined,
      isDefault: d.data().isDefault ?? false,
    }));

    const storeHours = hoursSnap.empty
      ? DIAS_SEMANA_DEFAULTS
      : hoursSnap.docs.map((d) => ({
          diaSemana: d.data().diaSemana,
          diaSemanaLabel: d.data().diaSemanaLabel,
          abreAs: d.data().abreAs,
          fechaAs: d.data().fechaAs,
          fechado: d.data().fechado,
        }));

    const publicPedido = {
      id: docRef.id,
      numeroPedido: data.numeroPedido,
      clienteNome: data.clienteNome,
      status: 'AGUARDANDO_PAGAMENTO',
      orcamento: activeOrcamento || null,
      entrega: data.entrega,
      dataEntrega: data.dataEntrega || null,
      observacoesCliente: data.observacoesCliente || null,
      createdAt: data.createdAt,
      storeAddresses,
      storeHours,
    };

    return NextResponse.json({ success: true, data: publicPedido });
  } catch (error) {
    console.error('Erro ao confirmar pedido público:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
