/**
 * Firestore-based lease lock for the worker.
 *
 * Only one worker may pair the WhatsApp session at a time. We coordinate via
 * `whatsapp_status/{instanceId}.workerInstanceId` + `lockExpiresAt`.
 *
 * On startup, a worker tries to acquire the lease. If a fresh lock is held by
 * a different worker, we throw `LeaseHeldError` so the caller can exit cleanly.
 *
 * After acquisition, the caller should invoke `renew()` periodically (every 30s)
 * so the lock doesn't expire mid-run.
 */

import type { Firestore } from 'firebase-admin/firestore';

const STATUS_COLLECTION = 'whatsapp_status';
// Lease TTL is 60s with 20s renewal cadence (see index.ts) so a missed renewal still leaves
// 40s of headroom. Tightening from the original 90s lets systemd restart-after-crash recover
// in ~60s instead of ~90s — the systemd unit's RestartSec=120 stays just above this so a
// scheduled restart never trips a stale lease against itself.
const LEASE_TTL_MS = 60_000;

export class LeaseHeldError extends Error {
  constructor(public readonly heldBy: string, public readonly expiresAt: Date) {
    super(`Lease for instance is held by worker '${heldBy}' until ${expiresAt.toISOString()}.`);
    this.name = 'LeaseHeldError';
  }
}

export interface Lease {
  workerId: string;
  renew(): Promise<void>;
  release(): Promise<void>;
}

interface LockDoc {
  workerInstanceId?: string;
  lockExpiresAt?: Date | { toDate(): Date };
}

function readExpiresAt(value: LockDoc['lockExpiresAt']): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

async function writeLease(
  db: Firestore,
  instanceId: string,
  workerId: string,
): Promise<Date> {
  const ref = db.collection(STATUS_COLLECTION).doc(instanceId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.exists ? snap.data() : undefined) as LockDoc | undefined;

    const heldBy = data?.workerInstanceId;
    const expiresAt = readExpiresAt(data?.lockExpiresAt);
    const now = new Date();

    if (heldBy && heldBy !== workerId && expiresAt && expiresAt.getTime() > now.getTime()) {
      throw new LeaseHeldError(heldBy, expiresAt);
    }

    const newExpiry = new Date(now.getTime() + LEASE_TTL_MS);
    tx.set(
      ref,
      {
        workerInstanceId: workerId,
        lockExpiresAt: newExpiry,
        updatedAt: now,
      },
      { merge: true },
    );
    return newExpiry;
  });
}

export async function acquireLease(
  db: Firestore,
  instanceId: string,
  workerId: string,
): Promise<Lease> {
  await writeLease(db, instanceId, workerId);

  const renew = async () => {
    await writeLease(db, instanceId, workerId);
  };

  const release = async () => {
    const ref = db.collection(STATUS_COLLECTION).doc(instanceId);
    await ref.set(
      {
        workerInstanceId: null,
        lockExpiresAt: new Date(0),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  };

  return { workerId, renew, release };
}
