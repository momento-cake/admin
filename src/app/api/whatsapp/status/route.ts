import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

const STATUS_COLLECTION = 'whatsapp_status';
const STATUS_DOC_ID = 'primary';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'whatsapp', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar o status do WhatsApp');
    }

    const snap = await adminDb.collection(STATUS_COLLECTION).doc(STATUS_DOC_ID).get();
    if (!snap.exists) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: { id: snap.id, ...snap.data() },
    });
  } catch (error) {
    console.error('Error fetching whatsapp status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar status',
      },
      { status: 500 }
    );
  }
}
