import {
  Pedido,
  Orcamento,
  PedidoItem,
  CreatePedidoData,
  UpdatePedidoData,
  CreateOrcamentoData,
  UpdateOrcamentoData,
  PedidoQueryFilters,
  PedidosResponse,
  PedidoStatus,
} from '@/types/pedido';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  DocumentSnapshot,
  runTransaction,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  calcularTotalPedido,
  resolvePaymentFields,
} from '@/lib/payment-logic';

const COLLECTION_NAME = 'pedidos';
const COUNTER_COLLECTION = 'pedidoCounters';
const COUNTER_DOC_ID = 'counter';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Firestore document to Pedido interface
 */
function docToPedido(docSnapshot: DocumentSnapshot): Pedido {
  const data = docSnapshot.data();
  if (!data) throw new Error('Dados do documento indefinidos');

  const partialPedido = {
    id: docSnapshot.id,
    orcamentos: data.orcamentos || [],
    entrega: data.entrega,
  } as Pedido;
  const total = calcularTotalPedido(partialPedido);

  const resolved = resolvePaymentFields({
    pagamentos: data.pagamentos,
    totalPago: data.totalPago,
    dataVencimento: data.dataVencimento,
    dataEntrega: data.dataEntrega,
    createdAt: data.createdAt,
    total,
  });

  return {
    id: docSnapshot.id,
    numeroPedido: data.numeroPedido,
    publicToken: data.publicToken,
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    clienteTelefone: data.clienteTelefone || undefined,
    status: data.status,
    orcamentos: data.orcamentos || [],
    pacotes: data.pacotes || [],
    entrega: data.entrega,
    dataEntrega: data.dataEntrega || undefined,
    observacoes: data.observacoes || undefined,
    observacoesCliente: data.observacoesCliente || undefined,
    pagamentos: resolved.pagamentos,
    totalPago: resolved.totalPago,
    dataVencimento:
      data.dataVencimento ?? Timestamp.fromDate(resolved.dataVencimentoDate),
    statusPagamento: resolved.statusPagamento,
    nfStatus: data.nfStatus || null,
    nfProvider: data.nfProvider || null,
    nfExternalId: data.nfExternalId || null,
    nfEmittedAt: data.nfEmittedAt || null,
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
    lastModifiedBy: data.lastModifiedBy || undefined,
  };
}

/**
 * Calculate orcamento totals from its items.
 */
function calculateOrcamentoTotals(
  itens: PedidoItem[],
  desconto: number,
  descontoTipo: 'valor' | 'percentual',
  acrescimo: number
): { subtotal: number; total: number } {
  const subtotal = itens.reduce((sum, item) => sum + item.total, 0);
  const descontoValor =
    descontoTipo === 'percentual' ? subtotal * (desconto / 100) : desconto;
  const total = subtotal - descontoValor + acrescimo;
  return { subtotal, total: Math.max(0, total) };
}

// ============================================================================
// PEDIDO CRUD OPERATIONS
// ============================================================================

/**
 * Fetch pedidos with optional filters and pagination.
 * Applies client-side search and pagination after Firestore query.
 */
export async function fetchPedidos(
  filters?: PedidoQueryFilters
): Promise<PedidosResponse> {
  try {
    const conditions = [where('isActive', '==', true)];

    if (filters?.status) {
      conditions.push(where('status', '==', filters.status));
    }

    if (filters?.clienteId) {
      conditions.push(where('clienteId', '==', filters.clienteId));
    }

    const q: Query = query(
      collection(db, COLLECTION_NAME),
      ...conditions,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let pedidos = snapshot.docs.map(docToPedido);

    // Client-side search filter
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      pedidos = pedidos.filter(
        (p) =>
          p.numeroPedido.toLowerCase().includes(searchLower) ||
          p.clienteNome.toLowerCase().includes(searchLower)
      );
    }

    const total = pedidos.length;

    // Pagination
    const page = filters?.page || 1;
    const limitVal = filters?.limit || 20;
    const startIndex = (page - 1) * limitVal;
    const paginated = pedidos.slice(startIndex, startIndex + limitVal);

    return { pedidos: paginated, total, count: paginated.length };
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

/**
 * Fetch a single pedido by ID
 */
export async function fetchPedidoById(id: string): Promise<Pedido> {
  try {
    const docSnapshot = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!docSnapshot.exists()) {
      throw new Error('Pedido não encontrado');
    }
    return docToPedido(docSnapshot);
  } catch (error) {
    console.error(`Erro ao buscar pedido ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch a pedido by its public token.
 * Returns null if not found.
 */
export async function fetchPedidoByToken(
  token: string
): Promise<Pedido | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('publicToken', '==', token),
      where('isActive', '==', true),
      firestoreLimit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToPedido(snapshot.docs[0]);
  } catch (error) {
    console.error('Erro ao buscar pedido por token:', error);
    throw error;
  }
}

/**
 * Create a new pedido.
 * Uses a Firestore transaction for atomic auto-increment number generation.
 */
export async function createPedido(
  data: CreatePedidoData,
  userId: string
): Promise<Pedido> {
  try {
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID);
    const now = Timestamp.now();
    const publicToken = crypto.randomUUID();

    // Build initial orcamentos
    const orcamentos: Orcamento[] = (data.orcamentos || []).map(
      (orc, index) => {
        const itens = orc.itens.map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          total: item.precoUnitario * item.quantidade,
        }));
        const desconto = orc.desconto ?? 0;
        const descontoTipo = orc.descontoTipo ?? 'valor';
        const acrescimo = orc.acrescimo ?? 0;
        const { subtotal, total } = calculateOrcamentoTotals(
          itens,
          desconto,
          descontoTipo,
          acrescimo
        );
        return {
          id: crypto.randomUUID(),
          versao: index + 1,
          isAtivo: index === 0,
          status: 'RASCUNHO' as const,
          itens,
          subtotal,
          desconto,
          descontoTipo,
          acrescimo,
          total,
          criadoEm: now,
          criadoPor: userId,
        };
      }
    );

    // Use transaction for atomic counter increment
    const pedidoId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const lastNumber = counterDoc.exists()
        ? counterDoc.data().lastNumber
        : 0;
      const nextNumber = lastNumber + 1;

      if (counterDoc.exists()) {
        transaction.update(counterRef, { lastNumber: nextNumber });
      } else {
        transaction.set(counterRef, { lastNumber: nextNumber });
      }

      const numeroPedido = `PED-${String(nextNumber).padStart(4, '0')}`;

      // Compute the default due date from delivery date (or +7d fallback)
      const dataEntregaDate = data.dataEntrega?.toDate?.() ?? null;
      const createdAtDate = now.toDate();
      const dataVencimentoDate = dataEntregaDate ?? (() => {
        const d = new Date(createdAtDate);
        d.setDate(d.getDate() + 7);
        return d;
      })();

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
        pagamentos: [],
        totalPago: 0,
        dataVencimento: Timestamp.fromDate(dataVencimentoDate),
        statusPagamento: 'PENDENTE',
        nfStatus: null,
        nfProvider: null,
        nfExternalId: null,
        nfEmittedAt: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        lastModifiedBy: userId,
      };

      const newDocRef = doc(collection(db, COLLECTION_NAME));
      transaction.set(newDocRef, pedidoData);
      return newDocRef.id;
    });

    return await fetchPedidoById(pedidoId);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
}

/**
 * Update an existing pedido
 */
export async function updatePedido(
  id: string,
  data: UpdatePedidoData,
  userId: string
): Promise<void> {
  try {
    const now = Timestamp.now();
    const updatePayload: Record<string, unknown> = {
      ...data,
      updatedAt: now,
      lastModifiedBy: userId,
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await updateDoc(doc(db, COLLECTION_NAME, id), updatePayload);
  } catch (error) {
    console.error(`Erro ao atualizar pedido ${id}:`, error);
    throw error;
  }
}

/**
 * Soft-delete a pedido
 */
export async function softDeletePedido(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Erro ao excluir pedido ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// ORCAMENTO OPERATIONS
// ============================================================================

/**
 * Add a new orcamento (quote version) to a pedido.
 * Automatically increments the version number.
 */
export async function addOrcamento(
  pedidoId: string,
  orcamento: CreateOrcamentoData,
  userId: string
): Promise<void> {
  try {
    const pedido = await fetchPedidoById(pedidoId);
    const now = Timestamp.now();

    const itens = orcamento.itens.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      total: item.precoUnitario * item.quantidade,
    }));

    const desconto = orcamento.desconto ?? 0;
    const descontoTipo = orcamento.descontoTipo ?? 'valor';
    const acrescimo = orcamento.acrescimo ?? 0;
    const { subtotal, total } = calculateOrcamentoTotals(
      itens,
      desconto,
      descontoTipo,
      acrescimo
    );

    const maxVersao = pedido.orcamentos.reduce(
      (max, o) => Math.max(max, o.versao),
      0
    );

    const newOrcamento: Orcamento = {
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
      criadoEm: now,
      criadoPor: userId,
    };

    const updatedOrcamentos = [...pedido.orcamentos, newOrcamento];

    await updateDoc(doc(db, COLLECTION_NAME, pedidoId), {
      orcamentos: updatedOrcamentos,
      updatedAt: now,
      lastModifiedBy: userId,
    });
  } catch (error) {
    console.error(`Erro ao adicionar orcamento ao pedido ${pedidoId}:`, error);
    throw error;
  }
}

/**
 * Update an existing orcamento within a pedido.
 */
export async function updateOrcamento(
  pedidoId: string,
  orcamentoId: string,
  data: UpdateOrcamentoData
): Promise<void> {
  try {
    const pedido = await fetchPedidoById(pedidoId);
    const now = Timestamp.now();

    const updatedOrcamentos = pedido.orcamentos.map((orc) => {
      if (orc.id !== orcamentoId) return orc;

      const itens = data.itens
        ? data.itens.map((item) => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            total: item.precoUnitario * item.quantidade,
          }))
        : orc.itens;

      const desconto = data.desconto ?? orc.desconto;
      const descontoTipo = data.descontoTipo ?? orc.descontoTipo;
      const acrescimo = data.acrescimo ?? orc.acrescimo;
      const { subtotal, total } = calculateOrcamentoTotals(
        itens,
        desconto,
        descontoTipo,
        acrescimo
      );

      return {
        ...orc,
        ...(data.status !== undefined && { status: data.status }),
        itens,
        subtotal,
        desconto,
        descontoTipo,
        acrescimo,
        total,
      };
    });

    await updateDoc(doc(db, COLLECTION_NAME, pedidoId), {
      orcamentos: updatedOrcamentos,
      updatedAt: now,
    });
  } catch (error) {
    console.error(
      `Erro ao atualizar orcamento ${orcamentoId} do pedido ${pedidoId}:`,
      error
    );
    throw error;
  }
}

/**
 * Activate a specific orcamento and deactivate all others.
 */
export async function activateOrcamento(
  pedidoId: string,
  orcamentoId: string
): Promise<void> {
  try {
    const pedido = await fetchPedidoById(pedidoId);
    const now = Timestamp.now();

    const updatedOrcamentos = pedido.orcamentos.map((orc) => ({
      ...orc,
      isAtivo: orc.id === orcamentoId,
    }));

    await updateDoc(doc(db, COLLECTION_NAME, pedidoId), {
      orcamentos: updatedOrcamentos,
      updatedAt: now,
    });
  } catch (error) {
    console.error(
      `Erro ao ativar orcamento ${orcamentoId} do pedido ${pedidoId}:`,
      error
    );
    throw error;
  }
}
