import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processSyncJob } from '../sync-jobs.js';

interface MockState {
  conversations: Map<string, Record<string, unknown>>;
  jobs: Map<string, Record<string, unknown>>;
  writeLog: Array<{ kind: string; collection: string; id?: string; data: unknown }>;
}

function buildDb(state: MockState) {
  return {
    collection: vi.fn((name: string) => {
      if (name === 'whatsapp_conversations') {
        return {
          doc: vi.fn((id: string) => ({
            id,
            get: vi.fn(async () => {
              const data = state.conversations.get(id);
              return { exists: data !== undefined, data: () => data, id };
            }),
            set: vi.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
              if (options?.merge) {
                const existing = state.conversations.get(id) ?? {};
                state.conversations.set(id, { ...existing, ...data });
              } else {
                state.conversations.set(id, data);
              }
              state.writeLog.push({ kind: 'set', collection: name, id, data });
            }),
            update: vi.fn(async (data: Record<string, unknown>) => {
              const existing = state.conversations.get(id) ?? {};
              state.conversations.set(id, { ...existing, ...data });
              state.writeLog.push({ kind: 'update', collection: name, id, data });
            }),
          })),
        };
      }
      if (name === 'whatsapp_sync_jobs') {
        return {
          doc: vi.fn((id: string) => ({
            id,
            get: vi.fn(async () => {
              const data = state.jobs.get(id);
              return { exists: data !== undefined, data: () => data, id };
            }),
            update: vi.fn(async (data: Record<string, unknown>) => {
              const existing = state.jobs.get(id) ?? {};
              state.jobs.set(id, { ...existing, ...data });
              state.writeLog.push({ kind: 'update', collection: name, id, data });
            }),
          })),
        };
      }
      return { doc: vi.fn() };
    }),
  };
}

interface MockSocket {
  onWhatsApp: ReturnType<typeof vi.fn>;
}

function buildSock(matches: Array<{ jid: string; exists: unknown }>): MockSocket {
  return {
    onWhatsApp: vi.fn(async () => matches),
  };
}

describe('processSyncJob', () => {
  let state: MockState;
  let db: ReturnType<typeof buildDb>;

  beforeEach(() => {
    state = {
      conversations: new Map(),
      jobs: new Map(),
      writeLog: [],
    };
    db = buildDb(state);
  });

  it('marks job complete with zero matches when phones is empty', async () => {
    state.jobs.set('job-1', { status: 'pending', phones: [] });
    const sock = buildSock([]);

    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result).toEqual({ matched: 0, created: 0, skipped: 0 });
    expect(state.jobs.get('job-1')?.status).toBe('complete');
    expect(state.jobs.get('job-1')?.matched).toBe(0);
  });

  it('returns null when the job is missing', async () => {
    const sock = buildSock([]);
    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'missing',
      'primary',
    );
    expect(result).toBeNull();
    expect(sock.onWhatsApp).not.toHaveBeenCalled();
  });

  it('skips jobs that are not pending (already complete)', async () => {
    state.jobs.set('job-1', { status: 'complete', phones: ['5511999999999'] });
    const sock = buildSock([{ jid: '5511999999999@s.whatsapp.net', exists: true }]);
    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result).toBeNull();
    expect(sock.onWhatsApp).not.toHaveBeenCalled();
  });

  it('creates placeholder conversations for matched phones', async () => {
    state.jobs.set('job-1', {
      status: 'pending',
      phones: ['5511999999999', '5511888888888'],
      clientsByPhone: {
        '5511999999999': { id: 'cli-1', name: 'Maria' },
        '5511888888888': { id: 'cli-2', name: 'João' },
      },
    });
    const sock = buildSock([
      { jid: '5511999999999@s.whatsapp.net', exists: true },
      { jid: '5511888888888@s.whatsapp.net', exists: true },
    ]);

    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result?.matched).toBe(2);
    expect(result?.created).toBe(2);

    const conv1 = state.conversations.get('5511999999999');
    expect(conv1?.placeholder).toBe(true);
    expect(conv1?.clienteId).toBe('cli-1');
    expect(conv1?.clienteNome).toBe('Maria');
    expect(conv1?.lastMessageAt).toBeNull();
    expect(conv1?.unreadCount).toBe(0);

    expect(state.jobs.get('job-1')?.status).toBe('complete');
    expect(state.jobs.get('job-1')?.matched).toBe(2);
  });

  it('skips placeholder creation when conversation already exists', async () => {
    state.jobs.set('job-1', {
      status: 'pending',
      phones: ['5511999999999'],
      clientsByPhone: { '5511999999999': { id: 'cli-1', name: 'Maria' } },
    });
    state.conversations.set('5511999999999', {
      phone: '5511999999999',
      lastMessageAt: new Date('2026-01-01'),
      lastMessagePreview: 'oi',
    });
    const sock = buildSock([{ jid: '5511999999999@s.whatsapp.net', exists: true }]);

    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result?.matched).toBe(1);
    expect(result?.created).toBe(0);
    expect(result?.skipped).toBe(1);
    // Existing conversation untouched.
    const conv = state.conversations.get('5511999999999');
    expect(conv?.lastMessagePreview).toBe('oi');
    expect(conv?.placeholder).toBeUndefined();
  });

  it('filters out phones that onWhatsApp says do not exist', async () => {
    state.jobs.set('job-1', {
      status: 'pending',
      phones: ['5511999999999', '5511888888888'],
      clientsByPhone: {
        '5511999999999': { id: 'cli-1', name: 'Maria' },
        '5511888888888': { id: 'cli-2', name: 'João' },
      },
    });
    const sock = buildSock([
      { jid: '5511999999999@s.whatsapp.net', exists: true },
      { jid: '5511888888888@s.whatsapp.net', exists: false },
    ]);

    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result?.matched).toBe(1);
    expect(result?.created).toBe(1);
    expect(state.conversations.has('5511999999999')).toBe(true);
    expect(state.conversations.has('5511888888888')).toBe(false);
  });

  it('marks job failed with an error message when onWhatsApp throws', async () => {
    state.jobs.set('job-1', {
      status: 'pending',
      phones: ['5511999999999'],
      clientsByPhone: {},
    });
    const sock: MockSocket = {
      onWhatsApp: vi.fn(async () => {
        throw new Error('network down');
      }),
    };

    const result = await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    expect(result).toBeNull();
    expect(state.jobs.get('job-1')?.status).toBe('failed');
    expect(state.jobs.get('job-1')?.error).toContain('network down');
  });

  it('batches phones into chunks of 50 when calling onWhatsApp', async () => {
    const phones = Array.from({ length: 110 }, (_, i) =>
      `551199${String(i).padStart(7, '0')}`.slice(0, 13),
    );
    state.jobs.set('job-1', {
      status: 'pending',
      phones,
      clientsByPhone: {},
    });
    const sock = buildSock([]);

    await processSyncJob(
      db as unknown as FirebaseFirestore.Firestore,
      sock,
      'job-1',
      'primary',
    );
    // 110 phones, batch size 50 => 3 calls.
    expect(sock.onWhatsApp).toHaveBeenCalledTimes(3);
  });
});
