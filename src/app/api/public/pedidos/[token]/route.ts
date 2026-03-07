import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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

    // Filter to only the active orcamento
    const activeOrcamento = (data.orcamentos || []).find(
      (o: { isAtivo: boolean }) => o.isAtivo
    );

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
      storeAddresses,
      storeHours,
    };

    return NextResponse.json({ success: true, data: publicPedido });
  } catch (error) {
    console.error('Erro ao buscar pedido público:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
