import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleHistorySync, __resetProfilePhotoThrottleForTests } from '../history.js';
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
    __resetProfilePhotoThrottleForTests();
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

  describe('whatsappName backfill from message pushName', () => {
    it('upserts conversations with whatsappName extracted from message pushName', async () => {
      // chat.name is missing — only the message-level pushName carries the
      // contact's display name. This is the production case that motivated the
      // backfill (Baileys leaves chat.name empty for unsaved contacts).
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: {
              remoteJid: '5511999999999@s.whatsapp.net',
              fromMe: false,
              id: 'WA-001',
            },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: 'Maria Silva',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria Silva');
    });

    it('picks the most recent inbound pushName when multiple messages exist', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'old' },
            messageTimestamp: 1735000000,
            pushName: 'Old Name',
          },
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M2' },
            message: { conversation: 'new' },
            messageTimestamp: 1735100000,
            pushName: 'New Name',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('New Name');
    });

    it('ignores pushName from fromMe messages (it is our own name, not the contact)', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: true, id: 'OUT' },
            message: { conversation: 'reply' },
            messageTimestamp: 1735000000,
            pushName: 'Admin User',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBeUndefined();
    });

    it('skips empty/whitespace-only pushNames and falls back to undefined', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'EMPTY' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: '   ',
          },
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'NULL' },
            message: { conversation: 'oi 2' },
            messageTimestamp: 1735000001,
            pushName: '',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBeUndefined();
    });

    it('does not overwrite an existing whatsappName on update path', async () => {
      // Simulate inbound.ts having already set a fresh whatsappName.
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        whatsappName: 'Existing Name From Inbound',
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: 'Stale History Name',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Existing Name From Inbound');
    });

    it('fills whatsappName on update path when the existing value is missing/empty', async () => {
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        whatsappName: '',
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: 'Backfilled Name',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Backfilled Name');
    });

    it('prefers message pushName over chat.name (chat.name is unreliable for unsaved contacts)', async () => {
      const event = makeEvent({
        chats: [
          { id: '5511999999999@s.whatsapp.net', name: '5511999999999' },
        ],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: 'Maria',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria');
    });
  });

  describe('clients collection fallback for whatsappName', () => {
    /**
     * Production scenario: history-sync chunks ship without pushName (very
     * common — Baileys often omits it for unsaved/historical chats), so the
     * snapshot's `messages[]` provides nothing for `buildPushNameByJid`.
     * Without a fallback, the conversation gets created with no name. The
     * fallback queries the admin-side `clients` collection and uses the
     * matched client's name.
     */

    it('uses client name when no pushName is present in the snapshot', async () => {
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'Maria from CRM',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        // No messages → no pushName extracted.
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria from CRM');
      // Also writes clienteId/clienteNome since we did the lookup anyway.
      expect(conv?.clienteId).toBe('client-1');
      expect(conv?.clienteNome).toBe('Maria from CRM');
    });

    it('prefers pushName over client name when both are available', async () => {
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'CRM Name (older/stale)',
        isActive: true,
        updatedAt: new Date('2025-01-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: 'WhatsApp Name (fresher)',
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('WhatsApp Name (fresher)');
    });

    it('uses client name when pushName is empty/whitespace', async () => {
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'Maria from CRM',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
        messages: [
          {
            key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'M1' },
            message: { conversation: 'oi' },
            messageTimestamp: 1735000000,
            pushName: '   ', // whitespace-only — buildPushNameByJid drops it
          },
        ],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria from CRM');
    });

    it('client name beats chat.name (chat.name is the unreliable phone-number string)', async () => {
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'Maria from CRM',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net', name: '5511999999999' }],
        // No messages → no pushName.
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria from CRM');
    });

    it('falls back to chat.name when no pushName AND no client match', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Chat Name Fallback' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Chat Name Fallback');
    });

    it('leaves whatsappName undefined when no pushName, no client match, and no chat.name', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBeUndefined();
    });

    it('also fills whatsappName via client lookup on update path when existing value is empty', async () => {
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        whatsappName: '',
      });
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'Maria from CRM',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria from CRM');
      expect(conv?.clienteId).toBe('client-1');
    });

    it('does not overwrite an existing non-empty whatsappName via client lookup', async () => {
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        whatsappName: 'Existing Name',
      });
      state.clients.push({
        id: 'client-1',
        phone: '5511999999999',
        name: 'Different CRM Name',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Existing Name');
      // But still backfills clienteId since the conversation wasn't linked.
      expect(conv?.clienteId).toBe('client-1');
    });

    it('matches via contactMethodValues array-contains', async () => {
      state.clients.push({
        id: 'client-2',
        phone: 'something-else',
        contactMethodValues: ['5511999999999'],
        name: 'Carlos',
        isActive: true,
        updatedAt: new Date('2025-12-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Carlos');
      expect(conv?.clienteId).toBe('client-2');
    });

    it('skips inactive clients in the fallback', async () => {
      state.clients.push({
        id: 'inactive-client',
        phone: '5511999999999',
        name: 'Soft Deleted',
        isActive: false,
        updatedAt: new Date('2024-01-01'),
      });

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBeUndefined();
      expect(conv?.clienteId).toBeUndefined();
    });
  });

  describe('profile picture backfill', () => {
    it('calls sock.profilePictureUrl once per JID and writes URL + timestamp on create', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/abc?token=xyz');
      const sock = { profilePictureUrl };

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
        sock,
      );

      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
      // Baileys expects the full JID, not the bare phone.
      expect(profilePictureUrl).toHaveBeenCalledWith('5511999999999@s.whatsapp.net', 'image');
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/abc?token=xyz');
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });

    it('throttles repeated calls for the same JID within 60s across separate handleHistorySync runs', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/abc');
      const sock = { profilePictureUrl };

      const event1 = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });
      // Second event covers the same JID — common when Baileys delivers
      // history in multiple chunks.
      const event2 = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event1, 'primary', sock);
      await handleHistorySync(db as unknown as FirebaseFirestore.Firestore, event2, 'primary', sock);

      // Throttle: only one call across both chunks.
      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
    });

    it('does not crash when sock.profilePictureUrl rejects (private/404) and ingests the chat anyway', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));
      const sock = { profilePictureUrl };

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      const result = await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
        sock,
      );

      expect(result.chatsUpserted).toBe(1);
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      expect(conv?.profilePictureUrl).toBeUndefined();
      // Refresh timestamp IS set so we don't immediately retry.
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });

    it('does not call profilePictureUrl when sock is undefined (back-compat)', async () => {
      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
      });

      // No sock argument — old call signature.
      const result = await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
      );

      expect(result.chatsUpserted).toBe(1);
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      expect(conv?.profilePictureUrl).toBeUndefined();
      // No fetch attempted, so no refresh timestamp either.
      expect(conv?.profilePictureRefreshedAt).toBeUndefined();
    });

    it('re-fetches when stored URL is older than 20h on update path', async () => {
      const TWENTY_ONE_HOURS_AGO = new Date(Date.now() - 21 * 60 * 60 * 1000);
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        profilePictureUrl: 'https://pps.whatsapp.net/v/old',
        profilePictureRefreshedAt: TWENTY_ONE_HOURS_AGO,
      });

      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/new');
      const sock = { profilePictureUrl };

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
        sock,
      );

      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/new');
    });

    it('skips fetch when stored URL is fresher than 20h on update path', async () => {
      const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        profilePictureUrl: 'https://pps.whatsapp.net/v/fresh',
        profilePictureRefreshedAt: ONE_HOUR_AGO,
      });

      const profilePictureUrl = vi.fn();
      const sock = { profilePictureUrl };

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
        sock,
      );

      expect(profilePictureUrl).not.toHaveBeenCalled();
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/fresh');
    });

    it('treats undefined return from profilePictureUrl as "no photo" — sets timestamp only', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue(undefined);
      const sock = { profilePictureUrl };

      const event = makeEvent({
        chats: [{ id: '5511999999999@s.whatsapp.net' }],
      });

      await handleHistorySync(
        db as unknown as FirebaseFirestore.Firestore,
        event,
        'primary',
        sock,
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBeUndefined();
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });
  });
});
