import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { formatErrorMessage, logError } from '@/lib/error-handler';
import type { PedidoStatus } from '@/types/pedido';

const PEDIDOS_COLLECTION = 'pedidos';
const STORE_ADDRESSES_COLLECTION = 'storeAddresses';
const STORE_HOURS_COLLECTION = 'storeHours';

const DIAS_SEMANA_DEFAULTS = [
  { diaSemana: 0, diaSemanaLabel: 'Domingo', abreAs: '08:00', fechaAs: '18:00', fechado: true },
  { diaSemana: 1, diaSemanaLabel: 'Segunda-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 2, diaSemanaLabel: 'Terça-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 3, diaSemanaLabel: 'Quarta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 4, diaSemanaLabel: 'Quinta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 5, diaSemanaLabel: 'Sexta-feira', abreAs: '08:00', fechaAs: '18:00', fechado: false },
  { diaSemana: 6, diaSemanaLabel: 'Sábado', abreAs: '08:00', fechaAs: '14:00', fechado: false },
];

// GET /api/public/pedidos/[token] - Get pedido by public token (no auth required)
// Filters out: pacotes, observacoes, createdBy, lastModifiedBy, non-active orcamentos, NF internal fields
// Includes: store addresses and hours for pickup display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection(PEDIDOS_COLLECTION)
      .where('publicToken', '==', token)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Status-based access control: only allow viewing certain statuses
    const allowedStatuses: PedidoStatus[] = [
      'AGUARDANDO_APROVACAO',
      'CONFIRMADO',
      'AGUARDANDO_PAGAMENTO',
    ];
    if (!allowedStatuses.includes(data.status)) {
      return NextResponse.json(
        { success: false, error: 'Este pedido não está disponível para visualização' },
        { status: 403 }
      );
    }

    // Filter to only the active orcamento and strip internal fields
    const rawOrcamento = (data.orcamentos || []).find(
      (o: { isAtivo: boolean }) => o.isAtivo
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const activeOrcamento = rawOrcamento
      ? (() => { const { criadoPor, criadoEm, ...safe } = rawOrcamento; return safe; })()
      : null;

    // Fetch store addresses and hours in parallel for pickup display
    const [addressesSnap, hoursSnap] = await Promise.all([
      adminDb
        .collection(STORE_ADDRESSES_COLLECTION)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'asc')
        .get(),
      adminDb
        .collection(STORE_HOURS_COLLECTION)
        .orderBy('diaSemana', 'asc')
        .get(),
    ]);

    const storeAddresses = addressesSnap.docs.map((d) => ({
      id: d.id,
      nome: d.data().nome,
      cep: d.data().cep || undefined,
      estado: d.data().estado || undefined,
      cidade: d.data().cidade || undefined,
      bairro: d.data().bairro || undefined,
      endereco: d.data().endereco || undefined,
      numero: d.data().numero || undefined,
      complemento: d.data().complemento || undefined,
      isDefault: d.data().isDefault ?? false,
    }));

    const storeHours = hoursSnap.empty
      ? DIAS_SEMANA_DEFAULTS
      : hoursSnap.docs.map((d) => ({
          diaSemana: d.data().diaSemana,
          diaSemanaLabel: d.data().diaSemanaLabel,
          abreAs: d.data().abreAs,
          fechaAs: d.data().fechaAs,
          fechado: d.data().fechado,
        }));

    // Sanitize the in-flight payment session: never expose providerCustomerId
    // or internal idempotency state to the public response.
    const rawSession = data.paymentSession as Record<string, unknown> | undefined;
    let paymentSession: Record<string, unknown> | null = null;
    if (rawSession) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { providerCustomerId, processedWebhookEventIds, ...safe } = rawSession;
      paymentSession = safe;
    }

    // The latest payment date — convenience for the UI to show "paid at X".
    const pagamentos = Array.isArray(data.pagamentos)
      ? (data.pagamentos as Array<{ data?: unknown }>)
      : [];
    const lastPagamento = pagamentos[pagamentos.length - 1];
    const paidAt = lastPagamento?.data ?? null;

    // LGPD: never echo CPF/CNPJ back to the public client. The customer
    // doesn't need their own document re-displayed; only the metadata
    // (nome/email/telefone/confirmedAt) is useful for "your billing details
    // on file" UX.
    const rawBilling = data.billing as Record<string, unknown> | undefined;
    let safeBilling: Record<string, unknown> | null = null;
    if (rawBilling) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cpfCnpj, ...rest } = rawBilling;
      safeBilling = rest;
    }

    // Build public-safe response (exclude internal data)
    const publicPedido = {
      id: doc.id,
      numeroPedido: data.numeroPedido,
      clienteNome: data.clienteNome,
      status: data.status,
      orcamento: activeOrcamento || null,
      entrega: data.entrega,
      dataEntrega: data.dataEntrega || null,
      observacoesCliente: data.observacoesCliente || null,
      createdAt: data.createdAt,
      billing: safeBilling,
      paymentSession,
      paidAt,
      storeAddresses,
      storeHours,
    };

    return NextResponse.json({ success: true, data: publicPedido });
  } catch (error) {
    logError('PUBLIC_PEDIDO_GET', error);
    return NextResponse.json(
      { success: false, error: formatErrorMessage(error) },
      { status: 500 }
    );
  }
}
