import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, getFiscalBucket } from '@/lib/firebase-admin';
import {
  getAuthFromRequest,
  canPerformActionFromRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import { withPaymentDefaults } from '@/lib/pedidos-server';
import { loadFiscalConfig } from '@/lib/fiscal/config';
import { getFiscalProvider } from '@/lib/fiscal/registry';
import type { FiscalCancelInput, FiscalConfig, FiscalModelo } from '@/lib/fiscal/types';
import type { Pedido } from '@/types/pedido';

// The fiscal provider (NFeWizard) needs the Node runtime.
export const runtime = 'nodejs';

const PEDIDOS_COLLECTION = 'pedidos';
const JUST_MIN = 15;
const JUST_MAX = 255;

// POST /api/pedidos/[id]/nf/cancel — cancel the emitted NF-e/NFC-e
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();
    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para cancelar notas fiscais');
    }

    const pedidoRef = adminDb.collection(PEDIDOS_COLLECTION).doc(id);
    const snapshot = await pedidoRef.get();
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 },
      );
    }
    const pedido = { id, ...snapshot.data() } as Pedido & Record<string, unknown>;

    // Guards: there must be an emitted (not already cancelled) note.
    if (pedido.nfStatus === 'CANCELADA') {
      return NextResponse.json(
        { success: false, error: 'Nota fiscal já está cancelada' },
        { status: 409 },
      );
    }
    if (pedido.nfStatus !== 'EMITIDA') {
      return NextResponse.json(
        { success: false, error: 'Não há nota fiscal emitida para cancelar' },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const justificativa = typeof body?.justificativa === 'string' ? body.justificativa.trim() : '';
    if (justificativa.length < JUST_MIN || justificativa.length > JUST_MAX) {
      return NextResponse.json(
        {
          success: false,
          error: `A justificativa deve ter entre ${JUST_MIN} e ${JUST_MAX} caracteres`,
        },
        { status: 422 },
      );
    }

    if (!pedido.nfAccessKey || !pedido.nfProtocolo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados da nota fiscal incompletos (chave/protocolo) para cancelamento',
        },
        { status: 422 },
      );
    }

    // Missing/incomplete fiscal config is an operator-actionable setup problem.
    let config: FiscalConfig;
    try {
      config = await loadFiscalConfig();
    } catch (err) {
      return NextResponse.json(
        { success: false, error: formatErrorMessage(err), code: 'fiscal-config-missing' },
        { status: 422 },
      );
    }

    const input: FiscalCancelInput = {
      modelo: (pedido.nfModelo as FiscalModelo) ?? 55,
      accessKey: pedido.nfAccessKey,
      protocolo: pedido.nfProtocolo,
      justificativa,
    };

    let result;
    try {
      const provider = await getFiscalProvider();
      result = await provider.cancelNf(input);
    } catch (err) {
      logError('PEDIDO_NF_CANCEL', err);
      return NextResponse.json(
        { success: false, error: formatErrorMessage(err) },
        { status: 504 },
      );
    }

    if (result.status !== 'CANCELADA') {
      const status = result.status === 'ERRO' ? 504 : 422;
      return NextResponse.json(
        {
          success: false,
          error:
            result.rejection?.message ??
            (result.status === 'ERRO'
              ? 'Falha na comunicação com a SEFAZ'
              : 'Cancelamento não homologado'),
          rejection: result.rejection,
          code: status === 422 ? 'nf-cancel-rejected' : undefined,
        },
        { status },
      );
    }

    // Homologated — archive the cancellation record, then stamp the order.
    let cancelXmlPath: string | null = null;
    if (result.xml) {
      cancelXmlPath = `fiscal/${config.ambiente}/${pedido.id}/${pedido.nfAccessKey}-cancel.xml`;
      await getFiscalBucket()
        .file(cancelXmlPath)
        .save(Buffer.from(result.xml, 'utf8'), { contentType: 'application/xml' });
    }

    await pedidoRef.update({
      nfStatus: 'CANCELADA',
      nfCancelledAt: FieldValue.serverTimestamp(),
      nfCancelJustificativa: justificativa,
      nfCancelProtocolo: result.protocolo ?? null,
      nfCancelXmlPath: cancelXmlPath,
    });

    const updated = await pedidoRef.get();

    return NextResponse.json({
      success: true,
      data: {
        pedido: withPaymentDefaults({ id, ...updated.data() } as Pedido & Record<string, unknown>),
        cancel: {
          protocolo: result.protocolo ?? null,
          cancelledAt: result.cancelledAt ?? null,
        },
      },
    });
  } catch (error) {
    logError('PEDIDO_NF_CANCEL_POST', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
