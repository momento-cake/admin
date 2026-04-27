# Chat Discovery Strategies

## Why this exists

Multi-device pairing in Baileys (WhatsApp Web protocol) does **not** behave like
"open WhatsApp Web in a browser and instantly see all your chats." When a fresh
session is created:

- WhatsApp pushes a **history snapshot** to the linked device exactly once,
  shortly after pairing. After that, only **new** events flow through.
- If the worker subscribes only to `messages.upsert`, the inbox stays empty
  until someone messages the bakery's number after pairing — exactly the symptom
  this initiative is fixing.

This document captures the Baileys-side primitives we have, weighs strategies
against them, and records which ones we shipped vs. deferred.

---

## Baileys primitives we investigated

All references are to `@whiskeysockets/baileys` v6.7.x as installed in
`packages/whatsapp-worker/package.json`. File paths below point at the
installed `node_modules/@whiskeysockets/baileys/...` for traceability.

### 1. `messaging-history.set` event

**Source**: `lib/Types/Events.d.ts:18-26`

```ts
'messaging-history.set': {
  chats: Chat[];
  contacts: Contact[];
  messages: WAMessage[];
  isLatest?: boolean;
  progress?: number | null;
  syncType?: proto.HistorySync.HistorySyncType;
  peerDataRequestSessionId?: string | null;
};
```

`Chat` is a `proto.IConversation` with shape (see
`WAProto/index.d.ts:12312-12399`):

- `id: string` — JID, e.g. `5511999999999@s.whatsapp.net`
- `name?: string`
- `unreadCount?: number`
- `conversationTimestamp?: number | Long` — last activity (Unix seconds)
- ...plus a lot of presentation fields (pin, archive, mute) we do not use.

`WAMessage` is the same shape that `messages.upsert` already gives us, so the
existing `inbound.ts` upsert code path can ingest it.

**When does it fire?**
- After `connection: 'open'` on a fresh pair, Baileys emits **multiple**
  `messaging-history.set` events as the phone streams the snapshot in chunks.
  Final chunk has `isLatest: true`.
- It also fires on subsequent reconnects, but the snapshot is small and
  primarily contains delta from app state sync — not a full re-history. The
  phone does not re-stream history that was already delivered to this device.
- `syncType` distinguishes `INITIAL_BOOTSTRAP` (5), `FULL` (2), `RECENT` (3),
  `ON_DEMAND` (6), etc. (`WAProto/index.d.ts:15963-15971`).

**Honest answer to "can already-paired sessions resync history?"**: No, not
without unlinking and re-linking the device. The phone only ships a fresh
history snapshot the first time a device joins the multi-device mesh. Baileys
exposes `fetchMessageHistory` for per-chat backfill, but you need an existing
chat (and a `lastMessage` key) to seed it.

### 2. `syncFullHistory` socket option

**Source**: `lib/Types/Socket.d.ts:86-87`

```ts
/** Should Baileys ask the phone for full history, will be received async */
syncFullHistory: boolean;
```

Default is `false` — Baileys requests **recent** history only (a few months).
Setting it to `true` makes the phone ship every chat it has stored.

Trade-offs:
- **Bandwidth/time**: a "full" sync on a busy bakery account could mean
  thousands of messages and minutes of streaming. The events still arrive in
  chunks, so the worker stays responsive.
- **Storage**: every message hits Firestore. At ~$0.18/100k writes (Firestore
  pricing) this is negligible for our scale, but worth noting.
- **Already-paired sessions ignore the flag**: the snapshot was finalized on
  first pair. Switching the flag now requires unlink + re-link to take effect.

### 3. `sock.fetchMessageHistory(count, oldestKey, oldestTimestamp)`

**Source**: `lib/Socket/messages-recv.d.ts:10`

```ts
fetchMessageHistory: (
  count: number,
  oldestMsgKey: WAMessageKey,
  oldestMsgTimestamp: number | Long,
) => Promise<string>;
```

Pulls older messages on demand for a specific chat by walking backwards from
the oldest message currently stored. Returns a request ID — the messages
arrive asynchronously via `messages.upsert` with `requestId` set.

Useful for "show more" pagination per conversation. **Out of scope for this
PR** — we have no oldest-message anchor for chats we have not seen yet.

### 4. `sock.onWhatsApp(...jids)`

**Source**: `lib/Socket/messages-send.d.ts:88-92`

```ts
onWhatsApp: (...jids: string[]) => Promise<{
  jid: string;
  exists: unknown;
  lid: unknown;
}[] | undefined>;
```

Bulk-checks which phone numbers have a WhatsApp account. Send normalized JIDs
(`5511999999999@s.whatsapp.net`) and get back which ones `exist`. Cheap call,
no rate-limit issues for a few hundred numbers.

This unlocks **proactive** chat discovery: pre-create empty conversations for
every CRM client that has WhatsApp, before any message exchange.

### 5. `sock.chats` / a built-in store?

There is no in-memory store on the socket itself in v6.7.x. Baileys exposes
events; consumers maintain their own datastructures. The legacy
`makeInMemoryStore` helper still exists but is deprecated and explicitly
recommended against in the README. Our existing `inbound.ts` already does the
right thing — write each event to Firestore and let Firestore be the store.

---

## Strategies considered

### Strategy A — `messaging-history.set` handler + `syncFullHistory: true` (SHIPPED)

**Idea**: subscribe to `messaging-history.set`, iterate `chats[]` and
`messages[]`, upsert via Firestore using the same dedup logic as
`messages.upsert`.

Pros:
- Zero extra UI: chats appear naturally in the existing inbox.
- Reuses `handleIncomingMessage`'s message-level dedup, so re-running the
  handler is idempotent.
- `chats[]` lets us create conversation rows even for chats with **no**
  messages in the snapshot (e.g. read-only or muted).

Cons:
- Only fires on first pair. The bakery's existing pairing will not benefit
  unless they unlink + re-link.
- "Full" history means more bandwidth + more Firestore writes. We accept this
  in exchange for instant inbox population.

Decision: **ship**. This is the canonical Baileys solution.

### Strategy B — Cross-reference `clients` collection via `onWhatsApp` (SHIPPED)

**Idea**: an admin-triggered job that:
1. Reads all active CRM clients with phones.
2. Calls `sock.onWhatsApp([...])` to filter to those that actually have
   WhatsApp.
3. Pre-creates `placeholder: true` conversation docs in Firestore.

Atendentes see every CRM client in the inbox immediately, even when no
exchange has happened yet. Clicking a placeholder lets them initiate the
first message; the next outbound or inbound flips it to "real."

Pros:
- Works on **already-paired** sessions — no re-pairing required.
- Solves the "I want to message a client we already know" workflow without
  requiring atendentes to leave the inbox.
- Composable with Strategy A: history-sync upserts trump placeholders.

Cons:
- Placeholders need explicit UI affordance ("no messages yet") so atendentes
  do not confuse them with real chats.
- We need a cheap way to ignore placeholders in `lastMessageAt desc` ordering.
  Solved by leaving `lastMessageAt: null` and sorting them to the bottom on
  the client.

Decision: **ship**. This unblocks the bakery without a re-pair ceremony.

### Strategy C — Outgoing-initiated chats from `/clients/[id]` (DEFERRED)

**Idea**: a "Iniciar conversa" button on the client detail page that
immediately writes a placeholder + opens the inbox at it.

This is a strict subset of Strategy B's UX once placeholders exist — the
button just becomes a deep-link into a conversation that B already created.
Worth doing later as a polish step. **Out of scope here.**

---

## Composition

A and B do not conflict:

- A's history sync writes real conversations (with `lastMessageAt`).
- B writes placeholders (with `lastMessageAt: null` and `placeholder: true`).
- If a client both messaged us and is in our CRM, A's history-sync ingest
  hits Firestore with a real `lastMessageAt` first; B's `onWhatsApp` job runs
  later and skips conversations that already exist (idempotent upsert with
  `merge: true` semantics that never overwrites a non-null `lastMessageAt`).
- `inbound.ts`'s normal message ingest flips `placeholder: false` automatically
  when a real message arrives.

---

## Operational notes

- **Re-pairing required for history sync**: yes, for the bakery's existing
  pairing to start populating chats. We surface this in the settings page and
  in the changelog.
- **Worker rebuild**: required (`npm run build` in
  `packages/whatsapp-worker/`).
- **Schema migration**: none. New optional fields on
  `whatsapp_conversations` (`placeholder?`, nullable `lastMessageAt`).
- **New collection**: `whatsapp_sync_jobs` for the cross-reference job. Worker
  subscribes via `onSnapshot`, no new index needed (single-collection,
  status-equality query).

## Future work

- Per-chat pagination via `sock.fetchMessageHistory` (Strategy "D").
- Outgoing-initiated chats UI on `/clients/[id]` (Strategy C).
- A scheduled `whatsapp_sync_jobs` cron to keep CRM-side new clients
  reflected in the inbox without an admin click.
