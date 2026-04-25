import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStatus, heartbeat, emitQR, clearQR } from '../status.js';

interface DocStore {
  data: Record<string, unknown> | undefined;
}

function buildDb(store: DocStore) {
  const docRef = {
    set: vi.fn(async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      store.data = opts?.merge ? { ...(store.data ?? {}), ...data } : data;
    }),
  };
  return {
    collection: vi.fn(() => ({
      doc: vi.fn(() => docRef),
    })),
    docRef,
  };
}

describe('status helpers', () => {
  let store: DocStore;
  let db: ReturnType<typeof buildDb>;

  beforeEach(() => {
    store = { data: undefined };
    db = buildDb(store);
  });

  it('updateStatus merges partial fields and sets updatedAt', async () => {
    await updateStatus(db as unknown as FirebaseFirestore.Firestore, 'primary', {
      state: 'connected',
      pairedPhone: '5511999999999',
    });
    expect(store.data?.state).toBe('connected');
    expect(store.data?.pairedPhone).toBe('5511999999999');
    expect(store.data?.updatedAt).toBeInstanceOf(Date);
  });

  it('heartbeat writes lastHeartbeatAt', async () => {
    await heartbeat(db as unknown as FirebaseFirestore.Firestore, 'primary');
    expect(store.data?.lastHeartbeatAt).toBeInstanceOf(Date);
  });

  it('emitQR writes pairing state, qr, and qrExpiresAt', async () => {
    await emitQR(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
      'data:image/png;base64,xxx',
      30_000,
    );
    expect(store.data?.state).toBe('pairing');
    expect(store.data?.qr).toBe('data:image/png;base64,xxx');
    expect((store.data?.qrExpiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('clearQR sets qr and qrExpiresAt to null', async () => {
    await clearQR(db as unknown as FirebaseFirestore.Firestore, 'primary');
    expect(store.data?.qr).toBeNull();
    expect(store.data?.qrExpiresAt).toBeNull();
  });
});
