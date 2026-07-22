import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateMesversarioSchema } from '@/lib/validators/mesversario';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const MESVERSARIOS_COLLECTION = 'mesversarios';

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

    return NextResponse.json({ success: true, message: 'Mesversário excluído com sucesso' });
  } catch (error) {
    logError('MESVERSARIO_DELETE', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
