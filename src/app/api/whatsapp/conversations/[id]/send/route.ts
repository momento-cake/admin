import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { sendMessageSchema } from '@/lib/validators/whatsapp';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const OUTBOX_COLLECTION = 'whatsapp_outbox';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'whatsapp', 'create')) {
      return forbiddenResponse('Sem permissão para enviar mensagens do WhatsApp');
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: parsed.error.issues.map((e) => ({
            field: String(e.path.join('.')),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const convoRef = adminDb.collection(CONVERSATIONS_COLLECTION).doc(id);
    const convoSnap = await convoRef.get();
    if (!convoSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const convo = convoSnap.data() ?? {};
    if (!convo.phone) {
      return NextResponse.json(
        { success: false, error: 'Conversa sem telefone associado' },
        { status: 400 }
      );
    }

    const docData = {
      conversationId: id,
      to: convo.phone,
      text: parsed.data.text,
      status: 'pending' as const,
      attempts: 0,
      authorUserId: auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection(OUTBOX_COLLECTION).add(docData);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: docRef.id,
          ...docData,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending whatsapp message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
      },
      { status: 500 }
    );
  }
}
