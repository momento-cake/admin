import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'whatsapp', 'view')) {
      return forbiddenResponse('Sem permissão para visualizar conversas do WhatsApp');
    }

    const sp = request.nextUrl.searchParams;
    const search = sp.get('search')?.trim() || undefined;
    const clienteId = sp.get('clienteId')?.trim() || undefined;

    const rawLimit = sp.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    let q: FirebaseFirestore.Query = adminDb.collection(CONVERSATIONS_COLLECTION);
    if (clienteId) {
      q = q.where('clienteId', '==', clienteId);
    }
    q = q.orderBy('lastMessageAt', 'desc');

    const snapshot = await q.get();
    let conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (search) {
      const lower = search.toLowerCase();
      conversations = conversations.filter((c) => {
        const record = c as { clienteNome?: string; phone?: string };
        const nameMatch = record.clienteNome?.toLowerCase?.().includes(lower) ?? false;
        const phoneMatch = record.phone?.toLowerCase?.().includes(lower) ?? false;
        return nameMatch || phoneMatch;
      });
    }

    const limited = conversations.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limited,
      total: limited.length,
      limit,
    });
  } catch (error) {
    console.error('Error fetching whatsapp conversations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar conversas',
      },
      { status: 500 }
    );
  }
}
