import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleIncomingMessage } from '../inbound.js';
import type { IncomingMessage } from '../inbound.js';

interface MockState {
  conversations: Map<string, Record<string, unknown>>;
  messages: Map<string, Record<string, unknown>>;
  clients: Array<Record<string, unknown> & { id: string }>;
  writeLog: Array<{ kind: string; collection: string; id?: string; data: unknown }>;
}

/**
 * Builds a Firestore-like mock that supports the chains used by inbound.ts:
 *   - whatsapp_messages.where(...).limit(...).get()
 *   - whatsapp_messages.add(...)
 *   - whatsapp_conversations.doc(id).{get,set,update}
 *   - clients.where(...).limit(...).get()  (called once per match strategy)
 */
function buildDb(state: MockState) {
  const where = (rows: Array<Record<string, unknown>>, fieldGetter: (row: Record<string, unknown>, value: unknown) => boolean) => {
    return (_field: string, _op: string, value: unknown) => {
      const filtered = rows.filter((r) => fieldGetter(r, value));
      const result = {
        limit: vi.fn(() => ({
          get: vi.fn(async () => ({
            empty: filtered.length === 0,
            docs: filtered.map((r) => ({ id: r.id, data: () => r })),
          })),
        })),
        get: vi.fn(async () => ({
          empty: filtered.length === 0,
          docs: filtered.map((r) => ({ id: r.id, data: () => r })),
        })),
      };
      return result;
    };
  };

  return {
    collection: vi.fn((name: string) => {
      if (name === 'whatsapp_messages') {
        const allMessages = () => [...state.messages.values()];
        return {
          where: vi.fn(
            where(allMessages() as Array<Record<string, unknown>>, (r, value) => r.whatsappMessageId === value),
          ),
          add: vi.fn(async (data: Record<string, unknown>) => {
            const id = `msg_${state.messages.size + 1}`;
            state.messages.set(id, { id, ...data });
            state.writeLog.push({ kind: 'add', collection: name, id, data });
            return { id };
          }),
        };
      }
      if (name === 'whatsapp_conversations') {
        return {
          doc: vi.fn((id: string) => ({
            id,
            get: vi.fn(async () => {
              const data = state.conversations.get(id);
              return { exists: data !== undefined, data: () => data, id };
            }),
            set: vi.fn(async (data: Record<string, unknown>) => {
              state.conversations.set(id, data);
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
      if (name === 'clients') {
        return {
          where: vi.fn((field: string, _op: string, value: unknown) => {
            const matches =
              field === 'phone'
                ? state.clients.filter((c) => c.phone === value)
                : field === 'contactMethodValues'
                  ? state.clients.filter(
                      (c) =>
                        Array.isArray(c.contactMethodValues) &&
                        (c.contactMethodValues as unknown[]).includes(value),
                    )
                  : [];
            return {
              limit: vi.fn(() => ({
                get: vi.fn(async () => ({
                  empty: matches.length === 0,
                  docs: matches.map((c) => ({ id: c.id, data: () => c })),
                })),
              })),
              get: vi.fn(async () => ({
                empty: matches.length === 0,
                docs: matches.map((c) => ({ id: c.id, data: () => c })),
              })),
            };
          }),
        };
      }
      return { doc: vi.fn() };
    }),
  };
}

describe('handleIncomingMessage', () => {
  let state: MockState;
  let db: ReturnType<typeof buildDb>;

  beforeEach(() => {
    state = {
      conversations: new Map(),
      messages: new Map(),
      clients: [],
      writeLog: [],
    };
    db = buildDb(state);
  });

  function makeMsg(overrides?: Partial<IncomingMessage>): IncomingMessage {
    return {
      whatsappMessageId: 'WAMSG-001',
      from: '5511999999999',
      pushName: 'Maria',
      text: 'Olá, gostaria de um bolo',
      type: 'text',
      timestamp: new Date('2026-01-01T12:00:00Z'),
      ...overrides,
    };
  }

  it('creates a new conversation with unreadCount=1 on first message', async () => {
    const result = await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    expect(result.status).toBe('inserted');
    const conv = state.conversations.get('5511999999999');
    expect(conv).toBeDefined();
    expect(conv?.phone).toBe('5511999999999');
    expect(conv?.unreadCount).toBe(1);
    expect(conv?.lastMessagePreview).toContain('Olá');
    expect(conv?.lastMessageDirection).toBe('in');
    expect(state.messages.size).toBe(1);
  });

  it('dedupes by whatsappMessageId — second call is a no-op', async () => {
    const msg = makeMsg();
    state.messages.set('msg_existing', {
      id: 'msg_existing',
      whatsappMessageId: msg.whatsappMessageId,
      conversationId: '5511999999999',
    });

    const result = await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      msg,
      'primary',
    );
    expect(result.status).toBe('duplicate');
    expect(state.messages.size).toBe(1); // no new doc
    expect(state.conversations.size).toBe(0); // conversation not created
  });

  it('matches an existing client by top-level phone field', async () => {
    state.clients.push({
      id: 'client-1',
      phone: '5511999999999',
      name: 'Maria Silva',
      isActive: true,
      updatedAt: new Date('2025-12-01'),
    });
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.clienteId).toBe('client-1');
    expect(conv?.clienteNome).toBe('Maria Silva');
  });

  it('matches an existing client by contactMethodValues array-contains', async () => {
    state.clients.push({
      id: 'client-2',
      phone: 'something-else',
      contactMethodValues: ['5511999999999'],
      name: 'Carlos',
      isActive: true,
      updatedAt: new Date('2025-12-01'),
    });
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.clienteId).toBe('client-2');
  });

  it('leaves clienteId undefined when no client matches', async () => {
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.clienteId).toBeUndefined();
  });

  it('increments unreadCount when conversation already exists', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      unreadCount: 2,
    });
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.unreadCount).toBe(3);
  });

  it('returns invalid for unparseable phone', async () => {
    const result = await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg({ from: 'not-a-phone' }),
      'primary',
    );
    expect(result.status).toBe('invalid');
    expect(state.conversations.size).toBe(0);
    expect(state.messages.size).toBe(0);
  });

  it('uses media-type preview for non-text messages', async () => {
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg({ type: 'image', text: undefined }),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.lastMessagePreview).toBe('[imagem]');
  });

  it('back-fills clienteId on existing unlinked conversation when client now exists', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      unreadCount: 0,
      // no clienteId set — eligible for back-fill
    });
    state.clients.push({
      id: 'client-99',
      phone: '5511999999999',
      name: 'João',
      isActive: true,
      updatedAt: new Date('2025-12-01'),
    });

    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.clienteId).toBe('client-99');
    expect(conv?.clienteNome).toBe('João');
  });

  it('skips inactive clients in auto-link', async () => {
    state.clients.push({
      id: 'inactive-client',
      phone: '5511999999999',
      name: 'Old',
      isActive: false,
      updatedAt: new Date('2024-01-01'),
    });
    await handleIncomingMessage(
      db as unknown as FirebaseFirestore.Firestore,
      makeMsg(),
      'primary',
    );
    const conv = state.conversations.get('5511999999999');
    expect(conv?.clienteId).toBeUndefined();
  });
});
