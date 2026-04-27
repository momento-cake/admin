/**
 * History-sync handler for Baileys' `messaging-history.set` event.
 *
 * Baileys emits this event after a fresh pair (and in smaller chunks on later
 * reconnects). The payload contains:
 *   - `chats[]`: every chat the phone has cached for this device
 *   - `messages[]`: recent messages across those chats (window depends on the
 *     `syncFullHistory` socket option)
 *
 * Strategy:
 *   1. For each chat, upsert a `whatsapp_conversations/{phone}` doc.
 *      - Preserve existing `lastMessageAt`/`lastMessagePreview`/`unreadCount`
 *        fields (live messages.upsert is the source of truth for those).
 *      - Backfill name and chat-level `conversationTimestamp` if we did not
 *        have them.
 *      - Mark `placeholder: false` because we now know the chat exists.
 *   2. For each message, dedupe by `whatsappMessageId` and append a
 *      `whatsapp_messages` doc. We do NOT bump `unreadCount` per message —
 *      the chat's own `unreadCount` field is authoritative for history.
 *
 * Group/broadcast/status JIDs are skipped — we only care about 1:1 chats.
 *
 * This handler is idempotent. Re-running with the same payload writes no
 * duplicate messages and overwrites no live data.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { normalizePhone } from './phone.js';
import type { WhatsAppMessageType } from './types.js';

/**
 * Loosened shape of Baileys' `Chat` (`proto.IConversation`) — we only need
 * a handful of fields. Typed loosely to keep this module decoupled from
 * the live `@whiskeysockets/baileys` types so tests can supply plain objects.
 */
export interface HistoryChat {
  id?: string | null;
  name?: string | null;
  unreadCount?: number | null;
  conversationTimestamp?: number | { toNumber?: () => number } | null;
}

export interface HistoryMessageKey {
  remoteJid?: string | null;
  fromMe?: boolean | null;
  id?: string | null;
}

export interface HistoryMessage {
  key?: HistoryMessageKey | null;
  pushName?: string | null;
  message?: {
    conversation?: string | null;
    extendedTextMessage?: { text?: string | null } | null;
    imageMessage?: unknown;
    audioMessage?: unknown;
    videoMessage?: unknown;
    documentMessage?: unknown;
    stickerMessage?: unknown;
    locationMessage?: unknown;
    contactMessage?: unknown;
  } | null;
  messageTimestamp?: number | { toNumber?: () => number } | null;
}

export interface HistorySyncEvent {
  chats: HistoryChat[];
  contacts?: unknown[];
  messages: HistoryMessage[];
  isLatest?: boolean;
  progress?: number | null;
  syncType?: number | null;
}

export interface HistorySyncResult {
  chatsUpserted: number;
  messagesIngested: number;
  skipped: number;
}

const PREVIEW_MAX = 140;

function jidToPhone(jid: string | null | undefined): string | undefined {
  if (!jid) return undefined;
  const at = jid.indexOf('@');
  const head = at >= 0 ? jid.slice(0, at) : jid;
  return head.split(':')[0] || undefined;
}

function isOneToOneJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  // Baileys uses suffixes:
  //   @s.whatsapp.net  — 1:1 personal
  //   @g.us            — group
  //   status@broadcast — status
  //   @broadcast       — broadcast lists
  //   @lid             — lid (link-id) variant; treat as personal too
  //   @newsletter      — newsletters/channels
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Baileys timestamps are seconds.
    return value * 1000;
  }
  if (typeof value === 'object' && value !== null && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    const n = (value as { toNumber: () => number }).toNumber();
    return n * 1000;
  }
  return null;
}

function inferType(msg: HistoryMessage): WhatsAppMessageType {
  const m = msg.message;
  if (!m) return 'system';
  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.imageMessage) return 'image';
  if (m.audioMessage) return 'audio';
  if (m.videoMessage) return 'video';
  if (m.documentMessage) return 'document';
  if (m.stickerMessage) return 'sticker';
  if (m.locationMessage) return 'location';
  if (m.contactMessage) return 'contact';
  return 'system';
}

function inferText(msg: HistoryMessage): string | undefined {
  const m = msg.message;
  if (!m) return undefined;
  return m.conversation || m.extendedTextMessage?.text || undefined;
}

function buildPreview(text: string | undefined, type: WhatsAppMessageType): string {
  if (type === 'text' && text) return text.slice(0, PREVIEW_MAX);
  switch (type) {
    case 'image': return '[imagem]';
    case 'audio': return '[áudio]';
    case 'video': return '[vídeo]';
    case 'document': return '[documento]';
    case 'sticker': return '[sticker]';
    case 'location': return '[localização]';
    case 'contact': return '[contato]';
    case 'system': return '[mensagem do sistema]';
    default: return '';
  }
}

/**
 * Upsert the `whatsapp_conversations/{phone}` doc for a single chat.
 *
 * If the doc already has a `lastMessageAt`, we treat the live `inbound.ts` /
 * `outbound.ts` data as authoritative and only fill in *missing* metadata
 * (name, unread count) without overwriting the tail.
 */
async function upsertChat(
  db: Firestore,
  chat: HistoryChat,
  instanceId: string,
): Promise<'upserted' | 'skipped'> {
  const jid = chat.id ?? undefined;
  if (!isOneToOneJid(jid)) return 'skipped';

  const phone = normalizePhone(jidToPhone(jid));
  if (!phone) return 'skipped';

  const now = new Date();
  const ref = db.collection('whatsapp_conversations').doc(phone);
  const snap = await ref.get();

  const chatTsMillis = toMillis(chat.conversationTimestamp);
  const chatTs = chatTsMillis !== null ? new Date(chatTsMillis) : null;

  if (!snap.exists) {
    // Brand-new conversation discovered via history sync.
    const doc: Record<string, unknown> = {
      phone,
      phoneRaw: phone,
      placeholder: false,
      unreadCount: chat.unreadCount ?? 0,
      lastMessageDirection: 'in',
      lastMessagePreview: '',
      createdAt: now,
      updatedAt: now,
      instanceId,
    };
    if (chat.name) doc.whatsappName = chat.name;
    if (chatTs) doc.lastMessageAt = chatTs;
    await ref.set(doc);
    return 'upserted';
  }

  // Conversation exists. Only fill in gaps; do not stomp on live tail data.
  const existing = snap.data() as Record<string, unknown> | undefined;
  const update: Record<string, unknown> = {
    placeholder: false,
    updatedAt: now,
  };
  if (chat.name && !existing?.whatsappName) {
    update.whatsappName = chat.name;
  }
  // Only set lastMessageAt if the existing row never had one (e.g. a
  // placeholder row created by Strategy B).
  if (!existing?.lastMessageAt && chatTs) {
    update.lastMessageAt = chatTs;
  }
  if (existing?.unreadCount === undefined && typeof chat.unreadCount === 'number') {
    update.unreadCount = chat.unreadCount;
  }
  await ref.update(update);
  return 'upserted';
}

/**
 * Append a single history message to `whatsapp_messages` if not already
 * present. Returns 'inserted' or 'duplicate'/'skipped'.
 *
 * This intentionally does NOT bump `unreadCount` on the conversation —
 * the chat-level `unreadCount` from the snapshot is authoritative.
 */
async function ingestMessage(
  db: Firestore,
  msg: HistoryMessage,
): Promise<'inserted' | 'duplicate' | 'skipped'> {
  const wid = msg.key?.id;
  const remoteJid = msg.key?.remoteJid;
  if (!wid || !remoteJid) return 'skipped';

  // Skip our own messages — outgoing history is reconstructed from outbox.
  if (msg.key?.fromMe) return 'skipped';

  if (!isOneToOneJid(remoteJid)) return 'skipped';
  const phone = normalizePhone(jidToPhone(remoteJid));
  if (!phone) return 'skipped';

  // Dedup.
  const dedup = await db
    .collection('whatsapp_messages')
    .where('whatsappMessageId', '==', wid)
    .limit(1)
    .get();
  if (!dedup.empty) return 'duplicate';

  const tsMillis = toMillis(msg.messageTimestamp) ?? Date.now();
  const ts = new Date(tsMillis);
  const type = inferType(msg);
  const text = inferText(msg);

  await db.collection('whatsapp_messages').add({
    conversationId: phone,
    whatsappMessageId: wid,
    direction: 'in',
    type,
    text,
    timestamp: ts,
    createdAt: new Date(),
  });

  // Best-effort: if the conversation row exists but has no preview yet
  // (e.g. ingested chat first), backfill the preview from this message.
  // We avoid overwriting an existing preview because messages may arrive
  // in any order from the snapshot.
  try {
    const convRef = db.collection('whatsapp_conversations').doc(phone);
    const convSnap = await convRef.get();
    if (convSnap.exists) {
      const data = convSnap.data() as Record<string, unknown> | undefined;
      const hasNoPreview = !data?.lastMessagePreview;
      const hasNoTail = !data?.lastMessageAt;
      if (hasNoPreview || hasNoTail) {
        const update: Record<string, unknown> = {};
        if (hasNoPreview) update.lastMessagePreview = buildPreview(text, type);
        if (hasNoTail) update.lastMessageAt = ts;
        if (Object.keys(update).length > 0) {
          update.lastMessageDirection = 'in';
          await convRef.update(update);
        }
      }
    }
  } catch {
    // Non-fatal — message is already recorded.
  }

  return 'inserted';
}

export async function handleHistorySync(
  db: Firestore,
  event: HistorySyncEvent,
  instanceId: string,
): Promise<HistorySyncResult> {
  let chatsUpserted = 0;
  let messagesIngested = 0;
  let skipped = 0;

  for (const chat of event.chats ?? []) {
    try {
      const status = await upsertChat(db, chat, instanceId);
      if (status === 'upserted') chatsUpserted += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  for (const msg of event.messages ?? []) {
    try {
      const status = await ingestMessage(db, msg);
      if (status === 'inserted') messagesIngested += 1;
      else if (status === 'duplicate' || status === 'skipped') skipped += 1;
    } catch {
      skipped += 1;
    }
  }

  return { chatsUpserted, messagesIngested, skipped };
}
