import { describe, it, expect, vi } from 'vitest';
import { buildSocketOptions } from '../index.js';

/**
 * Smoke tests for the production socket config block. The actual socket
 * lifecycle / event wiring lives inside `main()` which has process-level
 * side effects (lease acquisition, signal handlers, real Firestore init)
 * that can't be exercised in a unit test. The config helper is the
 * testable surface.
 */
describe('buildSocketOptions', () => {
  function fakeDb() {
    // Minimal stub — we don't actually call any of these in the assertions
    // below, but the helper takes a Firestore by type. Cast through unknown
    // to keep TS quiet.
    return {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({ get: vi.fn(async () => ({ empty: true, docs: [] })) })),
        })),
      })),
    };
  }

  function makeOpts() {
    return buildSocketOptions(
      fakeDb() as unknown as import('firebase-admin/firestore').Firestore,
      { creds: {}, keys: { get: vi.fn(), set: vi.fn() } },
      { level: 'silent' },
      [2, 3000, 0],
    );
  }

  it('caps fromMe MessageCounterError retries at 5', () => {
    // The whole point of the production fix: cap retries so the libsignal
    // ratchet-mismatch loop can't spiral forever on every fromMe message.
    expect(makeOpts().maxMsgRetryCount).toBe(5);
  });

  it('passes a msgRetryCounterCache so retries are tracked across reconnects', () => {
    const opts = makeOpts();
    // We don't assert the exact instance shape — just that something with
    // node-cache's surface is present (get/set/has methods).
    const cache = opts.msgRetryCounterCache as Record<string, unknown>;
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
  });

  it('keeps syncFullHistory: true (history sync stays enabled)', () => {
    expect(makeOpts().syncFullHistory).toBe(true);
  });

  it('does NOT set shouldSyncHistoryMessage (community-flagged risky)', () => {
    // The first cut of this fix tried `shouldSyncHistoryMessage: msg => !fromMe`
    // to drop fromMe history. Research flagged it as breaking LID device
    // mapping for multi-device users. Confirm we're not regressing.
    expect(Object.prototype.hasOwnProperty.call(makeOpts(), 'shouldSyncHistoryMessage')).toBe(false);
  });

  it('sets transactionOpts to prevent concurrent SignalKeyStore writes', () => {
    const opts = makeOpts();
    expect(opts.transactionOpts).toEqual({ maxCommitRetries: 10, delayBetweenTriesMs: 100 });
  });

  it('uses production-recommended timeout/keepalive defaults', () => {
    const opts = makeOpts();
    expect(opts.connectTimeoutMs).toBe(30_000);
    expect(opts.defaultQueryTimeoutMs).toBe(60_000);
    expect(opts.keepAliveIntervalMs).toBe(30_000);
    expect(opts.markOnlineOnConnect).toBe(false);
  });

  it('exposes a getMessage callback that looks up by whatsappMessageId in Firestore', async () => {
    const docs = [
      { data: () => ({ text: 'Olá!' }) },
    ];
    const where = vi.fn(() => ({
      limit: vi.fn(() => ({
        get: vi.fn(async () => ({ empty: false, docs })),
      })),
    }));
    const db = {
      collection: vi.fn((name: string) => {
        if (name !== 'whatsapp_messages') throw new Error(`unexpected collection: ${name}`);
        return { where };
      }),
    };

    const opts = buildSocketOptions(
      db as unknown as import('firebase-admin/firestore').Firestore,
      {},
      { level: 'silent' },
      [2, 3000, 0],
    );

    const getMessage = opts.getMessage as (
      key: { id?: string | null },
    ) => Promise<{ conversation: string } | undefined>;
    const result = await getMessage({ id: 'WAMSG-123' });

    expect(result).toEqual({ conversation: 'Olá!' });
    expect(where).toHaveBeenCalledWith('whatsappMessageId', '==', 'WAMSG-123');
  });

  it('getMessage returns undefined when no row matches', async () => {
    const db = {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({ get: vi.fn(async () => ({ empty: true, docs: [] })) })),
        })),
      })),
    };

    const opts = buildSocketOptions(
      db as unknown as import('firebase-admin/firestore').Firestore,
      {},
      { level: 'silent' },
      [2, 3000, 0],
    );

    const getMessage = opts.getMessage as (
      key: { id?: string | null },
    ) => Promise<{ conversation: string } | undefined>;

    expect(await getMessage({ id: 'unknown' })).toBeUndefined();
  });

  it('getMessage returns undefined when key has no id', async () => {
    const db = {
      collection: vi.fn(() => {
        throw new Error('should not be called when id is missing');
      }),
    };

    const opts = buildSocketOptions(
      db as unknown as import('firebase-admin/firestore').Firestore,
      {},
      { level: 'silent' },
      [2, 3000, 0],
    );

    const getMessage = opts.getMessage as (
      key: { id?: string | null },
    ) => Promise<{ conversation: string } | undefined>;

    expect(await getMessage({})).toBeUndefined();
    expect(await getMessage({ id: null })).toBeUndefined();
  });

  it('getMessage returns undefined when matched row has no text (media-only message)', async () => {
    const docs = [{ data: () => ({}) }];
    const db = {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({ get: vi.fn(async () => ({ empty: false, docs })) })),
        })),
      })),
    };

    const opts = buildSocketOptions(
      db as unknown as import('firebase-admin/firestore').Firestore,
      {},
      { level: 'silent' },
      [2, 3000, 0],
    );

    const getMessage = opts.getMessage as (
      key: { id?: string | null },
    ) => Promise<{ conversation: string } | undefined>;

    expect(await getMessage({ id: 'WAMSG-MEDIA' })).toBeUndefined();
  });

  it('getMessage swallows Firestore errors (never throws into Baileys)', async () => {
    const db = {
      collection: vi.fn(() => {
        throw new Error('boom');
      }),
    };

    const opts = buildSocketOptions(
      db as unknown as import('firebase-admin/firestore').Firestore,
      {},
      { level: 'silent' },
      [2, 3000, 0],
    );

    const getMessage = opts.getMessage as (
      key: { id?: string | null },
    ) => Promise<{ conversation: string } | undefined>;

    expect(await getMessage({ id: 'WAMSG-ERR' })).toBeUndefined();
  });

  it('uses Momento Cake browser identity', () => {
    expect(makeOpts().browser).toEqual(['Momento Cake', 'Chrome', '1.0']);
  });

  it('does not print QR in terminal (we render via Firestore + admin UI)', () => {
    expect(makeOpts().printQRInTerminal).toBe(false);
  });
});
