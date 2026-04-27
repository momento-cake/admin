import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleIncomingMessage, __resetProfilePhotoThrottleForTests } from '../inbound.js';
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
    __resetProfilePhotoThrottleForTests();
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

  describe('profile picture caching', () => {
    it('fetches and stores profile picture URL on first message from a JID', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/abc?token=xyz');
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        sock,
      );

      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
      // Baileys expects the full JID (`<phone>@s.whatsapp.net`), not the bare phone.
      expect(profilePictureUrl).toHaveBeenCalledWith('5511999999999@s.whatsapp.net', 'image');
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/abc?token=xyz');
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });

    it('does not call profilePictureUrl twice within 60s for the same JID', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/abc');
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({ whatsappMessageId: 'WAMSG-A' }),
        'primary',
        sock,
      );
      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({ whatsappMessageId: 'WAMSG-B' }),
        'primary',
        sock,
      );

      // Throttle: only one call across both messages.
      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when stored URL is older than 20 hours', async () => {
      const TWENTY_ONE_HOURS_AGO = new Date(Date.now() - 21 * 60 * 60 * 1000);
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        unreadCount: 1,
        profilePictureUrl: 'https://pps.whatsapp.net/v/old',
        profilePictureRefreshedAt: TWENTY_ONE_HOURS_AGO,
      });
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/new');
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        sock,
      );

      expect(profilePictureUrl).toHaveBeenCalledTimes(1);
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/new');
    });

    it('skips fetch when stored URL is fresher than 20 hours', async () => {
      const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        unreadCount: 1,
        profilePictureUrl: 'https://pps.whatsapp.net/v/fresh',
        profilePictureRefreshedAt: ONE_HOUR_AGO,
      });
      const profilePictureUrl = vi.fn();
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        sock,
      );

      expect(profilePictureUrl).not.toHaveBeenCalled();
      const conv = state.conversations.get('5511999999999');
      // URL untouched.
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/fresh');
    });

    it('handles 404 (private account) gracefully — stores no URL but a fresh timestamp', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));
      const sock = { profilePictureUrl };

      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        sock,
      );

      // Message ingestion must NOT crash because of the photo failure.
      expect(result.status).toBe('inserted');
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      // No URL stored, but timestamp updated so we don't retry on the next message.
      expect(conv?.profilePictureUrl).toBeUndefined();
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });

    it('does not crash when sock is undefined (back-compat test path)', async () => {
      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        // no sock argument — old call signature.
      );

      expect(result.status).toBe('inserted');
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      expect(conv?.profilePictureUrl).toBeUndefined();
      // No fetch attempted, so no refresh timestamp either.
      expect(conv?.profilePictureRefreshedAt).toBeUndefined();
    });

    it('treats undefined return from profilePictureUrl as "no photo"', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue(undefined);
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg(),
        'primary',
        sock,
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBeUndefined();
      // Refreshed-at IS set so we skip re-trying for the throttle window.
      expect(conv?.profilePictureRefreshedAt).toBeInstanceOf(Date);
    });
  });

  describe('fromMe — messages sent from another linked device', () => {
    it('writes an outgoing message and updates the conversation tail to direction=out', async () => {
      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          whatsappMessageId: 'WA-FROM-PHONE-001',
          text: 'Confirmando seu pedido!',
        }),
        'primary',
      );

      expect(result.status).toBe('inserted');

      // Conversation tail reflects an outgoing message.
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      expect(conv?.lastMessageDirection).toBe('out');
      expect(conv?.lastMessagePreview).toContain('Confirmando');
      expect(conv?.lastMessageAt).toBeInstanceOf(Date);

      // Message doc has direction=out and status=sent.
      expect(state.messages.size).toBe(1);
      const [msgDoc] = [...state.messages.values()];
      expect(msgDoc.direction).toBe('out');
      expect(msgDoc.status).toBe('sent');
      expect(msgDoc.conversationId).toBe('5511999999999');
      expect(msgDoc.whatsappMessageId).toBe('WA-FROM-PHONE-001');
      // authorUserId left undefined — we don't know which device sent it.
      expect(msgDoc.authorUserId).toBeUndefined();
    });

    it('does NOT increment unreadCount on existing conversation', async () => {
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        unreadCount: 5,
      });

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({ fromMe: true, whatsappMessageId: 'WA-FROM-PHONE-002' }),
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      // Unread count untouched — the user pre-read what they sent themselves.
      expect(conv?.unreadCount).toBe(5);
    });

    it('initializes unreadCount=0 when fromMe creates a brand-new conversation', async () => {
      // User starts a fresh chat from their phone — no prior conversation
      // doc exists in the admin inbox.
      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          from: '5511777777777',
          whatsappMessageId: 'WA-NEW-CHAT-001',
          text: 'Oi! Tudo bem?',
        }),
        'primary',
      );

      expect(result.status).toBe('inserted');
      const conv = state.conversations.get('5511777777777');
      expect(conv).toBeDefined();
      expect(conv?.phone).toBe('5511777777777');
      expect(conv?.unreadCount).toBe(0);
      expect(conv?.lastMessageDirection).toBe('out');
      expect(conv?.lastMessagePreview).toContain('Oi');
    });

    it('does NOT update whatsappName on existing conversation (pushName is OUR name on fromMe)', async () => {
      state.conversations.set('5511999999999', {
        id: '5511999999999',
        phone: '5511999999999',
        whatsappName: 'Maria (real contact name)',
        unreadCount: 0,
      });

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          whatsappMessageId: 'WA-FROM-PHONE-003',
          // pushName here would be the user's own display name (e.g.,
          // "Momento Cake Admin"), NOT the contact's. Must be ignored.
          pushName: 'Momento Cake',
        }),
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.whatsappName).toBe('Maria (real contact name)');
    });

    it('does NOT set whatsappName when fromMe creates a new conversation', async () => {
      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          from: '5511666666666',
          whatsappMessageId: 'WA-NEW-NO-NAME-001',
          pushName: 'Momento Cake', // our own name, must not stick
        }),
        'primary',
      );

      const conv = state.conversations.get('5511666666666');
      expect(conv).toBeDefined();
      expect(conv?.whatsappName).toBeUndefined();
    });

    it('dedupes by whatsappMessageId — outbound.ts already wrote this message', async () => {
      // Simulate the case where the admin sent through the outbox path:
      // outbound.ts has already written a message doc with the same ID.
      state.messages.set('msg_existing', {
        id: 'msg_existing',
        whatsappMessageId: 'WA-FROM-OUR-OUTBOX-123',
        conversationId: '5511999999999',
        direction: 'out',
        status: 'sent',
      });

      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          whatsappMessageId: 'WA-FROM-OUR-OUTBOX-123',
        }),
        'primary',
      );

      expect(result.status).toBe('duplicate');
      // No duplicate message doc, no conversation mutation from this replay.
      expect(state.messages.size).toBe(1);
      expect(state.conversations.size).toBe(0);
    });

    it('drops fromMe messages from group JIDs (current behavior — phone fails normalization)', async () => {
      // Group JIDs come through as `<group-id>@g.us`. The index.ts adapter
      // strips them via jidToPhone, leaving something like `1234-5678` which
      // fails BR phone normalization. The handler returns 'invalid' and
      // writes nothing. fromMe-in-a-group would need a different conversation
      // model anyway — out of scope for this fix.
      const result = await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          // What jidToPhone('1203630-987654@g.us') returns: '1203630-987654'.
          from: '1203630-987654',
          whatsappMessageId: 'WA-GROUP-FROMME-001',
        }),
        'primary',
      );

      expect(result.status).toBe('invalid');
      expect(state.conversations.size).toBe(0);
      expect(state.messages.size).toBe(0);
    });

    it('still fires profile-photo fetch for the contact regardless of fromMe', async () => {
      const profilePictureUrl = vi
        .fn<(jid: string, type: 'image' | 'preview') => Promise<string | undefined>>()
        .mockResolvedValue('https://pps.whatsapp.net/v/contact-photo');
      const sock = { profilePictureUrl };

      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          whatsappMessageId: 'WA-FROMME-PHOTO-001',
        }),
        'primary',
        sock,
      );

      // remoteJid = contact's JID (NOT ours) for both fromMe and !fromMe in
      // 1:1, so the photo fetch targets the contact correctly.
      expect(profilePictureUrl).toHaveBeenCalledWith('5511999999999@s.whatsapp.net', 'image');
      const conv = state.conversations.get('5511999999999');
      expect(conv?.profilePictureUrl).toBe('https://pps.whatsapp.net/v/contact-photo');
    });

    it('keeps inbound (!fromMe) behavior unchanged', async () => {
      // Regression guard: explicit fromMe=false (or absent) takes the original
      // path with unread bump and pushName adoption.
      await handleIncomingMessage(
        db as unknown as FirebaseFirestore.Firestore,
        makeMsg({ fromMe: false, pushName: 'Maria Silva' }),
        'primary',
      );

      const conv = state.conversations.get('5511999999999');
      expect(conv?.lastMessageDirection).toBe('in');
      expect(conv?.unreadCount).toBe(1);
      expect(conv?.whatsappName).toBe('Maria Silva');

      const [msgDoc] = [...state.messages.values()];
      expect(msgDoc.direction).toBe('in');
      // No status field on inbound — that's set by delivery/read receipts later.
      expect(msgDoc.status).toBeUndefined();
    });
  });

  describe('undefined-field rejection (regression guard for production bug)', () => {
    /**
     * Real Firestore Admin SDK rejects writes that contain `undefined` values
     * unless `ignoreUndefinedProperties: true` is set on the Firestore instance.
     * The production fix is in `src/firestore.ts` (a single global flag).
     *
     * To prove the handler relies on that flag — and would have crashed
     * without it — these tests wrap our mock db in a strict shim that mirrors
     * production behavior: any `undefined` field reaching `set()` / `update()`
     * / `add()` throws the exact error message Firestore Admin emits. We then
     * apply a `stripUndefined` proxy on top, simulating what
     * `ignoreUndefinedProperties: true` does inside the real SDK before the
     * write hits the wire. With the proxy in place, the handler succeeds for
     * media-only / fromMe-without-text / decryption-failed messages. Without
     * the proxy, the same call throws — proving the bug is real and the fix
     * is necessary.
     */

    function deepHasUndefined(value: unknown): boolean {
      if (value === undefined) return true;
      if (value === null) return false;
      if (Array.isArray(value)) return value.some(deepHasUndefined);
      if (typeof value === 'object') {
        for (const v of Object.values(value as Record<string, unknown>)) {
          if (deepHasUndefined(v)) return true;
        }
      }
      return false;
    }

    function stripUndefined<T>(value: T): T {
      if (Array.isArray(value)) {
        return value.map(stripUndefined) as unknown as T;
      }
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          if (v === undefined) continue;
          out[k] = stripUndefined(v);
        }
        return out as unknown as T;
      }
      return value;
    }

    /**
     * Wrap the existing buildDb with a strict shim. By default it throws on
     * any undefined like real Firestore Admin. When `ignoreUndefined: true`,
     * it transparently strips undefined fields first — what the SDK does when
     * `ignoreUndefinedProperties: true` is enabled.
     */
    function buildStrictDb(s: MockState, ignoreUndefined: boolean) {
      const inner = buildDb(s);
      const guard = (data: unknown) => {
        const sanitized = ignoreUndefined ? stripUndefined(data) : data;
        if (deepHasUndefined(sanitized)) {
          throw new Error(
            'Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "text"). If you want to ignore undefined values, enable `ignoreUndefinedProperties`.',
          );
        }
        return sanitized;
      };
      return {
        collection: vi.fn((name: string) => {
          const coll = inner.collection(name);
          if (name === 'whatsapp_messages') {
            const original = coll as { add: (d: Record<string, unknown>) => Promise<{ id: string }>; where: typeof coll.where };
            return {
              ...coll,
              add: vi.fn(async (data: Record<string, unknown>) =>
                original.add(guard(data) as Record<string, unknown>),
              ),
            };
          }
          if (name === 'whatsapp_conversations') {
            return {
              doc: vi.fn((id: string) => {
                const ref = (coll as { doc: (i: string) => { get: () => Promise<unknown>; set: (d: Record<string, unknown>) => Promise<void>; update: (d: Record<string, unknown>) => Promise<void> } }).doc(id);
                return {
                  ...ref,
                  set: vi.fn(async (data: Record<string, unknown>) =>
                    ref.set(guard(data) as Record<string, unknown>),
                  ),
                  update: vi.fn(async (data: Record<string, unknown>) =>
                    ref.update(guard(data) as Record<string, unknown>),
                  ),
                };
              }),
            };
          }
          return coll;
        }),
      };
    }

    it('writes a fromMe message doc successfully when text is undefined (media-only / decryption-failed)', async () => {
      // Production scenario: a fromMe replay arrives from a linked device for
      // a media-only message. Baileys' `msg.message.conversation` is
      // undefined; the adapter passes `text: undefined` through. With the
      // global `ignoreUndefinedProperties: true`, Firestore Admin strips the
      // undefined before the write — handler must succeed and the doc must
      // land WITHOUT a `text` field.
      const strictDb = buildStrictDb(state, /* ignoreUndefined */ true);

      const result = await handleIncomingMessage(
        strictDb as unknown as FirebaseFirestore.Firestore,
        makeMsg({
          fromMe: true,
          whatsappMessageId: 'WA-MEDIA-FROMME-001',
          type: 'image',
          text: undefined,
          pushName: undefined,
        }),
        'primary',
      );

      expect(result.status).toBe('inserted');
      const conv = state.conversations.get('5511999999999');
      expect(conv).toBeDefined();
      expect(conv?.lastMessageDirection).toBe('out');
      expect(conv?.lastMessagePreview).toBe('[imagem]');
      // `whatsappName` must not be on the doc (we don't adopt pushName on
      // fromMe, and undefined gets stripped on inbound paths anyway).
      expect(Object.prototype.hasOwnProperty.call(conv ?? {}, 'whatsappName')).toBe(false);

      // Message doc landed and has no `text` field (it was stripped).
      expect(state.messages.size).toBe(1);
      const [msgDoc] = [...state.messages.values()];
      expect(msgDoc.direction).toBe('out');
      expect(msgDoc.status).toBe('sent');
      expect(Object.prototype.hasOwnProperty.call(msgDoc, 'text')).toBe(false);
    });

    it('throws the production error today WITHOUT the ignoreUndefinedProperties strip (proves the bug)', async () => {
      // Same scenario, but the strict mock does NOT simulate the global flag.
      // This is what production was doing before this fix landed: the
      // handler would build a doc with `text: undefined`, the Admin SDK
      // would reject the entire write, and `failed to handle incoming
      // message` would land in the error logs.
      const strictDb = buildStrictDb(state, /* ignoreUndefined */ false);

      await expect(
        handleIncomingMessage(
          strictDb as unknown as FirebaseFirestore.Firestore,
          makeMsg({
            fromMe: true,
            whatsappMessageId: 'WA-MEDIA-FROMME-002',
            type: 'image',
            text: undefined,
          }),
          'primary',
        ),
      ).rejects.toThrow(/Cannot use "undefined" as a Firestore value/);
    });

    it('still writes an inbound text message with text present (regression guard)', async () => {
      // The fix must not break the happy path: a normal incoming text message
      // still writes `text` correctly through the strict (strip-enabled) mock.
      const strictDb = buildStrictDb(state, /* ignoreUndefined */ true);

      const result = await handleIncomingMessage(
        strictDb as unknown as FirebaseFirestore.Firestore,
        makeMsg({ text: 'Olá, gostaria de um bolo' }),
        'primary',
      );

      expect(result.status).toBe('inserted');
      const [msgDoc] = [...state.messages.values()];
      expect(msgDoc.text).toBe('Olá, gostaria de um bolo');
      expect(msgDoc.direction).toBe('in');
    });
  });
});
