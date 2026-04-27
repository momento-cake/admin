import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { linkClientSchema } from '@/lib/validators/whatsapp';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const CLIENTS_COLLECTION = 'clients';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'whatsapp', 'update')) {
      return forbiddenResponse('Sem permissão para editar conversas do WhatsApp');
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = linkClientSchema.safeParse(body);
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

    const { clientId } = parsed.data;

    const convoRef = adminDb.collection(CONVERSATIONS_COLLECTION).doc(id);
    const convoSnap = await convoRef.get();
    if (!convoSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const clientRef = adminDb.collection(CLIENTS_COLLECTION).doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const clientData = clientSnap.data() ?? {};
    const clienteNome: string = clientData.name ?? '';

    const updatePayload = {
      clienteId: clientId,
      clienteNome,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await convoRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...convoSnap.data(),
        ...updatePayload,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error linking client to conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao vincular cliente',
      },
      { status: 500 }
    );
  }
}
