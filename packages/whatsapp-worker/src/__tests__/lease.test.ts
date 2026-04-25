import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acquireLease, LeaseHeldError } from '../lease.js';

type DocSnapshot = {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
};

function makeFirestoreMock(initial?: Record<string, unknown>) {
  const docState: { data: Record<string, unknown> | undefined } = { data: initial };

  const transactionApi = {
    get: vi.fn(async () => ({
      exists: docState.data !== undefined,
      data: () => docState.data,
    })) as (ref: unknown) => Promise<DocSnapshot>,
    set: vi.fn((ref: unknown, value: Record<string, unknown>, opts?: unknown) => {
      void ref;
      void opts;
      docState.data = { ...(docState.data ?? {}), ...value };
    }),
    update: vi.fn((ref: unknown, value: Record<string, unknown>) => {
      void ref;
      docState.data = { ...(docState.data ?? {}), ...value };
    }),
  };

  const docRef = {
    id: 'primary',
    set: vi.fn(async (value: Record<string, unknown>, opts?: { merge?: boolean }) => {
      docState.data = opts?.merge ? { ...(docState.data ?? {}), ...value } : value;
    }),
  };

  const db = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => docRef),
    })),
    runTransaction: vi.fn(async (fn: (tx: typeof transactionApi) => Promise<unknown>) => {
      return fn(transactionApi);
    }),
  };

  return { db, docState, transactionApi };
}

describe('acquireLease', () => {
  const instanceId = 'primary';
  const workerId = 'worker-A';
  const otherWorkerId = 'worker-B';

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('acquires lease when no existing doc', async () => {
    const { db, docState } = makeFirestoreMock();
    const lease = await acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId);
    expect(lease.workerId).toBe(workerId);
    expect(docState.data?.workerInstanceId).toBe(workerId);
    expect(docState.data?.lockExpiresAt).toBeInstanceOf(Date);
  });

  it('refuses lease when another worker holds a fresh lock', async () => {
    const future = new Date(Date.now() + 60_000);
    const { db } = makeFirestoreMock({
      workerInstanceId: otherWorkerId,
      lockExpiresAt: future,
    });

    await expect(
      acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId),
    ).rejects.toBeInstanceOf(LeaseHeldError);
  });

  it('reacquires lease when own lock has expired', async () => {
    const past = new Date(Date.now() - 120_000);
    const { db, docState } = makeFirestoreMock({
      workerInstanceId: workerId,
      lockExpiresAt: past,
    });

    const lease = await acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId);
    expect(lease.workerId).toBe(workerId);
    expect((docState.data?.lockExpiresAt as Date).getTime()).toBeGreaterThan(Date.now() - 1000);
  });

  it('reacquires when other worker has stale (expired) lock', async () => {
    const past = new Date(Date.now() - 120_000);
    const { db } = makeFirestoreMock({
      workerInstanceId: otherWorkerId,
      lockExpiresAt: past,
    });

    const lease = await acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId);
    expect(lease.workerId).toBe(workerId);
  });

  it('renew() updates lockExpiresAt to a future timestamp', async () => {
    const { db, docState } = makeFirestoreMock();
    const lease = await acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId);
    const firstExpiry = (docState.data?.lockExpiresAt as Date).getTime();

    await new Promise((resolve) => setTimeout(resolve, 10));
    await lease.renew();
    const secondExpiry = (docState.data?.lockExpiresAt as Date).getTime();

    expect(secondExpiry).toBeGreaterThanOrEqual(firstExpiry);
  });

  it('release() clears the workerInstanceId and expires the lock', async () => {
    const { db, docState } = makeFirestoreMock();
    const lease = await acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId);
    await lease.release();
    expect(docState.data?.workerInstanceId).toBeNull();
    expect((docState.data?.lockExpiresAt as Date).getTime()).toBe(0);
  });

  it('handles Firestore Timestamp-like lockExpiresAt (toDate)', async () => {
    const future = new Date(Date.now() + 60_000);
    const { db } = makeFirestoreMock({
      workerInstanceId: otherWorkerId,
      lockExpiresAt: { toDate: () => future },
    });

    await expect(
      acquireLease(db as unknown as FirebaseFirestore.Firestore, instanceId, workerId),
    ).rejects.toBeInstanceOf(LeaseHeldError);
  });
});
