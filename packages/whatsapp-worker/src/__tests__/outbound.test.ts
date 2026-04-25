import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processOutboxItem } from '../outbound.js';

interface OutboxState {
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts?: number;
  error?: string;
  whatsappMessageId?: string;
  to: string;
  text: string;
  conversationId: string;
  authorUserId?: string;
  lastAttemptAt?: Date;
  updatedAt?: Date;
}

function buildOutboxRefMock(initial: OutboxState) {
  let state: OutboxState = { ...initial };
  const writeLog: Array<{ kind: string; data: unknown }> = [];

  const ref = {
    id: 'outbox-1',
    update: vi.fn(async (data: Record<string, unknown>) => {
      state = { ...state, ...(data as Partial<OutboxState>) };
      writeLog.push({ kind: 'ref-update', data });
    }),
  };

  type TxSnapshot = {
    exists: boolean;
    data: () => OutboxState | undefined;
    id: string;
  };

  const transactionApi = {
    get: vi.fn(async (docRef: unknown): Promise<TxSnapshot> => {
      void docRef;
      return {
        exists: true,
        data: () => ({ ...state }),
        id: 'outbox-1',
      };
    }),
    update: vi.fn((docRef: unknown, data: Record<string, unknown>) => {
      void docRef;
      state = { ...state, ...(data as Partial<OutboxState>) };
      writeLog.push({ kind: 'tx-update', data });
    }),
  };

  return {
    ref,
    state: () => state,
    writeLog,
    transactionApi,
  };
}

function buildDbMock(outbox: ReturnType<typeof buildOutboxRefMock>) {
  const conversations: Map<string, Record<string, unknown>> = new Map();
  const messages: Array<Record<string, unknown>> = [];
  const writeLog: Array<{ kind: string; collection: string; data: unknown }> = [];

  return {
    db: {
      runTransaction: vi.fn(
        async (fn: (tx: typeof outbox.transactionApi) => Promise<unknown>) => fn(outbox.transactionApi),
      ),
      collection: vi.fn((name: string) => {
        if (name === 'whatsapp_messages') {
          return {
            add: vi.fn(async (data: Record<string, unknown>) => {
              messages.push(data);
              writeLog.push({ kind: 'add', collection: name, data });
              return { id: `msg_${messages.length}` };
            }),
          };
        }
        if (name === 'whatsapp_conversations') {
          return {
            doc: vi.fn((id: string) => ({
              set: vi.fn(async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
                const existing = conversations.get(id) ?? {};
                conversations.set(id, opts?.merge ? { ...existing, ...data } : data);
                writeLog.push({ kind: 'set', collection: name, data });
              }),
            })),
          };
        }
        if (name === 'whatsapp_outbox') {
          return {
            doc: vi.fn(() => outbox.ref),
          };
        }
        return { doc: vi.fn() };
      }),
    },
    conversations,
    messages,
    writeLog,
  };
}

describe('processOutboxItem', () => {
  let outbox: ReturnType<typeof buildOutboxRefMock>;
  let env: ReturnType<typeof buildDbMock>;
  let sock: { sendMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    outbox = buildOutboxRefMock({
      status: 'pending',
      attempts: 0,
      to: '5511999999999',
      text: 'Olá',
      conversationId: '5511999999999',
      authorUserId: 'user-1',
    });
    env = buildDbMock(outbox);
    sock = {
      sendMessage: vi.fn(async () => ({ key: { id: 'WAOUT-001' } })),
    };
  });

  it('claims pending → sending in transaction, then sends and marks sent', async () => {
    const result = await processOutboxItem(
      env.db as unknown as FirebaseFirestore.Firestore,
      outbox.ref as unknown as FirebaseFirestore.DocumentReference,
      sock as unknown as { sendMessage: (jid: string, content: { text: string }) => Promise<unknown> },
    );

    expect(result).toBe('sent');
    expect(sock.sendMessage).toHaveBeenCalledTimes(1);
    expect(sock.sendMessage).toHaveBeenCalledWith(
      '5511999999999@s.whatsapp.net',
      { text: 'Olá' },
    );
    expect(outbox.state().status).toBe('sent');
    expect(outbox.state().whatsappMessageId).toBe('WAOUT-001');
    // Outbound message doc was written.
    expect(env.messages.length).toBe(1);
    expect(env.messages[0].direction).toBe('out');
    // Conversation updated.
    expect(env.conversations.get('5511999999999')).toMatchObject({
      lastMessageDirection: 'out',
    });
  });

  it('skips when status is already non-pending (race lost)', async () => {
    outbox.transactionApi.get = vi.fn(async (ref: unknown) => {
      void ref;
      return {
        exists: true,
        data: () => ({ ...outbox.state(), status: 'sending' as const }),
        id: outbox.ref.id,
      };
    });

    const result = await processOutboxItem(
      env.db as unknown as FirebaseFirestore.Firestore,
      outbox.ref as unknown as FirebaseFirestore.DocumentReference,
      sock as unknown as { sendMessage: (jid: string, content: { text: string }) => Promise<unknown> },
    );

    expect(result).toBe('skipped');
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });

  it('marks failed and writes error when sendMessage rejects', async () => {
    sock.sendMessage = vi.fn(async () => {
      throw new Error('connection lost');
    });

    const result = await processOutboxItem(
      env.db as unknown as FirebaseFirestore.Firestore,
      outbox.ref as unknown as FirebaseFirestore.DocumentReference,
      sock as unknown as { sendMessage: (jid: string, content: { text: string }) => Promise<unknown> },
    );

    expect(result).toBe('failed');
    expect(outbox.state().status).toBe('failed');
    expect(outbox.state().error).toContain('connection lost');
    // No outbound message doc on failure.
    expect(env.messages.length).toBe(0);
  });

  it('returns "skipped" when the doc no longer exists', async () => {
    outbox.transactionApi.get = vi.fn(async (ref: unknown) => {
      void ref;
      return {
        exists: false,
        data: () => undefined,
        id: outbox.ref.id,
      };
    });

    const result = await processOutboxItem(
      env.db as unknown as FirebaseFirestore.Firestore,
      outbox.ref as unknown as FirebaseFirestore.DocumentReference,
      sock as unknown as { sendMessage: (jid: string, content: { text: string }) => Promise<unknown> },
    );

    expect(result).toBe('skipped');
    expect(sock.sendMessage).not.toHaveBeenCalled();
  });
});
