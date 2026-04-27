/**
 * Helpers to write to `whatsapp_status/{instanceId}`:
 * - heartbeat: stamp `lastHeartbeatAt`.
 * - emitQR: write a freshly-generated QR code (data URL) with a short TTL.
 * - updateStatus: arbitrary partial merge.
 *
 * The admin UI reads this doc via onSnapshot to render connection state.
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { WhatsAppConnectionState } from './types.js';

const STATUS_COLLECTION = 'whatsapp_status';

export interface StatusUpdate {
  state?: WhatsAppConnectionState;
  qr?: string | null;
  qrExpiresAt?: Date | null;
  lastError?: string | null;
  pairedPhone?: string;
}

export async function updateStatus(
  db: Firestore,
  instanceId: string,
  partial: StatusUpdate,
): Promise<void> {
  const ref = db.collection(STATUS_COLLECTION).doc(instanceId);
  const now = new Date();

  // Translate `null` sentinels to Firestore deletion via undefined-skipping.
  // We use { merge: true } and set explicit nulls to clear prior values.
  await ref.set(
    {
      ...partial,
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function heartbeat(db: Firestore, instanceId: string): Promise<void> {
  const ref = db.collection(STATUS_COLLECTION).doc(instanceId);
  await ref.set({ lastHeartbeatAt: new Date(), updatedAt: new Date() }, { merge: true });
}

export async function emitQR(
  db: Firestore,
  instanceId: string,
  qrDataUrl: string,
  ttlMs: number = 60_000,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await updateStatus(db, instanceId, {
    state: 'pairing',
    qr: qrDataUrl,
    qrExpiresAt: expiresAt,
  });
}

export async function clearQR(db: Firestore, instanceId: string): Promise<void> {
  await updateStatus(db, instanceId, { qr: null, qrExpiresAt: null });
}
