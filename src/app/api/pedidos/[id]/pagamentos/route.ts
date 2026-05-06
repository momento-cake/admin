import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { createPagamentoSchema } from '@/lib/validators/payment';
import {
  calcularTotalPedido,
  resolvePaymentFields,
  sumPagamentos,
} from '@/lib/payment-logic';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import type { Pagamento, Pedido } from '@/types/pedido';

const PEDIDOS_COLLECTION = 'pedidos';

/**
 * Extends the Zod payment schema with optional receipt fields sent by the client
 * after uploading the file to Firebase Storage.
 */
const registerPaymentSchema = createPagamentoSchema.extend({
  pagamentoId: z.string().uuid('pagamentoId deve ser um UUID válido').optional(),
  comprovanteUrl: z.string().url().nullable().optional(),
  comprovantePath: z.string().nullable().optional(),
  comprovanteTipo: z.enum(['pdf', 'image']).nullable().optional(),
});

// POST /api/pedidos/[id]/pagamentos — register a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();

    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para registrar pagamentos');
    }

    const body = await request.json();
    const validation = registerPaymentSchema.safeParse(body);
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

    const pedidoRef = adminDb.collection(PEDIDOS_COLLECTION).doc(id);
    const snapshot = await pedidoRef.get();
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const data = snapshot.data() as Pedido & Record<string, unknown>;
    const partialPedido = {
      id,
      orcamentos: data.orcamentos || [],
      entrega: data.entrega,
    } as Pedido;
    const total = calcularTotalPedido(partialPedido);

    const existingPagamentos: Pagamento[] = Array.isArray(data.pagamentos)
      ? (data.pagamentos as Pagamento[])
      : [];

    const payload = validation.data;
    const now = Timestamp.now();
    // Admin and client SDKs each have their own Timestamp class. We cast to
    // `unknown` here so the Firestore-ready `Pagamento` record is typed against
    // the client-SDK shape consumers expect. The serialized form is identical.
    const pagamento: Pagamento = {
      id: payload.pagamentoId ?? crypto.randomUUID(),
      data: Timestamp.fromDate(payload.data) as unknown as Pagamento['data'],
      valor: payload.valor,
      metodo: payload.metodo,
      observacao: payload.observacao,
      comprovanteUrl: payload.comprovanteUrl ?? null,
      comprovantePath: payload.comprovantePath ?? null,
      comprovanteTipo: payload.comprovanteTipo ?? null,
      createdAt: now as unknown as Pagamento['createdAt'],
      createdBy: auth.uid,
    };

    const updatedPagamentos = [...existingPagamentos, pagamento];
    const totalPago = sumPagamentos(updatedPagamentos);

    // Resolve / default dataVencimento if this is a legacy doc missing it
    const resolved = resolvePaymentFields({
      pagamentos: updatedPagamentos,
      totalPago,
      dataVencimento: data.dataVencimento as unknown as Timestamp,
      dataEntrega: data.dataEntrega as unknown as Timestamp,
      createdAt: data.createdAt as unknown as Timestamp,
      total,
    });

    const dataVencimentoWrite =
      (data.dataVencimento as unknown as Timestamp) ??
      Timestamp.fromDate(resolved.dataVencimentoDate);

    await pedidoRef.update({
      pagamentos: updatedPagamentos,
      totalPago,
      statusPagamento: resolved.statusPagamento,
      dataVencimento: dataVencimentoWrite,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          pagamento,
          totalPago,
          statusPagamento: resolved.statusPagamento,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logError('PEDIDO_PAGAMENTOS_POST', error);
    return NextResponse.json(
      {
        success: false,
        error: formatErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
