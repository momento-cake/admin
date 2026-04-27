import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getPaymentProvider } from '@/lib/payments/registry';
import { recordChargeConfirmation } from '@/lib/pedido-payment-record';

const PEDIDOS_COLLECTION = 'pedidos';

type WebhookOutcome =
  | 'recorded'
  | 'idempotent'
  | 'unknown_pedido'
  | 'unhandled_status'
  | 'parse_failed';

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
      console.info('[asaas-webhook]', {
        event: undefined,
        chargeId: undefined,
        externalReference: undefined,
        outcome: 'parse_failed' satisfies WebhookOutcome,
      });
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
      console.info('[asaas-webhook]', {
        event: event.id,
        chargeId: event.chargeId,
        externalReference: undefined,
        outcome: 'unknown_pedido' satisfies WebhookOutcome,
      });
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
      console.info('[asaas-webhook]', {
        event: event.id,
        chargeId: event.chargeId,
        externalReference,
        outcome: 'unknown_pedido' satisfies WebhookOutcome,
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
      console.info('[asaas-webhook]', {
        event: event.id,
        chargeId: event.chargeId,
        externalReference,
        outcome: 'unknown_pedido' satisfies WebhookOutcome,
        pedidoId: pedidoRef.id,
      });
      return NextResponse.json({
        success: true,
        ignored: 'unknown_pedido',
      });
    }

    if (result.kind === 'idempotent') {
      console.info('[asaas-webhook]', {
        event: event.id,
        chargeId: event.chargeId,
        externalReference,
        outcome: 'idempotent' satisfies WebhookOutcome,
        pedidoId: pedidoRef.id,
      });
      return NextResponse.json({ success: true, idempotent: true });
    }

    if (result.kind === 'unhandled_status') {
      console.info('[asaas-webhook]', {
        event: event.id,
        chargeId: event.chargeId,
        externalReference,
        outcome: 'unhandled_status' satisfies WebhookOutcome,
        pedidoId: pedidoRef.id,
      });
      return NextResponse.json({ success: true });
    }

    console.info('[asaas-webhook]', {
      event: event.id,
      chargeId: event.chargeId,
      externalReference,
      outcome: 'recorded' satisfies WebhookOutcome,
      pedidoId: pedidoRef.id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Asaas webhook handling error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
