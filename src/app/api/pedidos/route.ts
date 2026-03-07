import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createPedidoSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';
const COUNTER_COLLECTION = 'pedidoCounters';
const COUNTER_DOC_ID = 'counter';

// GET /api/pedidos - List pedidos with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar pedidos');
    }

    console.log('🔍 GET /api/pedidos - Fetching pedidos');

    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const status = searchParams.get('status') || undefined;
    const clienteId = searchParams.get('clienteId') || undefined;
    const limitStr = searchParams.get('limit') || '20';
    const pageStr = searchParams.get('page') || '1';

    const limit = Math.min(parseInt(limitStr), 100);
    const page = Math.max(parseInt(pageStr), 1);

    let q: FirebaseFirestore.Query = adminDb
      .collection(PEDIDOS_COLLECTION)
      .where('isActive', '==', true);

    if (status) {
      q = q.where('status', '==', status);
    }

    if (clienteId) {
      q = q.where('clienteId', '==', clienteId);
    }

    q = q.orderBy('createdAt', 'desc');

    const snapshot = await q.get();
    let pedidos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Client-side search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      pedidos = pedidos.filter((p: Record<string, unknown>) =>
        (p.numeroPedido as string)?.toLowerCase().includes(searchLower) ||
        (p.clienteNome as string)?.toLowerCase().includes(searchLower)
      );
    }

    const total = pedidos.length;

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = pedidos.slice(startIndex, startIndex + limit);

    console.log(`✅ Successfully fetched ${paginated.length} pedidos (total: ${total})`);

    return NextResponse.json({
      success: true,
      data: paginated,
      count: paginated.length,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/pedidos - Create a new pedido
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'create')) {
      return forbiddenResponse('Sem permissão para criar pedidos');
    }

    console.log('➕ POST /api/pedidos - Creating pedido');

    const body = await request.json();

    const validation = createPedidoSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error);
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validação falhou', details: errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    const now = FieldValue.serverTimestamp();
    const publicToken = crypto.randomUUID();

    // Build orcamentos
    const orcamentos = (data.orcamentos || []).map(
      (orc: Record<string, unknown>, index: number) => {
        const itens = ((orc.itens as Array<Record<string, unknown>>) || []).map((item) => ({
          ...item,
          id: (item.id as string) || crypto.randomUUID(),
          total: (item.precoUnitario as number) * (item.quantidade as number),
        }));
        const desconto = (orc.desconto as number) ?? 0;
        const descontoTipo = (orc.descontoTipo as string) ?? 'valor';
        const acrescimo = (orc.acrescimo as number) ?? 0;
        const subtotal = itens.reduce((sum: number, item: Record<string, unknown>) => sum + (item.total as number), 0);
        const descontoValor = descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto;
        const total = Math.max(0, subtotal - descontoValor + acrescimo);

        return {
          id: crypto.randomUUID(),
          versao: index + 1,
          isAtivo: index === 0,
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
      }
    );

    // Use transaction for atomic counter increment
    const counterRef = adminDb.collection(COUNTER_COLLECTION).doc(COUNTER_DOC_ID);

    const result = await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const lastNumber = counterDoc.exists ? counterDoc.data()!.lastNumber : 0;
      const nextNumber = lastNumber + 1;

      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      const numeroPedido = `PED-${String(nextNumber).padStart(4, '0')}`;

      const pedidoData = {
        numeroPedido,
        publicToken,
        clienteId: data.clienteId,
        clienteNome: data.clienteNome,
        clienteTelefone: data.clienteTelefone || null,
        status: data.status || 'RASCUNHO',
        orcamentos,
        pacotes: data.pacotes || [],
        entrega: data.entrega,
        dataEntrega: data.dataEntrega || null,
        observacoes: data.observacoes || null,
        observacoesCliente: data.observacoesCliente || null,
        nfStatus: null,
        nfProvider: null,
        nfExternalId: null,
        nfEmittedAt: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.uid,
        lastModifiedBy: auth.uid,
      };

      const newDocRef = adminDb.collection(PEDIDOS_COLLECTION).doc();
      transaction.set(newDocRef, pedidoData);

      return { id: newDocRef.id, numeroPedido, publicToken };
    });

    console.log(`✅ Successfully created pedido: ${result.numeroPedido} (${result.id})`);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Erro ao criar pedido:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
