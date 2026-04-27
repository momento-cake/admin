import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

const MESSAGES_COLLECTION = 'whatsapp_messages';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'whatsapp', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar mensagens do WhatsApp');
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    const sp = request.nextUrl.searchParams;
    const rawLimit = sp.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const beforeRaw = sp.get('before');
    const beforeMs = beforeRaw ? parseInt(beforeRaw, 10) : null;
    const beforeTs = beforeMs && Number.isFinite(beforeMs)
      ? Timestamp.fromMillis(beforeMs)
      : null;

    let q: FirebaseFirestore.Query = adminDb
      .collection(MESSAGES_COLLECTION)
      .where('conversationId', '==', id);

    if (beforeTs) {
      q = q.where('timestamp', '<', beforeTs);
    }

    q = q.orderBy('timestamp', 'asc').limit(limit);

    const snapshot = await q.get();
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching whatsapp messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar mensagens',
      },
      { status: 500 }
    );
  }
}
