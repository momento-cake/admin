/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory Firestore with a real-ish transaction over a shared store.
const store = new Map<string, any>();

function docRef(path: string) {
  return { path, id: path.split('/').pop()! };
}

const runTransaction = vi.fn(async (fn: (tx: any) => Promise<any>) => {
  const tx = {
    get: async (ref: { path: string }) => {
      const data = store.get(ref.path);
      return { exists: data !== undefined, data: () => data };
    },
    set: (ref: { path: string }, payload: any) => store.set(ref.path, payload),
    update: (ref: { path: string }, payload: any) =>
      store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...payload }),
  };
  return fn(tx);
});

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({ doc: (id: string) => docRef(`${name}/${id}`) }),
    runTransaction: (fn: any) => runTransaction(fn),
  },
}));

import { reserveNfNumero, nfCounterDocId } from '@/lib/fiscal/nf-counter';

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe('nfCounterDocId', () => {
  it('encodes modelo, série and ambiente', () => {
    expect(nfCounterDocId(55, 1, 'producao')).toBe('55-serie-1-producao');
    expect(nfCounterDocId(65, 3, 'homologacao')).toBe('65-serie-3-homologacao');
  });
});

describe('reserveNfNumero', () => {
  it('starts at 1 when the counter does not exist yet', async () => {
    const n = await reserveNfNumero(55, 1, 'homologacao');
    expect(n).toBe(1);
    expect(store.get('fiscal_counters/55-serie-1-homologacao')).toEqual({ lastNumber: 1 });
  });

  it('increments the existing counter atomically', async () => {
    await reserveNfNumero(55, 1, 'homologacao');
    const second = await reserveNfNumero(55, 1, 'homologacao');
    const third = await reserveNfNumero(55, 1, 'homologacao');
    expect(second).toBe(2);
    expect(third).toBe(3);
    expect(runTransaction).toHaveBeenCalledTimes(3);
  });

  it('keeps independent sequences per (modelo, série, ambiente)', async () => {
    expect(await reserveNfNumero(55, 1, 'homologacao')).toBe(1);
    expect(await reserveNfNumero(55, 1, 'homologacao')).toBe(2);
    // Different model → its own counter starting at 1.
    expect(await reserveNfNumero(65, 1, 'homologacao')).toBe(1);
    // Different série → its own counter.
    expect(await reserveNfNumero(55, 2, 'homologacao')).toBe(1);
    // Different ambiente → its own counter.
    expect(await reserveNfNumero(55, 1, 'producao')).toBe(1);
  });
});
