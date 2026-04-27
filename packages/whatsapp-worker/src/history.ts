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
 *      - Backfill `whatsappName` from the most recent inbound message's
 *        `pushName` for that chat. `Chat.name` from Baileys is unreliable for
 *        unsaved contacts — message-level `pushName` is the source of truth.
 *      - Backfill `profilePictureUrl` via `sock.profilePictureUrl(jid)` when
 *        we don't already have a fresh one. Per-JID throttle keeps us from
 *        hammering WA when the same chat appears across multiple chunks.
 *      - Backfill chat-level `conversationTimestamp` if we did not have one.
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
 * Mock-friendly subset of the Baileys WASocket — only the bits the history
 * handler actually calls. Mirrors the same shape `inbound.ts` uses, but
 * declared locally so this module stays decoupled.
 */
export interface ProfilePictureCapableSocket {
  profilePictureUrl(jid: string, type?: 'image' | 'preview'): Promise<string | undefined>;
}

/**
 * WhatsApp signs profile-picture URLs with a ~24h TTL. Match `inbound.ts` and
 * re-fetch every 20h to give a comfortable refresh margin.
 */
const PROFILE_PHOTO_REFRESH_MS = 20 * 60 * 60 * 1000;

/**
 * Burst protection — history sync chunks can repeat the same JID across
 * messages.upsert and across multiple `messaging-history.set` events. Avoid
 * piling up profile-picture calls per JID within a short window.
 */
const PROFILE_PHOTO_THROTTLE_MS = 60 * 1000;

/**
 * Module-local map of `jid -> last fetch attempt time (ms)`. Intentionally NOT
 * shared with `inbound.ts`'s map — both modules independently fetch and persist
 * their own results, and a 60s overlap of cooperating fetches is fine.
 */
const lastProfilePhotoFetchByJid = new Map<string, number>();

/**
 * Test-only reset helper. Clears the in-memory throttle between cases without
 * `vi.useFakeTimers`. Not part of the public API.
 */
export function __resetProfilePhotoThrottleForTests(): void {
  lastProfilePhotoFetchByJid.clear();
}

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
 * Decide whether to (re-)fetch a profile picture for this conversation.
 *
 * Combines two gates:
 *  1. Stale-doc gate: no URL yet OR doc's `profilePictureRefreshedAt` older
 *     than 20h.
 *  2. Burst gate: in-memory `lastProfilePhotoFetchByJid` indicates we just
 *     fetched within the last 60s — skip even if the doc is stale.
 */
function shouldRefreshProfilePhoto(
  existing: { profilePictureUrl?: unknown; profilePictureRefreshedAt?: unknown } | undefined,
  jid: string,
  nowMs: number,
): boolean {
  const lastFetchMs = lastProfilePhotoFetchByJid.get(jid);
  if (lastFetchMs !== undefined && nowMs - lastFetchMs < PROFILE_PHOTO_THROTTLE_MS) {
    return false;
  }

  if (!existing) return true;
  const hasUrl = typeof existing.profilePictureUrl === 'string'
    && (existing.profilePictureUrl as string).length > 0;
  if (!hasUrl) return true;
  const refreshedAtMs = toRefreshedAtMillis(existing.profilePictureRefreshedAt);
  if (refreshedAtMs === 0) return true;
  return nowMs - refreshedAtMs > PROFILE_PHOTO_REFRESH_MS;
}

function toRefreshedAtMillis(value: unknown): number {
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

/**
 * Best-effort profile-picture fetch + cache. Never throws — Baileys returns
 * undefined or rejects with a 404 for private/hidden accounts, both of which
 * are normal and must not break history ingestion.
 */
async function fetchProfilePhotoPatch(
  sock: ProfilePictureCapableSocket,
  jid: string,
  now: Date,
): Promise<Record<string, unknown>> {
  lastProfilePhotoFetchByJid.set(jid, now.getTime());
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    if (typeof url === 'string' && url.length > 0) {
      return { profilePictureUrl: url, profilePictureRefreshedAt: now };
    }
    return { profilePictureRefreshedAt: now };
  } catch {
    return { profilePictureRefreshedAt: now };
  }
}

/**
 * Best-effort client lookup by phone — same logic as `inbound.ts`. Tries
 * both the top-level `phone` field and `contactMethodValues` array. Returns
 * the most recently-updated active match, or null.
 *
 * Limited to active clients to avoid linking soft-deleted records.
 */
async function findClientByPhone(
  db: Firestore,
  phone: string,
): Promise<{ id: string; name?: string } | null> {
  const matches: Array<{ id: string; data: Record<string, unknown> }> = [];

  try {
    const snap = await db
      .collection('clients')
      .where('phone', '==', phone)
      .limit(10)
      .get();
    snap.docs.forEach((d) => matches.push({ id: d.id, data: d.data() as Record<string, unknown> }));
  } catch {
    // ignore — index may not exist
  }

  try {
    const snap = await db
      .collection('clients')
      .where('contactMethodValues', 'array-contains', phone)
      .limit(10)
      .get();
    snap.docs.forEach((d) => matches.push({ id: d.id, data: d.data() as Record<string, unknown> }));
  } catch {
    // ignore — field/index may not exist
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const m of matches) {
    if (!byId.has(m.id)) byId.set(m.id, m.data);
  }
  const active = [...byId.entries()].filter(([, d]) => d.isActive !== false);
  if (active.length === 0) return null;

  active.sort(([, a], [, b]) => {
    const ta = clientUpdatedAtMillis(a.updatedAt);
    const tb = clientUpdatedAtMillis(b.updatedAt);
    return tb - ta;
  });
  const [id, data] = active[0];
  return { id, name: typeof data.name === 'string' ? data.name : undefined };
}

function clientUpdatedAtMillis(value: unknown): number {
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

/**
 * Upsert the `whatsapp_conversations/{phone}` doc for a single chat.
 *
 * If the doc already has a `lastMessageAt`, we treat the live `inbound.ts` /
 * `outbound.ts` data as authoritative and only fill in *missing* metadata
 * (name, photo, unread count) without overwriting the tail.
 *
 * @param resolvedPushName — most recent inbound `pushName` we extracted for
 *   this chat from the same history snapshot. May be undefined when no
 *   suitable inbound message was found.
 */
async function upsertChat(
  db: Firestore,
  chat: HistoryChat,
  instanceId: string,
  sock: ProfilePictureCapableSocket | undefined,
  resolvedPushName: string | undefined,
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

  // Resolve name. Order:
  //   1. message-level pushName from this snapshot
  //   2. chat.name (often the phone number or empty for unsaved contacts —
  //      kept as a weak hint)
  //   3. matched client name from `clients` collection — the production
  //      escape hatch for the 175 chats whose history-sync chunks never
  //      shipped pushName. Looked up lazily, so we only pay the Firestore
  //      cost when the first two sources came up empty.
  // chat.name is checked here but applied below conditionally to keep the
  // strict "client lookup beats chat.name when pushName is missing" order.
  let resolvedName = resolvedPushName ?? undefined;
  let matchedClient: { id: string; name?: string } | null = null;
  if (!resolvedName) {
    try {
      matchedClient = await findClientByPhone(db, phone);
    } catch {
      // ignore — best-effort
    }
    if (matchedClient?.name) {
      resolvedName = matchedClient.name;
    } else if (chat.name && chat.name.trim().length > 0) {
      resolvedName = chat.name;
    }
  }

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
    if (resolvedName) doc.whatsappName = resolvedName;
    if (chatTs) doc.lastMessageAt = chatTs;
    if (matchedClient) {
      doc.clienteId = matchedClient.id;
      if (matchedClient.name) doc.clienteNome = matchedClient.name;
    }

    // Profile-picture fetch — first time we've seen this chat, always try.
    if (sock && jid && shouldRefreshProfilePhoto(undefined, jid, now.getTime())) {
      const photoPatch = await fetchProfilePhotoPatch(sock, jid, now);
      Object.assign(doc, photoPatch);
    }

    await ref.set(doc);
    return 'upserted';
  }

  // Conversation exists. Only fill in gaps; do not stomp on live tail data.
  const existing = snap.data() as Record<string, unknown> | undefined;
  const existingName = typeof existing?.whatsappName === 'string'
    ? (existing.whatsappName as string).trim()
    : '';
  const update: Record<string, unknown> = {
    placeholder: false,
    updatedAt: now,
  };
  if (resolvedName && !existingName) {
    // Only fill in when the existing value is missing/empty — never stomp on
    // a fresher name set by inbound.ts.
    update.whatsappName = resolvedName;
  }
  // Backfill clienteId / clienteNome when the conversation isn't linked yet.
  // We may have already done a client lookup above (when no pushName was
  // available) — reuse that result rather than querying twice.
  if (!existing?.clienteId && matchedClient) {
    update.clienteId = matchedClient.id;
    if (matchedClient.name) update.clienteNome = matchedClient.name;
  }
  // Only set lastMessageAt if the existing row never had one (e.g. a
  // placeholder row created by Strategy B).
  if (!existing?.lastMessageAt && chatTs) {
    update.lastMessageAt = chatTs;
  }
  if (existing?.unreadCount === undefined && typeof chat.unreadCount === 'number') {
    update.unreadCount = chat.unreadCount;
  }

  // Profile-picture refresh on stale URL (or no URL yet). Throttle prevents
  // hammering WA when the same JID appears across history chunks.
  if (sock && jid && shouldRefreshProfilePhoto(
    existing as { profilePictureUrl?: unknown; profilePictureRefreshedAt?: unknown } | undefined,
    jid,
    now.getTime(),
  )) {
    const photoPatch = await fetchProfilePhotoPatch(sock, jid, now);
    Object.assign(update, photoPatch);
  }

  await ref.update(update);
  return 'upserted';
}

/**
 * Walk `event.messages[]` and pick, per remoteJid, the most recent inbound
 * message's `pushName`. This is the contact's self-reported display name —
 * it's what `inbound.ts` already uses as the source of truth.
 *
 * Whitespace-only and empty pushNames are ignored.
 */
function buildPushNameByJid(messages: HistoryMessage[]): Map<string, string> {
  const out = new Map<string, { name: string; tsMs: number }>();
  for (const msg of messages) {
    if (!msg?.key) continue;
    if (msg.key.fromMe) continue; // pushName on our own messages = our own name
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid) continue;
    const raw = typeof msg.pushName === 'string' ? msg.pushName.trim() : '';
    if (!raw) continue;

    const tsMs = toMillis(msg.messageTimestamp) ?? 0;
    const prev = out.get(remoteJid);
    if (!prev || tsMs >= prev.tsMs) {
      out.set(remoteJid, { name: raw, tsMs });
    }
  }
  const result = new Map<string, string>();
  for (const [jid, entry] of out) {
    result.set(jid, entry.name);
  }
  return result;
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
  sock?: ProfilePictureCapableSocket,
): Promise<HistorySyncResult> {
  let chatsUpserted = 0;
  let messagesIngested = 0;
  let skipped = 0;

  // Pre-compute pushName-by-jid from the snapshot's messages so we can backfill
  // `whatsappName` on each chat we upsert. Doing this in one pass keeps
  // upsertChat() from re-walking event.messages per chat.
  const pushNameByJid = buildPushNameByJid(event.messages ?? []);

  for (const chat of event.chats ?? []) {
    try {
      const jid = chat.id ?? undefined;
      const resolvedPushName = jid ? pushNameByJid.get(jid) : undefined;
      const status = await upsertChat(db, chat, instanceId, sock, resolvedPushName);
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
