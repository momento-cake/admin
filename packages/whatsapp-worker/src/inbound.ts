/**
 * Incoming-message handler.
 *
 * Responsibilities (in order):
 *  1. Dedupe via `whatsapp_messages.whatsappMessageId` — if seen, no-op.
 *  2. Normalize the sender phone (conversationId == normalized phone).
 *  3. Upsert `whatsapp_conversations/{conversationId}` (create or update),
 *     bumping `unreadCount`, `lastMessageAt`, `lastMessagePreview`,
 *     `lastMessageDirection: 'in'`. Optionally auto-link an active client by phone.
 *  4. Append a `whatsapp_messages` doc.
 *
 * Pure logic — no Baileys imports here. Caller adapts Baileys'
 * `messages.upsert` shape into our `IncomingMessage` interface and calls in.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { normalizePhone } from './phone.js';
import type { WhatsAppMessageType } from './types.js';

export interface IncomingMessage {
  whatsappMessageId: string;
  /** Sender phone in any format — will be normalized. */
  from: string;
  pushName?: string;
  text?: string;
  type: WhatsAppMessageType;
  timestamp: Date;
}

const PREVIEW_MAX = 140;

function buildPreview(msg: IncomingMessage): string {
  if (msg.type === 'text' && msg.text) {
    return msg.text.slice(0, PREVIEW_MAX);
  }
  switch (msg.type) {
    case 'image':
      return '[imagem]';
    case 'audio':
      return '[áudio]';
    case 'video':
      return '[vídeo]';
    case 'document':
      return '[documento]';
    case 'sticker':
      return '[sticker]';
    case 'location':
      return '[localização]';
    case 'contact':
      return '[contato]';
    case 'system':
      return '[mensagem do sistema]';
    default:
      return '';
  }
}

/**
 * Best-effort client lookup by phone. We try both the top-level `phone` field
 * and `contactMethods[].value`. Multiple matches: pick most recently updated.
 *
 * Limited to active clients to avoid linking soft-deleted records.
 */
async function findClientByPhone(
  db: Firestore,
  phone: string,
): Promise<{ id: string; name?: string } | null> {
  const matches: Array<{ id: string; data: Record<string, unknown> }> = [];

  // Match 1: top-level `phone` field equals normalized phone.
  try {
    const snap = await db
      .collection('clients')
      .where('phone', '==', phone)
      .limit(10)
      .get();
    snap.docs.forEach((d) => matches.push({ id: d.id, data: d.data() as Record<string, unknown> }));
  } catch {
    // Index may not exist yet — fall through.
  }

  // Match 2: contactMethods array contains a method with this value.
  try {
    const snap = await db
      .collection('clients')
      .where('contactMethodValues', 'array-contains', phone)
      .limit(10)
      .get();
    snap.docs.forEach((d) => matches.push({ id: d.id, data: d.data() as Record<string, unknown> }));
  } catch {
    // No `contactMethodValues` field/index — fall through.
  }

  // Deduplicate by id, prefer active and most-recently-updated.
  const byId = new Map<string, Record<string, unknown>>();
  for (const m of matches) {
    if (!byId.has(m.id)) byId.set(m.id, m.data);
  }
  const active = [...byId.entries()].filter(([, d]) => d.isActive !== false);
  if (active.length === 0) return null;

  active.sort(([, a], [, b]) => {
    const ta = toMillis(a.updatedAt);
    const tb = toMillis(b.updatedAt);
    return tb - ta;
  });
  const [id, data] = active[0];
  return { id, name: typeof data.name === 'string' ? data.name : undefined };
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'object' && value !== null && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export async function handleIncomingMessage(
  db: Firestore,
  msg: IncomingMessage,
  instanceId: string,
): Promise<{ status: 'inserted' | 'duplicate' | 'invalid'; conversationId?: string }> {
  // 1. Dedupe.
  const dedupSnap = await db
    .collection('whatsapp_messages')
    .where('whatsappMessageId', '==', msg.whatsappMessageId)
    .limit(1)
    .get();
  if (!dedupSnap.empty) {
    return { status: 'duplicate' };
  }

  // 2. Normalize phone.
  const normalized = normalizePhone(msg.from);
  if (!normalized) {
    return { status: 'invalid' };
  }
  const conversationId = normalized;

  // 3. Upsert conversation.
  const convRef = db.collection('whatsapp_conversations').doc(conversationId);
  const convSnap = await convRef.get();
  const now = new Date();
  const preview = buildPreview(msg);

  if (!convSnap.exists) {
    // Try to auto-link client.
    let clienteId: string | undefined;
    let clienteNome: string | undefined;
    try {
      const match = await findClientByPhone(db, normalized);
      if (match) {
        clienteId = match.id;
        clienteNome = match.name;
      }
    } catch {
      // Best-effort — never let client lookup break ingestion.
    }

    const convDoc: Record<string, unknown> = {
      phone: normalized,
      phoneRaw: msg.from,
      whatsappName: msg.pushName,
      lastMessageAt: msg.timestamp,
      lastMessagePreview: preview,
      lastMessageDirection: 'in',
      unreadCount: 1,
      createdAt: now,
      updatedAt: now,
      instanceId,
    };
    if (clienteId !== undefined) convDoc.clienteId = clienteId;
    if (clienteNome !== undefined) convDoc.clienteNome = clienteNome;
    await convRef.set(convDoc);
  } else {
    const existing = convSnap.data() as { unreadCount?: number; clienteId?: string };
    const update: Record<string, unknown> = {
      lastMessageAt: msg.timestamp,
      lastMessagePreview: preview,
      lastMessageDirection: 'in',
      unreadCount: (existing?.unreadCount ?? 0) + 1,
      updatedAt: now,
    };
    if (msg.pushName) update.whatsappName = msg.pushName;
    // If conversation was previously unlinked, attempt to link now.
    if (!existing?.clienteId) {
      try {
        const match = await findClientByPhone(db, normalized);
        if (match) {
          update.clienteId = match.id;
          if (match.name) update.clienteNome = match.name;
        }
      } catch {
        // ignore
      }
    }
    await convRef.update(update);
  }

  // 4. Append message doc.
  await db.collection('whatsapp_messages').add({
    conversationId,
    whatsappMessageId: msg.whatsappMessageId,
    direction: 'in',
    type: msg.type,
    text: msg.text,
    timestamp: msg.timestamp,
    createdAt: now,
  });

  return { status: 'inserted', conversationId };
}
