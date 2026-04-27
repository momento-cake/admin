/**
 * CRM ↔ WhatsApp cross-reference job processor (Strategy B).
 *
 * Flow:
 *   1. Admin API writes a `whatsapp_sync_jobs/{jobId}` doc with:
 *        { status: 'pending', phones: string[], clientsByPhone: { [phone]: { id, name } } }
 *   2. Worker picks the job up via `subscribeToSyncJobs` (live listener).
 *   3. For each batch of phones, the worker calls `sock.onWhatsApp(...jids)`
 *      to filter to numbers that actually have WhatsApp.
 *   4. For each match where no `whatsapp_conversations/{phone}` exists yet,
 *      it creates a placeholder doc:
 *        { placeholder: true, lastMessageAt: null, unreadCount: 0,
 *          clienteId, clienteNome, ... }
 *   5. Updates the job to `status: 'complete'` with aggregate counts.
 *
 * Idempotent: existing conversations are never overwritten. If a real
 * conversation arrives via `messages.upsert` in between, it stays a real
 * conversation (placeholder skip path).
 */

import type { Firestore } from 'firebase-admin/firestore';

const SYNC_JOBS_COLLECTION = 'whatsapp_sync_jobs';
const CONVERSATIONS_COLLECTION = 'whatsapp_conversations';

/** Batch size for `sock.onWhatsApp` calls. WhatsApp's USync queries handle
 * up to ~64 jids per query comfortably. We use 50 as a safe round number. */
const ONWHATSAPP_BATCH_SIZE = 50;

export interface SyncJobSocket {
  onWhatsApp(...jids: string[]): Promise<Array<{ jid: string; exists: unknown }> | undefined>;
}

export interface SyncJobResult {
  matched: number;
  created: number;
  skipped: number;
}

interface SyncJobData {
  status?: 'pending' | 'running' | 'complete' | 'failed';
  phones?: string[];
  /** Map from normalized phone → minimal client info to denormalize onto the conversation. */
  clientsByPhone?: Record<string, { id?: string; name?: string }>;
}

function jidFromPhone(phone: string): string {
  return `${phone}@s.whatsapp.net`;
}

function jidToPhone(jid: string): string | null {
  const at = jid.indexOf('@');
  if (at < 0) return null;
  const head = jid.slice(0, at);
  return head.split(':')[0] || null;
}

async function checkExistsBatch(
  sock: SyncJobSocket,
  phones: string[],
): Promise<Set<string>> {
  const exists = new Set<string>();
  for (let i = 0; i < phones.length; i += ONWHATSAPP_BATCH_SIZE) {
    const batch = phones.slice(i, i + ONWHATSAPP_BATCH_SIZE);
    const jids = batch.map(jidFromPhone);
    const result = await sock.onWhatsApp(...jids);
    if (!result) continue;
    for (const r of result) {
      if (r.exists) {
        const phone = jidToPhone(r.jid);
        if (phone) exists.add(phone);
      }
    }
  }
  return exists;
}

/**
 * Process a single sync job. Returns the aggregate counts on success, or
 * `null` if the job was missing / not pending / failed (the doc itself
 * carries the failure reason).
 */
export async function processSyncJob(
  db: Firestore,
  sock: SyncJobSocket,
  jobId: string,
  instanceId: string,
): Promise<SyncJobResult | null> {
  const jobRef = db.collection(SYNC_JOBS_COLLECTION).doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) return null;

  const job = jobSnap.data() as SyncJobData | undefined;
  if (!job || job.status !== 'pending') return null;

  // Mark running so concurrent listeners do not double-process.
  await jobRef.update({ status: 'running', startedAt: new Date() });

  const phones = (job.phones ?? []).filter((p) => typeof p === 'string' && p.length > 0);
  const clientsByPhone = job.clientsByPhone ?? {};

  let matched = 0;
  let created = 0;
  let skipped = 0;

  try {
    const existingSet = await checkExistsBatch(sock, phones);
    matched = existingSet.size;

    for (const phone of existingSet) {
      const convRef = db.collection(CONVERSATIONS_COLLECTION).doc(phone);
      const convSnap = await convRef.get();
      if (convSnap.exists) {
        skipped += 1;
        continue;
      }

      const now = new Date();
      const client = clientsByPhone[phone] ?? {};
      const doc: Record<string, unknown> = {
        phone,
        phoneRaw: phone,
        placeholder: true,
        unreadCount: 0,
        lastMessageAt: null,
        lastMessagePreview: '',
        lastMessageDirection: 'in',
        createdAt: now,
        updatedAt: now,
        instanceId,
      };
      if (client.id) doc.clienteId = client.id;
      if (client.name) doc.clienteNome = client.name;
      await convRef.set(doc);
      created += 1;
    }

    await jobRef.update({
      status: 'complete',
      matched,
      created,
      skipped,
      completedAt: new Date(),
    });

    return { matched, created, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await jobRef.update({
      status: 'failed',
      error: message,
      failedAt: new Date(),
    });
    return null;
  }
}

/**
 * Subscribe to pending sync jobs and process them sequentially. Returns an
 * unsubscribe function. NOT covered by unit tests — the realtime listener is a
 * thin Firestore wrapper; the per-job logic is tested via `processSyncJob`.
 */
export function subscribeToSyncJobs(
  db: Firestore,
  sock: SyncJobSocket,
  instanceId: string,
  onError?: (err: Error) => void,
): () => void {
  let processing = Promise.resolve();

  const unsubscribe = db
    .collection(SYNC_JOBS_COLLECTION)
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const jobId = change.doc.id;
            processing = processing.then(async () => {
              try {
                await processSyncJob(db, sock, jobId, instanceId);
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
