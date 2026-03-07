import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { storeSettingsSchema } from '@/lib/validators/pedido';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const SETTINGS_COLLECTION = 'storeSettings';
const SETTINGS_DOC_ID = 'config';

// GET /api/store-settings - Get store settings
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'view')) {
      return forbiddenResponse('Sem permissao para visualizar configuracoes');
    }

    const docSnapshot = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();

    if (!docSnapshot.exists) {
      // Return defaults
      return NextResponse.json({
        success: true,
        data: { custoPorKm: 4.5 },
      });
    }

    return NextResponse.json({
      success: true,
      data: docSnapshot.data(),
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuracoes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/store-settings - Update store settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'settings', 'update')) {
      return forbiddenResponse('Sem permissao para atualizar configuracoes');
    }

    const body = await request.json();

    const validation = storeSettingsSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: String(e.path.join('.')),
        message: e.message,
      }));
      return NextResponse.json(
        { success: false, error: 'Validacao falhou', details: errors },
        { status: 400 }
      );
    }

    const settingsData = {
      custoPorKm: validation.data.custoPorKm,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    };

    await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(SETTINGS_DOC_ID)
      .set(settingsData, { merge: true });

    return NextResponse.json({
      success: true,
      data: settingsData,
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar configuracoes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
