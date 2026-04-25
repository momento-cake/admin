import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getPaymentProvider } from '@/lib/payments/registry';
import { recordChargeConfirmation } from '@/lib/pedido-payment-record';

const PEDIDOS_COLLECTION = 'pedidos';

// POST /api/webhooks/asaas
// Asaas webhook receiver. The provider-layer `parseWebhook` is responsible for
// (a) verifying the access-token header against `ASAAS_WEBHOOK_TOKEN` and
// (b) normalizing the event into our internal `WebhookEvent` shape.
//
// This route returns 200 in most operational cases (including unknown
// externalReference) so Asaas does not retry indefinitely against a pedido
// that no longer exists. The only case that returns 401 is missing/invalid
// auth, which Asaas treats as a configuration error.
export async function POST(request: NextRequest) {
  let event;
  try {
    const rawBody = await request.text();
    const provider = getPaymentProvider();
    event = provider.parseWebhook(rawBody, request.headers);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Webhook não autenticado' },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error('❌ Asaas webhook parse error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook inválido' },
      { status: 401 },
    );
  }

  try {
    const externalReference = event.externalReference;
    if (!externalReference) {
      console.warn(
        '[asaas-webhook] event without externalReference — ignored',
        { eventId: event.id, chargeId: event.chargeId },
      );
      return NextResponse.json({
        success: true,
        ignored: 'no_external_reference',
      });
    }

    const pedidoRef = adminDb
      .collection(PEDIDOS_COLLECTION)
      .doc(externalReference);
    const snap = await pedidoRef.get();
    if (!snap.exists) {
      console.warn('[asaas-webhook] unknown pedido', {
        externalReference,
        eventId: event.id,
      });
      return NextResponse.json({
        success: true,
        ignored: 'unknown_pedido',
      });
    }

    const result = await recordChargeConfirmation(pedidoRef, event);
    if (result.kind === 'not_found') {
      // Lost between the .get() above and the transaction read. Treat like
      // unknown_pedido — the doc disappeared.
      return NextResponse.json({
        success: true,
        ignored: 'unknown_pedido',
      });
    }

    if (result.kind === 'idempotent') {
      return NextResponse.json({ success: true, idempotent: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Asaas webhook handling error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
