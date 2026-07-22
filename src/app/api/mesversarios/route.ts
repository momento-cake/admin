import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createMesversarioSchema } from '@/lib/validators/mesversario';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { buildMeses } from '@/lib/mesversario-utils';
import { formatErrorMessage, logError } from '@/lib/error-handler';

const MESVERSARIOS_COLLECTION = 'mesversarios';

// GET /api/mesversarios - List mesversarios (optional ?status)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar mesversários');
    }

    const status = request.nextUrl.searchParams.get('status') || undefined;

    let q: FirebaseFirestore.Query = adminDb
      .collection(MESVERSARIOS_COLLECTION)
      .where('isActive', '==', true);

    if (status) {
      q = q.where('status', '==', status);
    }

    q = q.orderBy('createdAt', 'desc');

    const snapshot = await q.get();
    const mesversarios = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: mesversarios,
      count: mesversarios.length,
      total: mesversarios.length,
    });
  } catch (error) {
    logError('MESVERSARIOS_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}

// POST /api/mesversarios - Create a new mesversario
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'create')) {
      return forbiddenResponse('Sem permissão para criar mesversários');
    }

    const body = await request.json();

    const validation = createMesversarioSchema.safeParse(body);
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

    const data = validation.data;
    const now = FieldValue.serverTimestamp();
    const meses = buildMeses(data.dataNascimento);

    const mesversarioData = {
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      clienteTelefone: data.clienteTelefone || null,
      relatedPersonId: data.relatedPersonId,
      bebeNome: data.bebeNome,
      dataNascimento: data.dataNascimento,
      status: 'ATIVO',
      meses,
      observacoes: data.observacoes || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid,
      lastModifiedBy: auth.uid,
    };

    const newDocRef = adminDb.collection(MESVERSARIOS_COLLECTION).doc();
    await newDocRef.set(mesversarioData);

    return NextResponse.json(
      { success: true, data: { id: newDocRef.id } },
      { status: 201 }
    );
  } catch (error) {
    logError('MESVERSARIOS_POST', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
