/**
 * Incoming-message handler.
 *
 * Responsibilities (in order):
 *  1. Dedupe via `whatsapp_messages.whatsappMessageId` — if seen, no-op.
 *  2. Normalize the sender phone (conversationId == normalized phone).
 *  3. Upsert `whatsapp_conversations/{conversationId}` (create or update),
 *     bumping `lastMessageAt`, `lastMessagePreview`, `lastMessageDirection`.
 *     Optionally auto-link an active client by phone.
 *  4. Append a `whatsapp_messages` doc.
 *
 * Handles two flavors:
 *  - `fromMe: false` (default): a message the contact sent us. Writes
 *    `direction: 'in'`, increments `unreadCount`, may update `whatsappName`
 *    from `pushName`.
 *  - `fromMe: true`: a message we sent from another linked device (phone,
 *    WA Web on another browser). Writes `direction: 'out'` with
 *    `status: 'sent'`, leaves `unreadCount` and `whatsappName` untouched —
 *    `pushName` on a fromMe message is OUR own name, not the contact's.
 *    Outbound.ts already writes for messages sent through our admin's send
 *    path; the dedup-by-`whatsappMessageId` step makes this a no-op when
 *    that's the case.
 *
 * Pure logic — no Baileys imports here. Caller adapts Baileys'
 * `messages.upsert` shape into our `IncomingMessage` interface and calls in.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { normalizePhone } from './phone.js';
import type { WhatsAppMessageType } from './types.js';

export interface IncomingMessage {
  whatsappMessageId: string;
  /**
   * The OTHER party's phone in any format — will be normalized. For fromMe
   * messages this is the contact we're chatting with (NOT us); the WhatsApp
   * `remoteJid` is the contact regardless of `fromMe` in 1:1 chats.
   */
  from: string;
  /**
   * True when this message was sent by us from another linked device (phone,
   * WA Web on another browser). When true, the handler writes
   * `direction: 'out'` and skips unreadCount/whatsappName updates. Defaults
   * to false for back-compat with existing call sites.
   */
  fromMe?: boolean;
  pushName?: string;
  text?: string;
  type: WhatsAppMessageType;
  timestamp: Date;
  /**
   * Raw `key.remoteJid` from Baileys (e.g. `5511999999999@s.whatsapp.net`,
   * `5511999999999:42@s.whatsapp.net`, or `5511999999999@lid`). Used by the
   * fromMe protocol-message filter to detect device-to-device sync chatter
   * where WhatsApp uses the user's OWN JID as the remoteJid. Optional for
   * back-compat with existing call sites and tests; when absent, the
   * self-JID check is skipped.
   */
  remoteJid?: string;
  /**
   * True when the underlying Baileys `msg.message.protocolMessage` field is
   * set. Baileys uses this for read receipts, ephemeral key updates, group
   * invitations, and other non-user-visible protocol traffic — none of which
   * should land in the admin inbox as outgoing messages. Optional for
   * back-compat; when absent, the protocol-message check is treated as
   * "no protocol message present".
   */
  hasProtocolMessage?: boolean;
}

/**
 * Mock-friendly subset of the Baileys WASocket — only the bits the inbound
 * handler actually calls. Full type would drag in the entire Baileys SDK.
 *
 * `user.id` is the worker's own paired-phone JID (Baileys exposes it as
 * `sock.user.id`). It's used by the fromMe protocol-message filter to detect
 * device-to-device sync messages, where WhatsApp uses the user's own JID as
 * `remoteJid`. Optional because not all callers (notably tests) supply a
 * paired socket; when absent, the self-JID check passes through.
 */
export interface ProfilePictureCapableSocket {
  profilePictureUrl(jid: string, type?: 'image' | 'preview'): Promise<string | undefined>;
  user?: { id?: string | null } | null;
}

/**
 * Compares a remoteJid against the worker's own paired JID, tolerating the
 * variations Baileys emits:
 *
 *  - `<digits>@s.whatsapp.net`           — bare phone JID
 *  - `<digits>:<device>@s.whatsapp.net`  — phone with device suffix (multi-device)
 *  - `<digits>@lid`                       — linked-device-only "private" JID
 *
 * We strip the `:device` suffix and the `@host` part before comparing —
 * only the bare digit (or LID) prefix matters. That makes
 * `5511999999999@s.whatsapp.net` match `5511999999999:42@s.whatsapp.net`
 * AND `5511999999999@lid` (defensive: in practice Baileys emits one
 * canonical form for `sock.user.id`, but device-sync chatter can carry the
 * suffix variant for the same identity).
 *
 * Returns `false` (don't filter) when either input is missing or empty —
 * test mode and other paths without a paired socket get the pre-fix
 * behavior.
 */
export function isSelfJid(jid: string, ownJid?: string | null): boolean {
  if (!jid || !ownJid) return false;
  const left = extractJidPrefix(jid);
  const right = extractJidPrefix(ownJid);
  if (!left || !right) return false;
  return left === right;
}

function extractJidPrefix(jid: string): string | undefined {
  const at = jid.indexOf('@');
  const head = at >= 0 ? jid.slice(0, at) : jid;
  // Strip multi-device suffix: `5511999999999:42` -> `5511999999999`.
  const beforeColon = head.split(':')[0];
  if (!beforeColon) return undefined;
  return beforeColon;
}

/**
 * For a fromMe message, returns true when the message has actual user-visible
 * content — non-empty text or a recognized media type. Returns false for
 * `type: 'system'` with empty text, which is what device-sync / protocol
 * messages collapse to in our adapter.
 */
function fromMeHasUserContent(msg: IncomingMessage): boolean {
  if (msg.text && msg.text.length > 0) return true;
  switch (msg.type) {
    case 'image':
    case 'audio':
    case 'video':
    case 'document':
    case 'sticker':
    case 'location':
    case 'contact':
      return true;
    default:
      return false;
  }
}

/**
 * WhatsApp signs profile-picture URLs with a ~24h TTL. We re-fetch every 20h
 * to give a comfortable refresh margin without spamming the WA servers.
 */
const PROFILE_PHOTO_REFRESH_MS = 20 * 60 * 60 * 1000;

/**
 * Burst protection — multiple inbound messages from the same JID arriving in
 * quick succession should not trigger multiple `profilePictureUrl` calls.
 */
const PROFILE_PHOTO_THROTTLE_MS = 60 * 1000;

/**
 * Module-local map of `jid -> last fetch attempt time (ms)`. Lives for the
 * worker process lifetime; survives Firestore retries but resets on restart,
 * which is fine — Firestore is the durable record.
 */
const lastProfilePhotoFetchByJid = new Map<string, number>();

/**
 * Test-only reset helper. Exported so unit tests can clear the in-memory
 * throttle between cases without using `vi.useFakeTimers`. Not part of the
 * public API; do not call from production code.
 */
export function __resetProfilePhotoThrottleForTests(): void {
  lastProfilePhotoFetchByJid.clear();
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

  // No existing record or never fetched — needs initial fetch.
  if (!existing) return true;
  const refreshedAtMs = toMillis(existing.profilePictureRefreshedAt);
  if (refreshedAtMs === 0) return true;
  return nowMs - refreshedAtMs > PROFILE_PHOTO_REFRESH_MS;
}

/**
 * Best-effort profile-picture fetch + cache. Never throws — Baileys returns
 * undefined or rejects with a 404 for private/hidden accounts, both of which
 * are normal and must not break message ingestion.
 *
 * Returns the patch to merge into the conversation doc. Always sets
 * `profilePictureRefreshedAt` (so we don't immediately retry on the next
 * message) and only sets `profilePictureUrl` when WhatsApp returned one.
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
    // No photo (private account, hidden, or no avatar set) — record the
    // attempt so we don't retry immediately.
    return { profilePictureRefreshedAt: now };
  } catch {
    // 404 / network errors — same handling. Stamp the timestamp to throttle
    // future attempts; leave URL untouched.
    return { profilePictureRefreshedAt: now };
  }
}

export async function handleIncomingMessage(
  db: Firestore,
  msg: IncomingMessage,
  instanceId: string,
  sock?: ProfilePictureCapableSocket,
): Promise<{ status: 'inserted' | 'duplicate' | 'invalid' | 'skipped'; conversationId?: string }> {
  const fromMe = msg.fromMe === true;

  // 0. fromMe protocol/device-sync filter.
  //
  //    WhatsApp's multi-device protocol uses `messages.upsert` for two
  //    completely different things:
  //      (a) actual user-typed messages we sent from another linked device
  //          (phone, WA Web on another browser) — these we DO want to
  //          mirror into the admin inbox.
  //      (b) device-to-device coordination chatter — read receipts, key
  //          rotations, ephemeral-mode flips, app-state syncs, etc. These
  //          arrive as `fromMe: true` with `key.remoteJid` set to OUR own
  //          JID (the user's own paired phone), and/or as
  //          `msg.message.protocolMessage` payloads with no user content.
  //          These are pure internal protocol traffic and must NEVER show up
  //          in the inbox.
  //
  //    Production has been writing 7+ garbage `type: 'system'`, `text: ''`
  //    rows whose `conversationId` is the user's own phone — exactly case
  //    (b). This filter drops them silently before any Firestore work.
  //
  //    Behavior: for fromMe messages, all three checks below must pass for
  //    the message to be ingested. Any failure means a silent skip — no log
  //    noise, no write. Inbound (fromMe:false) is unaffected; the existing
  //    type-detection in the adapter classifies inbound protocol noise as
  //    `system` and the UI already renders the placeholder for those.
  if (fromMe) {
    // Check 1 — self-JID: if remoteJid points at the worker's own paired
    // phone, this is device-sync chatter. Tolerate sock undefined (test
    // mode) by treating the check as a pass-through; only the live worker
    // process has access to `sock.user.id`.
    if (msg.remoteJid && sock?.user?.id && isSelfJid(msg.remoteJid, sock.user.id)) {
      return { status: 'skipped' };
    }

    // Check 2 — protocol message: Baileys' `protocolMessage` field is used
    // for read receipts, ephemeral key updates, group invitations, etc.
    // Never user-visible content.
    if (msg.hasProtocolMessage === true) {
      return { status: 'skipped' };
    }

    // Check 3 — has user content: text or recognized media. Catches
    // `type: 'system'` collapses where neither condition 1 nor 2 fired but
    // there's still nothing to display.
    if (!fromMeHasUserContent(msg)) {
      return { status: 'skipped' };
    }
  }

  // 1. Dedupe. Critical for the fromMe path: outbound.ts already writes a
  //    message doc with the same `whatsappMessageId` when the message went
  //    through our admin's send path. The fromMe replay we get here from
  //    `messages.upsert` (delivered to all linked devices) must be a no-op
  //    in that case.
  const dedupSnap = await db
    .collection('whatsapp_messages')
    .where('whatsappMessageId', '==', msg.whatsappMessageId)
    .limit(1)
    .get();
  if (!dedupSnap.empty) {
    return { status: 'duplicate' };
  }

  // 2. Normalize phone (the OTHER party — for fromMe in a 1:1 chat, that's
  //    the contact we're talking to, NOT us). Group/broadcast JIDs fail
  //    normalization here and bail out — same behavior as before this change.
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
  const direction: 'in' | 'out' = fromMe ? 'out' : 'in';
  // JID for Baileys profile-picture lookup. Conversation IDs are bare phones;
  // Baileys needs the full `<phone>@s.whatsapp.net` form.
  const jid = `${normalized}@s.whatsapp.net`;

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
      lastMessageAt: msg.timestamp,
      lastMessagePreview: preview,
      lastMessageDirection: direction,
      // unreadCount: only count incoming messages. The user pre-read anything
      // they sent themselves from another device.
      unreadCount: fromMe ? 0 : 1,
      createdAt: now,
      updatedAt: now,
      instanceId,
    };
    // Resolve whatsappName for new conversations:
    //   1. inbound pushName (the contact's self-reported display name)
    //   2. matched client name from `clients` collection (best fallback when
    //      WhatsApp didn't ship a pushName for this chat — common during
    //      history sync, where chunks routinely omit pushName)
    //   3. leave undefined and let `contacts.upsert` / future inbound traffic
    //      fill it in
    // Skipped entirely for fromMe — pushName on our own messages is OUR
    // display name, not the contact's, and the client name is still
    // appropriate but we choose to defer to the inbound path instead of
    // setting it during a fromMe write.
    if (!fromMe) {
      const inboundName = msg.pushName && msg.pushName.trim().length > 0
        ? msg.pushName
        : undefined;
      const fallbackName = inboundName ?? clienteNome;
      if (fallbackName !== undefined) convDoc.whatsappName = fallbackName;
    }
    if (clienteId !== undefined) convDoc.clienteId = clienteId;
    if (clienteNome !== undefined) convDoc.clienteNome = clienteNome;

    // Profile-picture fetch — first contact always needs a photo. The contact
    // is `remoteJid` regardless of fromMe, so this fires for both directions.
    if (sock && shouldRefreshProfilePhoto(undefined, jid, now.getTime())) {
      const photoPatch = await fetchProfilePhotoPatch(sock, jid, now);
      Object.assign(convDoc, photoPatch);
    }

    await convRef.set(convDoc);
  } else {
    const existing = convSnap.data() as {
      unreadCount?: number;
      clienteId?: string;
      whatsappName?: string;
      profilePictureUrl?: string;
      profilePictureRefreshedAt?: unknown;
    };
    const update: Record<string, unknown> = {
      lastMessageAt: msg.timestamp,
      lastMessagePreview: preview,
      lastMessageDirection: direction,
      updatedAt: now,
    };
    // unreadCount: only bump on inbound. A fromMe replay from another linked
    // device doesn't add unread badges — the user already saw what they sent.
    if (!fromMe) {
      update.unreadCount = (existing?.unreadCount ?? 0) + 1;
      // Same reasoning as the create path — only adopt pushName from the
      // contact's messages, not from our own fromMe replays.
      if (msg.pushName && msg.pushName.trim().length > 0) {
        update.whatsappName = msg.pushName;
      }
    }
    // If conversation was previously unlinked, attempt to link now. Runs for
    // both directions — a fromMe message in a yet-unlinked conversation
    // should still resolve the client.
    let matchedClientName: string | undefined;
    if (!existing?.clienteId) {
      try {
        const match = await findClientByPhone(db, normalized);
        if (match) {
          update.clienteId = match.id;
          if (match.name) {
            update.clienteNome = match.name;
            matchedClientName = match.name;
          }
        }
      } catch {
        // ignore
      }
    }
    // whatsappName fallback from clients collection — fill in only when the
    // existing value is missing/empty AND the inbound message didn't provide
    // one. Skipped on fromMe (we don't touch whatsappName from fromMe
    // replays at all).
    if (!fromMe) {
      const existingName = typeof existing?.whatsappName === 'string'
        ? existing.whatsappName.trim()
        : '';
      const willSetFromPush = typeof update.whatsappName === 'string'
        && (update.whatsappName as string).trim().length > 0;
      if (!existingName && !willSetFromPush && matchedClientName) {
        update.whatsappName = matchedClientName;
      }
    }

    // Profile-picture refresh on stale URL (or no URL yet). Same JID logic for
    // both directions.
    if (sock && shouldRefreshProfilePhoto(existing, jid, now.getTime())) {
      const photoPatch = await fetchProfilePhotoPatch(sock, jid, now);
      Object.assign(update, photoPatch);
    }

    await convRef.update(update);
  }

  // 4. Append message doc.
  const messageDoc: Record<string, unknown> = {
    conversationId,
    whatsappMessageId: msg.whatsappMessageId,
    direction,
    type: msg.type,
    text: msg.text,
    timestamp: msg.timestamp,
    createdAt: now,
  };
  if (fromMe) {
    // The message is already on WhatsApp's network (we received it via
    // `messages.upsert` from a linked device replay), so it's confirmed sent.
    // `authorUserId` is left undefined — we don't know which device sent it.
    messageDoc.status = 'sent';
  }
  await db.collection('whatsapp_messages').add(messageDoc);

  return { status: 'inserted', conversationId };
}
