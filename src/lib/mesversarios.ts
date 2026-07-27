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
  Timestamp,
  DocumentSnapshot,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Mesversario,
  MesversarioMes,
  MesversariosResponse,
  MesversarioFilters,
  MesversarioDashboardEntry,
  CreateMesversarioData,
  UpdateMesData,
} from '@/types/mesversario';
import { buildMeses, daysUntil, getNextDueMes } from '@/lib/mesversario-utils';
import { getRelativeDateLabel } from '@/lib/special-dates-utils';

const COLLECTION_NAME = 'mesversarios';

// ============================================================================
// HELPERS
// ============================================================================

function docToMesversario(docSnapshot: DocumentSnapshot): Mesversario {
  const data = docSnapshot.data();
  if (!data) throw new Error('Dados do documento indefinidos');

  return {
    id: docSnapshot.id,
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    clienteTelefone: data.clienteTelefone || undefined,
    relatedPersonId: data.relatedPersonId,
    bebeNome: data.bebeNome,
    dataNascimento: data.dataNascimento,
    status: data.status,
    meses: data.meses || [],
    observacoes: data.observacoes || undefined,
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
    lastModifiedBy: data.lastModifiedBy,
  };
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * Fetch active mesversarios, newest first, optionally filtered by status.
 */
export async function fetchMesversarios(
  filters?: MesversarioFilters
): Promise<MesversariosResponse> {
  try {
    const conditions = [where('isActive', '==', true)];

    if (filters?.status) {
      conditions.push(where('status', '==', filters.status));
    }

    const q: Query = query(
      collection(db, COLLECTION_NAME),
      ...conditions,
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const mesversarios = snapshot.docs.map(docToMesversario);

    return {
      mesversarios,
      total: mesversarios.length,
      count: mesversarios.length,
    };
  } catch (error) {
    console.error('Erro ao buscar mesversários:', error);
    throw error;
  }
}

/**
 * Fetch a single mesversario by ID.
 */
export async function fetchMesversarioById(id: string): Promise<Mesversario> {
  try {
    const docSnapshot = await getDoc(doc(db, COLLECTION_NAME, id));
    if (!docSnapshot.exists()) {
      throw new Error('Mesversário não encontrado');
    }
    return docToMesversario(docSnapshot);
  } catch (error) {
    console.error(`Erro ao buscar mesversário ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new mesversario, generating its 12 monthly milestones from the
 * baby's birth date.
 */
export async function createMesversario(
  data: CreateMesversarioData,
  userId: string
): Promise<Mesversario> {
  try {
    const now = Timestamp.now();
    const meses = buildMeses(data.dataNascimento);

    const payload = {
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      clienteTelefone: data.clienteTelefone || null,
      relatedPersonId: data.relatedPersonId,
      bebeNome: data.bebeNome,
      dataNascimento: data.dataNascimento,
      status: 'ATIVO' as const,
      meses,
      observacoes: data.observacoes || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      lastModifiedBy: userId,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return await fetchMesversarioById(docRef.id);
  } catch (error) {
    console.error('Erro ao criar mesversário:', error);
    throw error;
  }
}

/**
 * Soft-delete a mesversario.
 */
export async function softDeleteMesversario(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      isActive: false,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Erro ao excluir mesversário ${id}:`, error);
    throw error;
  }
}

/**
 * Patch a single month within a mesversario. Reads the current doc, rewrites
 * the targeted month, and persists the whole `meses` array.
 */
export async function updateMes(
  id: string,
  numero: number,
  patch: UpdateMesData
): Promise<void> {
  try {
    const mesversario = await fetchMesversarioById(id);
    const now = Timestamp.now();

    const meses = mesversario.meses.map((mes) =>
      applyMesPatch(mes, numero, patch, now)
    );

    await updateDoc(doc(db, COLLECTION_NAME, id), {
      meses,
      updatedAt: now,
    });
  } catch (error) {
    console.error(`Erro ao atualizar mês ${numero} do mesversário ${id}:`, error);
    throw error;
  }
}

/**
 * Link a created order to a month, moving it to PEDIDO_CRIADO.
 */
export async function linkPedidoToMes(
  id: string,
  numero: number,
  pedidoId: string,
  pedidoNumero: string
): Promise<void> {
  try {
    const mesversario = await fetchMesversarioById(id);
    const now = Timestamp.now();

    const meses = mesversario.meses.map((mes) => {
      if (mes.numero !== numero) return mes;
      return {
        ...mes,
        pedidoId,
        pedidoNumero,
        status: 'PEDIDO_CRIADO' as const,
        atualizadoEm: now,
      };
    });

    await updateDoc(doc(db, COLLECTION_NAME, id), {
      meses,
      updatedAt: now,
    });
  } catch (error) {
    console.error(`Erro ao vincular pedido ao mês ${numero} do mesversário ${id}:`, error);
    throw error;
  }
}

/**
 * Build the dashboard: for each active baby, the next-due month, sorted by
 * proximity. Babies whose journey is fully settled are omitted.
 */
export async function fetchMesversariosDashboard(): Promise<MesversarioDashboardEntry[]> {
  try {
    const { mesversarios } = await fetchMesversarios({ status: 'ATIVO' });

    const entries: MesversarioDashboardEntry[] = [];
    for (const m of mesversarios) {
      const next = getNextDueMes(m);
      if (!next) continue;
      const days = daysUntil(next.dataComemoracao);
      entries.push({
        clienteId: m.clienteId,
        clienteNome: m.clienteNome,
        mesversarioId: m.id,
        bebeNome: m.bebeNome,
        numero: next.numero,
        dataComemoracao: next.dataComemoracao,
        status: next.status,
        daysUntil: days,
        relativeLabel: getRelativeDateLabel(days),
      });
    }

    return entries.sort((a, b) => a.daysUntil - b.daysUntil);
  } catch (error) {
    console.error('Erro ao buscar painel de mesversários:', error);
    throw error;
  }
}

// ============================================================================
// INTERNAL
// ============================================================================

/**
 * Apply a partial update to the month matching `numero`; return others as-is.
 * Merges the acordo shallowly so unset acordo fields are preserved.
 */
function applyMesPatch(
  mes: MesversarioMes,
  numero: number,
  patch: UpdateMesData,
  now: Timestamp
): MesversarioMes {
  if (mes.numero !== numero) return mes;

  const next: MesversarioMes = { ...mes, atualizadoEm: now };

  if (patch.status !== undefined) {
    next.status = patch.status;
  }
  if (patch.observacoes !== undefined) {
    next.observacoes = patch.observacoes;
  }
  if (patch.acordo !== undefined) {
    next.acordo = {
      ...mes.acordo,
      ...patch.acordo,
    } as MesversarioMes['acordo'];
  }

  return next;
}
