import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateMesversarioSchema } from '@/lib/validators/mesversario';
import { recomputeMesesDates } from '@/lib/mesversario-utils';
import type { MesversarioMes } from '@/types/mesversario';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const MESVERSARIOS_COLLECTION = 'mesversarios';
const PEDIDOS_COLLECTION = 'pedidos';

// GET /api/mesversarios/[id]
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
      return forbiddenResponse('Sem permissão para visualizar mesversários');
    }

    const docSnapshot = await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Mesversário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: docSnapshot.id, ...docSnapshot.data() },
    });
  } catch (error) {
    logError('MESVERSARIO_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

// PUT /api/mesversarios/[id] - Update the mesversario status/observacoes
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
      return forbiddenResponse('Sem permissão para atualizar mesversários');
    }

    const body = await request.json();

    const validation = updateMesversarioSchema.safeParse(body);
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

    const updatePayload: Record<string, unknown> = {
      ...validation.data,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    };

    // Changing the birth date shifts all 12 celebration dates, but each month's
    // status/acordo/pedido link/observações is preserved — only the date moves.
    const existing = existingDoc.data() as { dataNascimento?: string; meses?: MesversarioMes[] };
    const newBirthDate = validation.data.dataNascimento;
    if (newBirthDate && newBirthDate !== existing.dataNascimento) {
      updatePayload.meses = recomputeMesesDates(existing.meses || [], newBirthDate);
    }

    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).update(updatePayload);

    const updatedDoc = await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).get();

    return NextResponse.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    logError('MESVERSARIO_PUT', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/mesversarios/[id] - Soft-delete
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
      return forbiddenResponse('Sem permissão para excluir mesversários');
    }

    const docSnapshot = await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).get();
    if (!docSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Mesversário não encontrado' },
        { status: 404 }
      );
    }

    await adminDb.collection(MESVERSARIOS_COLLECTION).doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    // Detach every linked pedido so it survives the soft-delete without a
    // dangling back-reference. Guard against a missing pedido doc (skip it).
    const existing = docSnapshot.data() as { meses?: MesversarioMes[] };
    const linkedPedidoIds = (existing.meses || [])
      .map((mes) => mes.pedidoId)
      .filter((pedidoId): pedidoId is string => Boolean(pedidoId));

    let detached = 0;
    for (const pedidoId of linkedPedidoIds) {
      const pedidoRef = adminDb.collection(PEDIDOS_COLLECTION).doc(pedidoId);
      const pedidoSnap = await pedidoRef.get();
      if (pedidoSnap.exists) {
        await pedidoRef.update({
          mesversarioId: null,
          mesNumero: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        detached += 1;
      }
    }

    const message =
      detached > 0
        ? `Mesversário excluído com sucesso. ${detached} pedido(s) desvinculado(s).`
        : 'Mesversário excluído com sucesso';

    return NextResponse.json({ success: true, message });
  } catch (error) {
    logError('MESVERSARIO_DELETE', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
