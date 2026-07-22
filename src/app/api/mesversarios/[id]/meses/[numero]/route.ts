import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { updateMesSchema } from '@/lib/validators/mesversario';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const MESVERSARIOS_COLLECTION = 'mesversarios';

interface StoredMes {
  numero: number;
  dataComemoracao: string;
  status: string;
  acordo?: Record<string, unknown>;
  pedidoId?: string;
  pedidoNumero?: string;
  observacoes?: string;
  atualizadoEm?: unknown;
  [key: string]: unknown;
}

// PUT /api/mesversarios/[id]/meses/[numero] - Update a single month
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; numero: string }> }
) {
  try {
    const { id, numero } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para atualizar mesversários');
    }

    const mesNumero = Number(numero);
    if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
      return NextResponse.json(
        { success: false, error: 'Número de mês inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = updateMesSchema.safeParse(body);
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

    const existingDoc = await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Mesversário não encontrado' },
        { status: 404 }
      );
    }

    const data = validation.data;
    const existing = existingDoc.data() as { meses?: StoredMes[] };
    const meses = existing.meses || [];

    const target = meses.find((m) => m.numero === mesNumero);
    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Mês não encontrado' },
        { status: 400 }
      );
    }

    const linkingPedido = Boolean(data.pedidoId && data.pedidoNumero);

    const updatedMeses = meses.map((mes) => {
      if (mes.numero !== mesNumero) return mes;

      const next: StoredMes = { ...mes, atualizadoEm: Timestamp.now() };

      if (data.observacoes !== undefined) {
        next.observacoes = data.observacoes;
      }

      if (data.acordo !== undefined) {
        // Stamp reference images server-side: preserve prior uploadedAt/uploadedBy
        // matched by id, use null (never undefined) for absent optional fields.
        const priorById = new Map(
          (((mes.acordo?.imagensReferencia as Array<Record<string, unknown>>) || [])).map(
            (img) => [img.id as string, img]
          )
        );
        const imagensReferencia = (data.acordo.imagensReferencia || []).map((img) => {
          const prior = img.id ? priorById.get(img.id) : undefined;
          return {
            id: img.id || crypto.randomUUID(),
            url: img.url,
            storagePath: img.storagePath,
            legenda: img.legenda ?? null,
            width: img.width ?? null,
            height: img.height ?? null,
            uploadedAt: prior?.uploadedAt ?? Timestamp.now(),
            uploadedBy: prior?.uploadedBy ?? auth.uid,
          };
        });
        next.acordo = {
          tema: data.acordo.tema ?? mes.acordo?.tema ?? null,
          sabor: data.acordo.sabor ?? mes.acordo?.sabor ?? null,
          notas: data.acordo.notas ?? mes.acordo?.notas ?? null,
          imagensReferencia,
        };
      }

      if (linkingPedido) {
        next.pedidoId = data.pedidoId;
        next.pedidoNumero = data.pedidoNumero;
        next.status = 'PEDIDO_CRIADO';
      } else if (data.status !== undefined) {
        next.status = data.status;
      }

      return next;
    });

    await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).update({
      meses: updatedMeses,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    const updatedDoc = await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).get();

    return NextResponse.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    logError('MESVERSARIO_MES_PUT', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
