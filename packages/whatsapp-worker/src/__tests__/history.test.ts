import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleHistorySync } from '../history.js';
import type { HistorySyncEvent } from '../history.js';

interface MockState {
  conversations: Map<string, Record<string, unknown>>;
  messages: Map<string, Record<string, unknown>>;
  clients: Array<Record<string, unknown> & { id: string }>;
  writeLog: Array<{ kind: string; collection: string; id?: string; data: unknown }>;
}

/**
 * Firestore mock that supports the chains used by history.ts and inbound.ts:
 *   whatsapp_messages.where(...).limit(...).get()
 *   whatsapp_messages.add(...)
 *   whatsapp_conversations.doc(id).{get,set,update}
 *   clients.where(...).limit(...).get()
 */
function buildDb(state: MockState) {
  return {
    collection: vi.fn((name: string) => {
      if (name === 'whatsapp_messages') {
        const msgs = () => [...state.messages.values()];
        return {
          where: vi.fn((_field: string, _op: string, value: unknown) => {
            const filtered = (msgs() as Array<Record<string, unknown>>).filter(
              (r) => r.whatsappMessageId === value,
            );
            return {
              limit: vi.fn(() => ({
                get: vi.fn(async () => ({
                  empty: filtered.length === 0,
                  docs: filtered.map((r) => ({ id: r.id, data: () => r })),
                })),
              })),
            };
          }),
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
            };
          }),
        };
      }
      return { doc: vi.fn() };
    }),
  };
}

describe('handleHistorySync', () => {
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

  function makeEvent(overrides?: Partial<HistorySyncEvent>): HistorySyncEvent {
    return {
      chats: [],
      contacts: [],
      messages: [],
      isLatest: true,
      ...overrides,
    };
  }

  it('upserts a conversation per chat in the snapshot', async () => {
    const event = makeEvent({
      chats: [
        {
          id: '5511999999999@s.whatsapp.net',
          name: 'Maria',
          conversationTimestamp: 1735000000,
          unreadCount: 2,
        },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );

    expect(result.chatsUpserted).toBe(1);
    const conv = state.conversations.get('5511999999999');
    expect(conv).toBeDefined();
    expect(conv?.phone).toBe('5511999999999');
    expect(conv?.whatsappName).toBe('Maria');
    expect(conv?.unreadCount).toBe(2);
    expect(conv?.placeholder).toBe(false);
  });

  it('skips group/broadcast/status JIDs', async () => {
    const event = makeEvent({
      chats: [
        { id: '120363012345@g.us', name: 'Family Group' },
        { id: 'status@broadcast', name: 'Status' },
        { id: '5511999999999@s.whatsapp.net', name: 'Maria' },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );

    expect(result.chatsUpserted).toBe(1);
    expect(state.conversations.size).toBe(1);
    expect(state.conversations.has('5511999999999')).toBe(true);
  });

  it('appends messages from the snapshot using inbound dedup', async () => {
    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
      messages: [
        {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: false,
            id: 'WA-HIST-001',
          },
          message: { conversation: 'Olá, gostaria de um bolo' },
          messageTimestamp: 1735000000,
          pushName: 'Maria',
        },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );

    expect(result.messagesIngested).toBe(1);
    expect(state.messages.size).toBe(1);
    const msg = [...state.messages.values()][0];
    expect(msg?.whatsappMessageId).toBe('WA-HIST-001');
    expect(msg?.direction).toBe('in');
  });

  it('is idempotent — running with the same payload twice does not duplicate', async () => {
    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
      messages: [
        {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: false,
            id: 'WA-HIST-001',
          },
          message: { conversation: 'Olá' },
          messageTimestamp: 1735000000,
        },
      ],
    });

    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');
    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');

    // One conversation, one message even after two runs.
    expect(state.conversations.size).toBe(1);
    expect(state.messages.size).toBe(1);
  });

  it('skips messages from self (fromMe: true) at the message level', async () => {
    // Outbound history messages are tracked separately via outbox; we do not
    // want to ingest them through inbound.
    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
      messages: [
        {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net',
            fromMe: true,
            id: 'WA-HIST-OUT-001',
          },
          message: { conversation: 'msg from us' },
          messageTimestamp: 1735000000,
        },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );

    expect(result.messagesIngested).toBe(0);
    expect(state.messages.size).toBe(0);
  });

  it('handles snapshot with only chats (no messages)', async () => {
    const event = makeEvent({
      chats: [
        { id: '5511111111111@s.whatsapp.net', name: 'A' },
        { id: '5511222222222@s.whatsapp.net', name: 'B' },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.chatsUpserted).toBe(2);
    expect(result.messagesIngested).toBe(0);
    expect(state.conversations.size).toBe(2);
  });

  it('does not overwrite a conversation that already has lastMessageAt', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      lastMessageAt: new Date('2026-01-01'),
      lastMessagePreview: 'real conversation',
      unreadCount: 5,
    });

    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
    });

    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');
    const conv = state.conversations.get('5511999999999');
    // Existing lastMessageAt + preview preserved.
    expect(conv?.lastMessagePreview).toBe('real conversation');
    expect(conv?.unreadCount).toBe(5);
  });

  it('accepts conversationTimestamp as a Long-like { toNumber } object', async () => {
    const event = makeEvent({
      chats: [
        {
          id: '5511999999999@s.whatsapp.net',
          name: 'Maria',
          conversationTimestamp: { toNumber: () => 1735000000 },
        },
      ],
    });
    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');
    const conv = state.conversations.get('5511999999999');
    expect(conv?.lastMessageAt).toBeInstanceOf(Date);
  });

  it('infers media types from message payload (image / audio / video / document / sticker / location / contact)', async () => {
    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net' }],
      messages: [
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'IMG' },
          message: { imageMessage: {} },
          messageTimestamp: 1735000000,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'AUD' },
          message: { audioMessage: {} },
          messageTimestamp: 1735000001,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'VID' },
          message: { videoMessage: {} },
          messageTimestamp: 1735000002,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'DOC' },
          message: { documentMessage: {} },
          messageTimestamp: 1735000003,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'STK' },
          message: { stickerMessage: {} },
          messageTimestamp: 1735000004,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'LOC' },
          message: { locationMessage: {} },
          messageTimestamp: 1735000005,
        },
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'CON' },
          message: { contactMessage: {} },
          messageTimestamp: 1735000006,
        },
        {
          // No `message` payload at all — should still record as 'system'.
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'SYS' },
          messageTimestamp: 1735000007,
        },
      ],
    });
    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.messagesIngested).toBe(8);
    const types = [...state.messages.values()].map((m) => m.type);
    expect(types).toEqual([
      'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'system',
    ]);
  });

  it('uses extendedTextMessage.text when conversation field is empty', async () => {
    const event = makeEvent({
      chats: [{ id: '5511999999999@s.whatsapp.net' }],
      messages: [
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'EXT' },
          message: { extendedTextMessage: { text: 'estendido' } },
          messageTimestamp: 1735000000,
        },
      ],
    });
    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');
    const m = [...state.messages.values()][0];
    expect(m?.text).toBe('estendido');
    expect(m?.type).toBe('text');
  });

  it('skips messages missing a key id or remoteJid', async () => {
    const event = makeEvent({
      messages: [
        // No key.
        { message: { conversation: 'x' }, messageTimestamp: 1735000000 },
        // No id.
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false },
          message: { conversation: 'x' },
          messageTimestamp: 1735000000,
        },
        // No remoteJid.
        {
          key: { fromMe: false, id: 'X' },
          message: { conversation: 'x' },
          messageTimestamp: 1735000000,
        },
      ],
    });
    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.messagesIngested).toBe(0);
  });

  it('skips messages with non-1:1 JIDs (groups, broadcasts) and unparseable phones', async () => {
    const event = makeEvent({
      messages: [
        {
          key: { remoteJid: '120363012345@g.us', fromMe: false, id: 'G1' },
          message: { conversation: 'group' },
          messageTimestamp: 1735000000,
        },
        {
          key: { remoteJid: 'not-a-jid', fromMe: false, id: 'BAD' },
          message: { conversation: 'x' },
          messageTimestamp: 1735000000,
        },
      ],
    });
    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.messagesIngested).toBe(0);
  });

  it('backfills lastMessagePreview when conversation row exists but had no preview yet', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      // No lastMessageAt, no lastMessagePreview.
    });
    const event = makeEvent({
      messages: [
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'BFILL' },
          message: { conversation: 'oi' },
          messageTimestamp: 1735000000,
        },
      ],
    });
    await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event, 'primary');
    const conv = state.conversations.get('5511999999999');
    expect(conv?.lastMessagePreview).toBe('oi');
    expect(conv?.lastMessageAt).toBeInstanceOf(Date);
  });

  it('counts unparseable timestamps as `now` (does not crash on missing/garbage)', async () => {
    const event = makeEvent({
      messages: [
        {
          key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'NOTS' },
          message: { conversation: 'oi' },
          // No messageTimestamp at all.
        },
      ],
    });
    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.messagesIngested).toBe(1);
  });

  it('returns aggregate counts and ignores chats with unparseable JID', async () => {
    const event = makeEvent({
      chats: [
        { id: 'garbage', name: 'X' },
        { id: '@s.whatsapp.net', name: 'Y' },
        { id: '5511333333333@s.whatsapp.net', name: 'OK' },
      ],
    });

    const result = await handleHistorySync(
      db as unknown as FirebaseFirestore.Firestore,
      event,
      'primary',
    );
    expect(result.chatsUpserted).toBe(1);
    expect(state.conversations.size).toBe(1);
  });
});
