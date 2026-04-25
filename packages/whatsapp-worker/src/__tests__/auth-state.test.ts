import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFirestoreAuthState } from '../auth-state.js';

interface DocStore {
  creds?: Record<string, unknown>; // mirrors what was passed via .set as `creds: <obj>`
  keys: Map<string, Record<string, unknown>>;
}

function buildDb(store: DocStore) {
  const sessionDocRef = {
    id: 'primary',
    get: vi.fn(async () => ({
      exists: store.creds !== undefined,
      data: () => (store.creds ? { creds: store.creds } : undefined),
    })),
    set: vi.fn(async (data: { creds: Record<string, unknown> }, opts?: { merge?: boolean }) => {
      void opts;
      store.creds = data.creds as Record<string, unknown>;
    }),
  };

  const keysCollection = {
    doc: vi.fn((id: string) => ({
      id,
      get: vi.fn(async () => {
        const data = store.keys.get(id);
        return { exists: data !== undefined, data: () => data };
      }),
      set: vi.fn(async (data: Record<string, unknown>) => {
        store.keys.set(id, data);
      }),
      delete: vi.fn(async () => {
        store.keys.delete(id);
      }),
    })),
  };

  return {
    collection: vi.fn((name: string) => {
      if (name === 'whatsapp_sessions') {
        return {
          doc: vi.fn((instanceId: string) => {
            void instanceId;
            return {
              ...sessionDocRef,
              collection: vi.fn((sub: string) => {
                if (sub === 'keys') return keysCollection;
                throw new Error(`Unexpected subcollection: ${sub}`);
              }),
            };
          }),
        };
      }
      throw new Error(`Unexpected top collection: ${name}`);
    }),
  };
}

describe('createFirestoreAuthState', () => {
  let store: DocStore;
  let db: ReturnType<typeof buildDb>;

  beforeEach(() => {
    store = { keys: new Map() };
    db = buildDb(store);
  });

  it('returns initial creds when no doc exists', async () => {
    const { state } = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );
    expect(state.creds).toBeDefined();
    // initAuthCreds returns objects with these standard fields
    expect(typeof state.creds).toBe('object');
  });

  it('saveCreds writes serialized creds to Firestore', async () => {
    const { state, saveCreds } = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );
    state.creds.advSecretKey = 'test-secret';
    await saveCreds();
    expect(store.creds).toBeDefined();
    expect(typeof (store.creds as { json: string }).json).toBe('string');
    // The JSON string should contain our test value (base64 or raw).
    expect((store.creds as { json: string }).json).toContain('test-secret');
  });

  it('round-trips creds (write then read returns equivalent shape)', async () => {
    const { state, saveCreds } = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );
    state.creds.advSecretKey = 'secret-XYZ';
    await saveCreds();

    // Re-load:
    const reloaded = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );
    expect(reloaded.state.creds.advSecretKey).toBe('secret-XYZ');
  });

  it('keys.set writes key data, keys.get reads it back', async () => {
    const { state } = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );

    // Baileys SignalKeyStore interface:
    await state.keys.set({
      'pre-key': {
        '1': { public: Buffer.from([1, 2, 3]), private: Buffer.from([4, 5, 6]) },
      },
    });

    const result = await state.keys.get('pre-key', ['1']);
    expect(result['1']).toBeDefined();
  });

  it('keys.set with null value deletes the key', async () => {
    const { state } = await createFirestoreAuthState(
      db as unknown as FirebaseFirestore.Firestore,
      'primary',
    );

    await state.keys.set({
      'pre-key': {
        '1': { public: Buffer.from([1, 2, 3]), private: Buffer.from([4, 5, 6]) },
      },
    });
    await state.keys.set({ 'pre-key': { '1': null } });

    const result = await state.keys.get('pre-key', ['1']);
    expect(result['1']).toBeUndefined();
  });
});
