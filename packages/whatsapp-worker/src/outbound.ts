/**
 * Outbox processor.
 *
 * Two entry points:
 *  - `processOutboxItem`: claims one outbox doc via transaction
 *    (`pending → sending`), sends via Baileys, marks `sent` or `failed`.
 *    Pure logic — accepts a mock-friendly `sock` interface.
 *  - `subscribeToOutbox`: convenience wrapper that subscribes via
 *    `onSnapshot` to `whatsapp_outbox where status == 'pending'` and calls
 *    `processOutboxItem` per doc. Tested via the per-item function.
 */

import type { DocumentReference, Firestore } from 'firebase-admin/firestore';

export interface OutgoingSocket {
  sendMessage(jid: string, content: { text: string }): Promise<unknown>;
}

export interface ProcessOutboxOptions {
  /** For tests — inject deterministic clock. */
  now?: () => Date;
}

type OutboxStatus = 'pending' | 'sending' | 'sent' | 'failed';

interface OutboxData {
  status: OutboxStatus;
  to: string;
  text: string;
  conversationId: string;
  authorUserId?: string;
  attempts?: number;
}

function jidFromPhone(phone: string): string {
  return `${phone}@s.whatsapp.net`;
}

function extractWhatsappMessageId(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as { key?: { id?: string } };
  return typeof r.key?.id === 'string' ? r.key.id : undefined;
}

export async function processOutboxItem(
  db: Firestore,
  ref: DocumentReference,
  sock: OutgoingSocket,
  opts: ProcessOutboxOptions = {},
): Promise<'sent' | 'failed' | 'skipped'> {
  const now = opts.now ?? (() => new Date());

  // Phase 1: claim via transaction. If doc isn't pending, skip.
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as OutboxData | undefined;
    if (!data || data.status !== 'pending') return null;

    tx.update(ref, {
      status: 'sending',
      attempts: (data.attempts ?? 0) + 1,
      lastAttemptAt: now(),
      updatedAt: now(),
    });
    return data;
  });

  if (!claim) return 'skipped';

  // Phase 2: actually send.
  try {
    const result = await sock.sendMessage(jidFromPhone(claim.to), { text: claim.text });
    const whatsappMessageId = extractWhatsappMessageId(result);

    // Phase 3a: mark outbox as sent.
    await ref.update({
      status: 'sent',
      whatsappMessageId: whatsappMessageId ?? null,
      updatedAt: now(),
    });

    // Phase 3b: write outbound message doc.
    await db.collection('whatsapp_messages').add({
      conversationId: claim.conversationId,
      whatsappMessageId: whatsappMessageId ?? `local-${ref.id}`,
      direction: 'out',
      type: 'text',
      text: claim.text,
      status: 'sent',
      authorUserId: claim.authorUserId,
      timestamp: now(),
      createdAt: now(),
    });

    // Phase 3c: update conversation tail.
    await db
      .collection('whatsapp_conversations')
      .doc(claim.conversationId)
      .set(
        {
          lastMessageAt: now(),
          lastMessagePreview: claim.text.slice(0, 140),
          lastMessageDirection: 'out',
          updatedAt: now(),
        },
        { merge: true },
      );

    return 'sent';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ref.update({
      status: 'failed',
      error: message,
      updatedAt: now(),
    });
    return 'failed';
  }
}

/**
 * Subscribe to pending outbox docs and process each one.
 *
 * Returns an unsubscribe function. NOT covered by unit tests (the realtime
 * listener is a thin Firestore wrapper); the per-item logic is tested
 * directly via `processOutboxItem`.
 *
 * Sequential processing (one at a time) is intentional in MVP — Baileys
 * itself rate-limits sends, and we don't want to thrash the WhatsApp socket.
 */
export function subscribeToOutbox(
  db: Firestore,
  sock: OutgoingSocket,
  onError?: (err: Error) => void,
): () => void {
  let processing = Promise.resolve();

  const unsubscribe = db
    .collection('whatsapp_outbox')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const ref = change.doc.ref;
            processing = processing.then(async () => {
              try {
                await processOutboxItem(db, ref, sock);
              } catch (err) {
                if (onError) onError(err instanceof Error ? err : new Error(String(err)));
              }
            });
          }
        });
      },
      (err) => {
        if (onError) onError(err);
      },
    );

  return unsubscribe;
}
