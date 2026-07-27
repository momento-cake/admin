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
import { decryptPii } from '@/lib/billing-encryption';
import { isValidCpfCnpj, stripDocumentDigits } from '@/lib/validators/billing';
import { loadFiscalConfig } from '@/lib/fiscal/config';
import { getFiscalProvider } from '@/lib/fiscal/registry';
import { reserveNfNumero } from '@/lib/fiscal/nf-counter';
import type {
  FiscalConfig,
  FiscalEmitInput,
  FiscalModelo,
  FiscalPayment,
  FiscalRecipient,
} from '@/lib/fiscal/types';
import type { Orcamento, Pedido } from '@/types/pedido';

// The fiscal provider (NFeWizard + pdfkit) needs the Node runtime.
export const runtime = 'nodejs';

const PEDIDOS_COLLECTION = 'pedidos';

/** SEFAZ payment-method codes (tPag) by our internal método. */
const METODO_TO_TPAG: Record<string, string> = {
  PIX: '17',
  DINHEIRO: '01',
  CARTAO_CREDITO: '03',
  CARTAO_DEBITO: '04',
  BOLETO: '15',
  TRANSFERENCIA: '18',
  OUTRO: '99',
};

/** ISO datetime for now in the São Paulo wall clock (UTC-3, no DST). */
function nowSpIso(): string {
  const shifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
    `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}-03:00`
  );
}

/** Discount/surcharge/freight-resolved totals, mirroring buildReciboModel. */
function resolveTotals(orcamento: Orcamento, pedido: Pedido) {
  const produtos = orcamento.itens.reduce((sum, it) => sum + it.total, 0);
  const descontoRaw = orcamento.desconto ?? 0;
  const desconto =
    orcamento.descontoTipo === 'percentual'
      ? produtos * (descontoRaw / 100)
      : descontoRaw;
  const acrescimo = orcamento.acrescimo ?? 0;
  const frete = pedido.entrega?.freteTotal ?? 0;
  const total = Math.max(0, produtos - desconto + acrescimo) + frete;
  return { produtos, desconto, acrescimo, frete, total };
}

/** Map the order's payments (or its checkout session) to SEFAZ detPag entries. */
function resolvePayments(pedido: Pedido, total: number): FiscalPayment[] {
  const pagamentos = pedido.pagamentos ?? [];
  if (pagamentos.length > 0) {
    return pagamentos.map((p) => ({
      tPag: METODO_TO_TPAG[p.metodo] ?? '99',
      valor: p.valor,
    }));
  }
  const method = pedido.paymentSession?.method;
  if (method) {
    return [{ tPag: METODO_TO_TPAG[method] ?? '99', valor: total }];
  }
  return [{ tPag: '99', valor: total }];
}

type RecipientResolution =
  | { recipient?: FiscalRecipient; error?: never }
  | { recipient?: never; error: string };

/**
 * Resolve the destinatário. NF-e (55) requires a valid billing CPF/CNPJ and the
 * client record; NFC-e (65) is anonymous unless the customer supplied a valid
 * CPF (CNPJ is not accepted on a consumer NFC-e).
 */
async function resolveRecipient(
  pedido: Pedido,
  modelo: FiscalModelo,
): Promise<RecipientResolution> {
  const rawDoc = pedido.billing?.cpfCnpj ? decryptPii(pedido.billing.cpfCnpj) : '';
  const digits = stripDocumentDigits(rawDoc);

  if (modelo === 65) {
    // CPF na nota only — anonymous otherwise.
    if (digits.length === 11 && isValidCpfCnpj(digits)) {
      return {
        recipient: {
          nome: pedido.billing?.nome ?? pedido.clienteNome,
          cpfCnpj: digits,
          tipo: 'CPF',
        },
      };
    }
    return {};
  }

  // NF-e (55): document is mandatory and must be valid.
  if (!isValidCpfCnpj(digits)) {
    return { error: 'CPF/CNPJ do cliente inválido para emissão de NF-e' };
  }

  const clientSnap = await adminDb.collection('clients').doc(pedido.clienteId).get();
  if (!clientSnap.exists) {
    return { error: 'Cliente não encontrado para emissão de NF-e' };
  }
  const client = clientSnap.data() as { name?: string; email?: string };

  return {
    recipient: {
      nome: client.name || pedido.billing?.nome || pedido.clienteNome,
      cpfCnpj: digits,
      tipo: digits.length === 14 ? 'CNPJ' : 'CPF',
      ...(client.email ? { email: client.email } : {}),
    },
  };
}

/** Build the emission summary the UI uses to print/reprint the note. */
function nfSummary(
  modelo: FiscalModelo,
  serie: number,
  numero: number,
  accessKey: string | undefined,
  protocolo: string | undefined,
  qrCode: string | undefined,
  urlChave: string | undefined,
  ambiente: FiscalConfig['ambiente'] | undefined,
) {
  return { modelo, serie, numero, accessKey, protocolo, qrCode, urlChave, ambiente };
}

// POST /api/pedidos/[id]/nf — emit the fiscal document (NF-e 55 / NFC-e 65)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) return unauthorizedResponse();
    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para emitir notas fiscais');
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

    // Model: explicit body wins, else derived from the sales channel.
    const body = await request.json().catch(() => ({}));
    const modelo: FiscalModelo =
      body?.modelo === 55 || body?.modelo === 65
        ? body.modelo
        : pedido.origem === 'ONLINE'
          ? 55
          : 65;

    // Idempotency: an already-emitted order is never re-emitted.
    if (pedido.nfStatus === 'EMITIDA') {
      return NextResponse.json({
        success: true,
        data: {
          pedido: withPaymentDefaults(pedido),
          nf: nfSummary(
            (pedido.nfModelo as FiscalModelo) ?? modelo,
            pedido.nfSerie ?? 0,
            pedido.nfNumero ?? 0,
            pedido.nfAccessKey ?? undefined,
            undefined,
            pedido.nfQrCode ?? undefined,
            pedido.nfUrlChave ?? undefined,
            undefined,
          ),
          alreadyEmitted: true,
        },
      });
    }

    // Active orçamento with at least one item.
    const orcamento = (pedido.orcamentos ?? []).find((o) => o.isAtivo);
    if (!orcamento || (orcamento.itens ?? []).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pedido não possui orçamento ativo com itens' },
        { status: 422 },
      );
    }

    // Model 55 gate: needs billing data and a fully-paid order.
    if (modelo === 55) {
      if (!pedido.billing) {
        return NextResponse.json(
          { success: false, error: 'NF-e requer dados de faturamento do cliente' },
          { status: 409 },
        );
      }
      if (pedido.statusPagamento !== 'PAGO') {
        return NextResponse.json(
          { success: false, error: 'NF-e só pode ser emitida para pedidos pagos' },
          { status: 409 },
        );
      }
    }

    // A missing/incomplete fiscal configuration (no certificate, no fiscal doc)
    // is an operator-actionable setup problem, not a server fault — surface it
    // as a typed 422 rather than a generic 500.
    let config: FiscalConfig;
    try {
      config = await loadFiscalConfig();
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(err),
          code: 'fiscal-config-missing',
        },
        { status: 422 },
      );
    }

    if (modelo === 65 && !config.csc) {
      return NextResponse.json(
        {
          success: false,
          error: 'CSC (NFC-e) não configurado nas configurações fiscais',
          code: 'fiscal-config-missing',
        },
        { status: 422 },
      );
    }

    const recipientResolution = await resolveRecipient(pedido, modelo);
    if (recipientResolution.error) {
      return NextResponse.json(
        { success: false, error: recipientResolution.error },
        { status: 422 },
      );
    }

    const totals = resolveTotals(orcamento, pedido);
    const items = orcamento.itens.map((it) => ({
      codigo: it.produtoId || it.id,
      descricao: it.nome,
      quantidade: it.quantidade,
      valorUnitario: it.precoUnitario,
      valorTotal: it.total,
    }));
    const payments = resolvePayments(pedido, totals.total);

    const serie = modelo === 55 ? config.serieNfe : config.serieNfce;
    const numero = await reserveNfNumero(modelo, serie, config.ambiente);

    const input: FiscalEmitInput = {
      modelo,
      serie,
      numero,
      ambiente: config.ambiente,
      issuer: config.issuer,
      taxProfile: config.taxProfile,
      ...(recipientResolution.recipient ? { recipient: recipientResolution.recipient } : {}),
      items,
      totals,
      payments,
      frete: totals.frete,
      numeroPedido: pedido.numeroPedido,
      emittedAtIso: nowSpIso(),
    };

    let result;
    try {
      const provider = await getFiscalProvider();
      result = await provider.emit(input);
    } catch (err) {
      // Infra/timeout/cert failures — the order is left untouched.
      logError('PEDIDO_NF_EMIT', err);
      return NextResponse.json(
        { success: false, error: formatErrorMessage(err) },
        { status: 504 },
      );
    }

    if (result.status !== 'AUTORIZADA') {
      const status = result.status === 'ERRO' ? 504 : 422;
      return NextResponse.json(
        {
          success: false,
          error:
            result.rejection?.message ??
            (result.status === 'ERRO'
              ? 'Falha na comunicação com a SEFAZ'
              : 'Nota não autorizada'),
          rejection: result.rejection,
          status: result.status,
        },
        { status },
      );
    }

    // Authorized — persist the DANFE/XML to private Storage, then stamp the order.
    const bucket = getFiscalBucket();
    const basePath = `fiscal/${config.ambiente}/${pedido.id}/${result.accessKey}`;
    const danfePath = `${basePath}.pdf`;
    const xmlPath = `${basePath}.xml`;

    if (result.danfePdf) {
      await bucket.file(danfePath).save(result.danfePdf, { contentType: 'application/pdf' });
    }
    if (result.xml) {
      await bucket
        .file(xmlPath)
        .save(Buffer.from(result.xml, 'utf8'), { contentType: 'application/xml' });
    }

    await pedidoRef.update({
      nfStatus: 'EMITIDA',
      nfModelo: modelo,
      nfProvider: 'nfewizard',
      nfExternalId: result.accessKey ?? null,
      nfAccessKey: result.accessKey ?? null,
      nfSerie: serie,
      nfNumero: numero,
      nfProtocolo: result.protocolo ?? null,
      nfAmbiente: config.ambiente,
      nfEmittedAt: FieldValue.serverTimestamp(),
      nfXmlPath: result.xml ? xmlPath : null,
      nfDanfePath: result.danfePdf ? danfePath : null,
      nfQrCode: result.qrCode ?? null,
      nfUrlChave: result.urlChave ?? null,
    });

    const updated = await pedidoRef.get();

    return NextResponse.json({
      success: true,
      data: {
        pedido: withPaymentDefaults({ id, ...updated.data() } as Pedido & Record<string, unknown>),
        nf: nfSummary(
          modelo,
          serie,
          numero,
          result.accessKey,
          result.protocolo,
          result.qrCode,
          result.urlChave,
          config.ambiente,
        ),
      },
    });
  } catch (error) {
    logError('PEDIDO_NF_POST', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
