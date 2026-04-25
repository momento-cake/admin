import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { quickCreateClientSchema } from '@/lib/validators/whatsapp';

const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';
const CLIENTS_COLLECTION = 'clients';

/**
 * Create a minimal personal client from a conversation's phone number, then
 * link the conversation to the new client.
 *
 * Atendentes use this to register a new contact mid-chat without leaving the
 * inbox. Requires both:
 *   - clients:create  (creating the client doc)
 *   - whatsapp:update (linking it to the conversation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'clients', 'create')) {
      return forbiddenResponse('Sem permissão para criar clientes');
    }
    if (!canPerformActionFromRequest(auth, 'whatsapp', 'update')) {
      return forbiddenResponse('Sem permissão para vincular cliente à conversa');
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da conversa é obrigatório' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = quickCreateClientSchema.safeParse(body);
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

    const phone: string = convo.phone;
    const name = parsed.data.name;
    const now = FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();

    const clientPayload = {
      type: 'person' as const,
      name,
      phone,
      contactMethods: [
        {
          id: `cm-${Date.now()}`,
          type: 'whatsapp' as const,
          value: phone,
          isPrimary: true,
        },
      ],
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: auth.uid,
    };

    const clientRef = await adminDb.collection(CLIENTS_COLLECTION).add(clientPayload);

    const linkUpdate = {
      clienteId: clientRef.id,
      clienteNome: name,
      updatedAt: now,
    };
    await convoRef.update(linkUpdate);

    return NextResponse.json(
      {
        success: true,
        data: {
          client: {
            id: clientRef.id,
            ...clientPayload,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          conversation: {
            id,
            ...convo,
            ...linkUpdate,
            updatedAt: nowIso,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error quick-creating client from conversation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar cliente',
      },
      { status: 500 }
    );
  }
}
