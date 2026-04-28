/**
 * WhatsApp Baileys worker entry point.
 *
 * Wires together: Firestore -> Lease lock -> Baileys socket
 *  -> connection.update / creds.update / messages.upsert handlers
 *  -> heartbeat -> outbox subscription -> graceful shutdown.
 *
 * Reads from env:
 *  - FIREBASE_PROJECT_ID   (required for clarity; optional if creds JSON has it)
 *  - GOOGLE_APPLICATION_CREDENTIALS  path to service-account.json
 *  - WHATSAPP_INSTANCE_ID  default 'primary'
 */

import { randomUUID } from 'node:crypto';
import NodeCache from 'node-cache';
import pino from 'pino';
import { toDataURL as qrToDataURL } from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import type { ConnectionState, WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

import { initFirestore } from './firestore.js';
import { acquireLease, LeaseHeldError } from './lease.js';
import { loadAuthState } from './auth-state.js';
import { handleIncomingMessage } from './inbound.js';
import { subscribeToOutbox } from './outbound.js';
import { clearQR, emitQR, heartbeat, updateStatus } from './status.js';
import { handleHistorySync } from './history.js';
import type { HistorySyncEvent } from './history.js';
import { subscribeToSyncJobs } from './sync-jobs.js';
import { handleContactsUpsert } from './contacts.js';
import type { ContactInput } from './contacts.js';
import type { WhatsAppMessageType } from './types.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const HEARTBEAT_INTERVAL_MS = 30_000;
// Renew the lease at 20s — well below the 60s TTL so a single missed renewal still
// leaves another full attempt before another worker could steal the lock.
const LEASE_RENEW_INTERVAL_MS = 20_000;

/**
 * In-memory cache of MessageCounterError retry attempts per message id.
 * Lives at module scope so it survives socket reconnects within the same
 * worker process — Baileys uses it to enforce `maxMsgRetryCount` across
 * reconnects so we don't double-retry the same message every time the
 * socket flaps. Resets on worker restart, which is fine: the receiving
 * peer eventually expires the retry window too.
 */
const msgRetryCounterCache = new NodeCache({ stdTTL: 10 * 60 });

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

function inferType(msg: WAMessage): WhatsAppMessageType {
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

function inferText(msg: WAMessage): string | undefined {
  const m = msg.message;
  if (!m) return undefined;
  return m.conversation || m.extendedTextMessage?.text || undefined;
}

function jidToPhone(jid: string | null | undefined): string | undefined {
  if (!jid) return undefined;
  // jid examples: "5511999999999@s.whatsapp.net", "5511999999999:32@s.whatsapp.net"
  const at = jid.indexOf('@');
  const head = at >= 0 ? jid.slice(0, at) : jid;
  return head.split(':')[0] || undefined;
}

/**
 * Build the options object passed to `makeWASocket`. Extracted so the
 * production config can be unit-tested without spinning up an actual socket.
 *
 * The block addresses the `MessageCounterError: Key used already or never
 * filled` retry loop seen on fromMe messages from other linked devices. It
 * works by:
 *
 *   - capping retries (`maxMsgRetryCount: 5`) so a wedged ratchet can't
 *     spiral forever
 *   - giving Baileys a persistent retry counter (`msgRetryCounterCache`)
 *     that survives socket reconnects within the same process — without
 *     this, every reconnect would re-issue retry receipts from zero
 *   - `transactionOpts` to prevent concurrent SignalKeyStore writes from
 *     corrupting state during rapid reconnects
 *   - `getMessage` callback so Baileys can re-encrypt the original
 *     plaintext on retry (without it the receiving peer can never decrypt
 *     and the loop never converges)
 *
 * The remaining flags (`connectTimeoutMs`, `defaultQueryTimeoutMs`,
 * `keepAliveIntervalMs`, `markOnlineOnConnect: false`) are stability/timeout
 * settings recommended by the Baileys community for production deployments.
 *
 * Note: parameters are loosely typed (`unknown` / inferred) to keep the
 * helper testable without dragging the entire Baileys SDK type surface
 * through the caller. The shape is structurally compatible with what
 * `makeWASocket` accepts at runtime.
 */
export function buildSocketOptions(
  db: import('firebase-admin/firestore').Firestore,
  authState: unknown,
  baileysLogger: unknown,
  version: [number, number, number],
): Record<string, unknown> {
  return {
    version,
    logger: baileysLogger,
    printQRInTerminal: false,
    auth: authState,
    browser: ['Momento Cake', 'Chrome', '1.0'],
    syncFullHistory: true,
    // Retry-loop break: cap fromMe MessageCounterError retries.
    msgRetryCounterCache,
    maxMsgRetryCount: 5,
    // Connection stability (production defaults).
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    markOnlineOnConnect: false,
    // Signal-store transaction safety: prevent concurrent key writes from
    // corrupting state during rapid reconnects.
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 100 },
    // getMessage callback — Baileys uses this to retrieve the original
    // plaintext for re-encryption on retry. Without it, the receiving
    // peer can't decrypt our retried message and the loop never converges.
    // We look up by `whatsappMessageId` in our `whatsapp_messages`
    // collection and return the cached text when available.
    getMessage: async (key: { id?: string | null }): Promise<{ conversation: string } | undefined> => {
      try {
        const wid = key?.id;
        if (!wid) return undefined;
        const snap = await db
          .collection('whatsapp_messages')
          .where('whatsappMessageId', '==', wid)
          .limit(1)
          .get();
        if (snap.empty) return undefined;
        const data = snap.docs[0].data() as { text?: string };
        if (typeof data.text === 'string' && data.text.length > 0) {
          return { conversation: data.text };
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
  };
}

async function main(): Promise<void> {
  const instanceId = envOrDefault('WHATSAPP_INSTANCE_ID', 'primary');
  const workerId = randomUUID();

  logger.info({ instanceId, workerId }, 'starting whatsapp worker');

  const db = initFirestore();

  // 1. Acquire lease — exits if another worker holds it.
  let lease;
  try {
    lease = await acquireLease(db, instanceId, workerId);
  } catch (err) {
    if (err instanceof LeaseHeldError) {
      logger.warn({ err: err.message }, 'lease held by another worker; exiting cleanly');
      return;
    }
    throw err;
  }

  // 2. Set up auth state and Baileys socket. Auth lives on disk under
  //    BAILEYS_AUTH_DIR (mounted by systemd) — see `loadAuthState`.
  const authBundle = await loadAuthState();
  const { state, saveCreds } = authBundle;
  logger.info({ authDir: authBundle.authDir }, 'auth state loaded');
  const { version } = await fetchLatestBaileysVersion();

  // Construct the socket options separately so the production config block
  // (retry caps, transaction opts, getMessage, etc.) is independently
  // unit-testable. See `buildSocketOptions` above for the full rationale.
  const buildSocket = () =>
    makeWASocket(
      buildSocketOptions(db, state, logger, version) as Parameters<typeof makeWASocket>[0],
    );

  let sock = buildSocket();

  let unsubOutbox: (() => void) | null = null;
  let unsubSyncJobs: (() => void) | null = null;
  let shuttingDown = false;

  const heartbeatTimer: NodeJS.Timeout = setInterval(() => {
    heartbeat(db, instanceId).catch((e) => logger.error({ err: e }, 'heartbeat failed'));
  }, HEARTBEAT_INTERVAL_MS);

  const leaseTimer: NodeJS.Timeout = setInterval(() => {
    lease!.renew().catch((e) => logger.error({ err: e }, 'lease renew failed'));
  }, LEASE_RENEW_INTERVAL_MS);

  const wireSocketHandlers = () => {
    sock.ev.on('creds.update', () => {
      saveCreds().catch((e) => logger.error({ err: e }, 'saveCreds failed'));
    });

    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await qrToDataURL(qr);
          await emitQR(db, instanceId, dataUrl, 60_000);
          logger.info('emitted QR for pairing');
        } catch (e) {
          logger.error({ err: e }, 'failed to emit QR');
        }
      }

      if (connection === 'connecting') {
        await updateStatus(db, instanceId, { state: 'connecting', lastError: null });
      }

      if (connection === 'open') {
        await clearQR(db, instanceId);
        const pairedPhone = jidToPhone(sock.user?.id);
        await updateStatus(db, instanceId, {
          state: 'connected',
          pairedPhone,
          lastError: null,
        });
        logger.info({ pairedPhone }, 'connection open');
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? (lastDisconnect.error as Boom).output?.statusCode
            : undefined;
        const message = lastDisconnect?.error?.message ?? 'connection closed';

        if (statusCode === DisconnectReason.loggedOut) {
          await updateStatus(db, instanceId, {
            state: 'disconnected',
            lastError: 'logged out',
          });
          // Wipe the on-disk auth folder so the next worker start emits a
          // fresh QR. Without this the next start would reload the now-stale
          // creds and Baileys would loop on auth failures.
          try {
            await authBundle.reset();
            logger.warn(
              { authDir: authBundle.authDir },
              'logged out — auth folder cleared, next start will request QR',
            );
          } catch (e) {
            logger.error({ err: e }, 'failed to clear auth folder after logout');
          }
          return; // do not auto-reconnect
        }

        await updateStatus(db, instanceId, {
          state: 'disconnected',
          lastError: message,
        });
        logger.warn({ statusCode, message }, 'connection closed; reconnecting');

        if (!shuttingDown) {
          // Spin up a fresh socket. State and event subscribers stay scoped to that socket.
          sock = buildSocket();
          wireSocketHandlers();
          if (unsubOutbox) unsubOutbox();
          unsubOutbox = subscribeToOutbox(db, sock, (e) =>
            logger.error({ err: e }, 'outbox processing error'),
          );
          if (unsubSyncJobs) unsubSyncJobs();
          unsubSyncJobs = subscribeToSyncJobs(db, sock, instanceId, (e) =>
            logger.error({ err: e }, 'sync job processing error'),
          );
        }
      }
    });

    sock.ev.on('messaging-history.set', async (event) => {
      try {
        const result = await handleHistorySync(
          db,
          event as unknown as HistorySyncEvent,
          instanceId,
          sock,
        );
        logger.info(
          {
            chatsUpserted: result.chatsUpserted,
            messagesIngested: result.messagesIngested,
            skipped: result.skipped,
            isLatest: event.isLatest,
            syncType: event.syncType,
          },
          'history sync chunk processed',
        );
      } catch (e) {
        logger.error({ err: e }, 'history sync handler failed');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        // Note: fromMe messages (sent from another linked device — phone, WA
        // Web on another browser) are NOT filtered here. They flow into the
        // inbound handler which writes them as outgoing messages so the admin
        // inbox stays in sync with what the user sends from anywhere. The
        // outbound path's own writes are deduped via whatsappMessageId.
        const from = jidToPhone(msg.key.remoteJid);
        if (!from) continue;
        const wid = msg.key.id;
        if (!wid) continue;

        try {
          await handleIncomingMessage(
            db,
            {
              whatsappMessageId: wid,
              from,
              fromMe: msg.key.fromMe ?? false,
              pushName: msg.pushName ?? undefined,
              text: inferText(msg),
              type: inferType(msg),
              timestamp: new Date(Number(msg.messageTimestamp ?? Date.now() / 1000) * 1000),
            },
            instanceId,
            // Pass the live socket so the inbound handler can opportunistically
            // refresh contact profile pictures (~20h cache, 24h URL expiry).
            sock,
          );
        } catch (e) {
          logger.error({ err: e, wid }, 'failed to handle incoming message');
        }
      }
    });

    // Baileys learns contact metadata (display names, push names, verified
    // names) from various protocol channels — chat history, presence updates,
    // app-state sync — and surfaces them via these two events. We use them to
    // backfill `whatsappName` on existing conversation docs whose value is
    // currently missing/empty (the common case when history-sync chunks
    // didn't carry pushName for the chat). The handler never overwrites a
    // non-empty existing name and never creates new conversation docs from
    // contacts alone. Errors are swallowed — name backfill is non-critical
    // and must not break message ingestion.
    sock.ev.on('contacts.upsert', async (contacts) => {
      try {
        const result = await handleContactsUpsert(db, contacts as ContactInput[]);
        if (result.updated > 0) {
          logger.info(
            { scanned: result.scanned, updated: result.updated },
            'contacts.upsert backfilled whatsappName',
          );
        }
      } catch (e) {
        logger.error({ err: e }, 'contacts.upsert handler failed');
      }
    });

    sock.ev.on('contacts.update', async (contacts) => {
      try {
        const result = await handleContactsUpsert(db, contacts as ContactInput[]);
        if (result.updated > 0) {
          logger.info(
            { scanned: result.scanned, updated: result.updated },
            'contacts.update backfilled whatsappName',
          );
        }
      } catch (e) {
        logger.error({ err: e }, 'contacts.update handler failed');
      }
    });
  };

  wireSocketHandlers();
  unsubOutbox = subscribeToOutbox(db, sock, (e) =>
    logger.error({ err: e }, 'outbox processing error'),
  );
  unsubSyncJobs = subscribeToSyncJobs(db, sock, instanceId, (e) =>
    logger.error({ err: e }, 'sync job processing error'),
  );

  // Graceful shutdown.
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    clearInterval(heartbeatTimer);
    clearInterval(leaseTimer);
    if (unsubOutbox) unsubOutbox();
    if (unsubSyncJobs) unsubSyncJobs();
    try {
      await updateStatus(db, instanceId, { state: 'disconnected' });
    } catch {
      // ignore
    }
    try {
      sock.end(undefined);
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// Only auto-run when this file is loaded as the entry point (i.e. via
// `node dist/index.js` or `tsx watch src/index.ts`). When the module is
// imported from a test (`buildSocketOptions` is exported above), skip
// `main()` so we don't kick off a Firestore connection / lease acquisition
// inside the test runner. Detecting the entry point via Vitest's worker
// flag is more reliable across Node versions than `import.meta` tricks.
if (!process.env.VITEST) {
  main().catch((err) => {
    logger.fatal({ err }, 'worker crashed');
    process.exit(1);
  });
}
