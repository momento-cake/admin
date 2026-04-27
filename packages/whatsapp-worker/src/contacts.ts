/**
 * Handler for Baileys' `contacts.upsert` and `contacts.update` events.
 *
 * Baileys learns contact metadata (display names, push names) from a few
 * different protocol channels — chat history, presence updates, app-state
 * sync, etc. — and surfaces them via these two events. The payload is a
 * `Contact[]` (or `Partial<Contact>[]` for update) where each entry carries:
 *
 *   - `id`     : a JID like `5511999999999@s.whatsapp.net` or `<id>@lid`
 *   - `name`   : the name the user has saved in their own contact list
 *   - `notify` : the contact's self-reported push name (what they show others)
 *   - `verifiedName` : a WhatsApp-business verified name
 *
 * For each contact, we normalize the JID's phone-number portion and update
 * the matching `whatsapp_conversations/<phone>` doc, but ONLY when the
 * existing `whatsappName` is missing or empty. This is critical: live
 * `messages.upsert` and `inbound.ts` are the authoritative source for fresh
 * names and we must never stomp on a value they already wrote.
 *
 * The handler is best-effort by design — every step (JID parsing, doc lookup,
 * write) is wrapped so a single bad contact entry can't break the whole
 * batch. Pure logic — no Baileys imports here. Caller adapts Baileys'
 * `Contact[]` shape into our `ContactInput` interface and calls in.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { normalizePhone } from './phone.js';

/**
 * Mock-friendly subset of Baileys' `Contact` type. We only need a handful of
 * fields and we keep this loose so tests can construct plain objects without
 * dragging in the SDK.
 */
export interface ContactInput {
  id?: string | null;
  name?: string | null;
  notify?: string | null;
  verifiedName?: string | null;
}

export interface ContactsHandlerResult {
  scanned: number;
  updated: number;
  skipped: number;
}

function jidToPhone(jid: string | null | undefined): string | undefined {
  if (!jid) return undefined;
  const at = jid.indexOf('@');
  const head = at >= 0 ? jid.slice(0, at) : jid;
  return head.split(':')[0] || undefined;
}

function isOneToOneJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid');
}

/**
 * Pull the best display-name candidate from a Baileys Contact. Order:
 *   1. user-saved `name` (most authoritative when present)
 *   2. self-reported `notify` (push name)
 *   3. `verifiedName` (business-verified fallback)
 *
 * Returns the trimmed string or undefined if none has content.
 */
export function pickContactName(contact: ContactInput): string | undefined {
  const candidates = [contact.name, contact.notify, contact.verifiedName];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const trimmed = c.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/**
 * For every contact in the batch, update the matching conversation's
 * `whatsappName` if it is currently missing/empty.
 *
 * Skips:
 *   - Group/broadcast/status JIDs (only 1:1 chats are tracked)
 *   - Unparseable phone numbers
 *   - Contacts where no name field has content
 *   - Conversations that don't exist in Firestore yet (no upsert here — we
 *     only fill gaps in conversations that the message-handling path has
 *     already created; otherwise we'd flood Firestore with empty rows for
 *     every contact in the user's address book).
 *   - Conversations whose `whatsappName` is already set to a non-empty value.
 */
export async function handleContactsUpsert(
  db: Firestore,
  contacts: ContactInput[],
): Promise<ContactsHandlerResult> {
  const result: ContactsHandlerResult = { scanned: 0, updated: 0, skipped: 0 };

  for (const contact of contacts ?? []) {
    result.scanned += 1;
    try {
      const jid = contact?.id ?? undefined;
      if (!isOneToOneJid(jid)) {
        result.skipped += 1;
        continue;
      }

      const phone = normalizePhone(jidToPhone(jid));
      if (!phone) {
        result.skipped += 1;
        continue;
      }

      const name = pickContactName(contact);
      if (!name) {
        result.skipped += 1;
        continue;
      }

      const ref = db.collection('whatsapp_conversations').doc(phone);
      const snap = await ref.get();
      if (!snap.exists) {
        // Don't create new conversation rows from contacts alone — we'd
        // pollute the inbox with every entry in the user's address book.
        // Wait until a message lands.
        result.skipped += 1;
        continue;
      }

      const existing = snap.data() as Record<string, unknown> | undefined;
      const existingName = typeof existing?.whatsappName === 'string'
        ? (existing.whatsappName as string).trim()
        : '';
      if (existingName.length > 0) {
        // Already named — never stomp on a fresher value from inbound.ts /
        // history.ts.
        result.skipped += 1;
        continue;
      }

      await ref.update({ whatsappName: name, updatedAt: new Date() });
      result.updated += 1;
    } catch {
      // Best-effort — never let one bad contact break the batch.
      result.skipped += 1;
    }
  }

  return result;
}
