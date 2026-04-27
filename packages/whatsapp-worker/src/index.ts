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
import { createFirestoreAuthState } from './auth-state.js';
import { handleIncomingMessage } from './inbound.js';
import { subscribeToOutbox } from './outbound.js';
import { clearQR, emitQR, heartbeat, updateStatus } from './status.js';
import { handleHistorySync } from './history.js';
import type { HistorySyncEvent } from './history.js';
import { subscribeToSyncJobs } from './sync-jobs.js';
import type { WhatsAppMessageType } from './types.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const HEARTBEAT_INTERVAL_MS = 30_000;
// Renew the lease at 20s — well below the 60s TTL so a single missed renewal still
// leaves another full attempt before another worker could steal the lock.
const LEASE_RENEW_INTERVAL_MS = 20_000;

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

  // 2. Set up auth state and Baileys socket.
  const { state, saveCreds } = await createFirestoreAuthState(db, instanceId);
  const { version } = await fetchLatestBaileysVersion();

  // syncFullHistory: true asks the phone to ship the full chat history on
  // first pair. This is the canonical Baileys way to populate the inbox with
  // existing conversations after pairing — without it, only chats that
  // receive a new message after pairing would ever appear. The trade-off is
  // a slower / heavier first-pair sync (chunked over `messaging-history.set`
  // events). Already-paired sessions are unaffected by this flag — the
  // history snapshot is finalized on first pair and re-pairing is required
  // to refresh it.
  const buildSocket = () =>
    makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['Momento Cake', 'Chrome', '1.0'],
      syncFullHistory: true,
    });

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
          logger.warn('logged out — manual re-pair required');
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

main().catch((err) => {
  logger.fatal({ err }, 'worker crashed');
  process.exit(1);
});
