/**
 * Unit tests for the WhatsApp client SDK in src/lib/whatsapp.ts.
 *
 * The SDK is a thin wrapper over Firestore client APIs. Tests verify:
 *  - Correct collection/doc paths and query shape
 *  - onSnapshot subscriptions wire up and return an unsubscribe function
 *  - Reads return well-shaped domain objects (id included)
 *  - Filter / pagination options translate into the right firestore primitives
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  fetchConversations,
  fetchConversation,
  fetchMessages,
  subscribeToConversations,
  subscribeToMessages,
  subscribeToStatus,
  getStatus,
} from '@/lib/whatsapp';

// onSnapshot is not in the global setup mock; declare it here.
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn((...args) => ({ __query: args })),
    where: vi.fn((...args) => ({ __where: args })),
    orderBy: vi.fn((...args) => ({ __orderBy: args })),
    limit: vi.fn((n) => ({ __limit: n })),
    onSnapshot: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })),
      fromDate: vi.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
      fromMillis: vi.fn((m: number) => ({ seconds: Math.floor(m / 1000), nanoseconds: 0 })),
    },
  };
});

vi.mock('@/lib/firebase', () => ({ db: {} }));

function snapshotDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    exists: () => true,
  };
}

function ts(seconds: number) {
  return { seconds, nanoseconds: 0 } as unknown as Timestamp;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// fetchConversations
// ---------------------------------------------------------------------------

describe('fetchConversations', () => {
  it('returns conversations ordered by lastMessageAt desc', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        snapshotDoc('5511999999999', {
          phone: '5511999999999',
          phoneRaw: '5511999999999@s.whatsapp.net',
          lastMessageAt: ts(200),
          lastMessagePreview: 'oi',
          lastMessageDirection: 'in',
          unreadCount: 1,
          createdAt: ts(100),
          updatedAt: ts(200),
        }),
      ],
    });

    const result = await fetchConversations();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5511999999999');
    expect(result[0].phone).toBe('5511999999999');
    expect(orderBy).toHaveBeenCalledWith('lastMessageAt', 'desc');
  });

  it('applies clienteId filter via where', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });
    await fetchConversations({ clienteId: 'client-1' });
    expect(where).toHaveBeenCalledWith('clienteId', '==', 'client-1');
  });

  it('applies a limit option', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });
    await fetchConversations({ limit: 25 });
    expect(firestoreLimit).toHaveBeenCalledWith(25);
  });

  it('filters by clienteNome substring case-insensitively when search is given', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        snapshotDoc('a', {
          phone: '551111',
          phoneRaw: '551111',
          clienteNome: 'Maria Silva',
          lastMessageAt: ts(1),
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
          createdAt: ts(1),
          updatedAt: ts(1),
        }),
        snapshotDoc('b', {
          phone: '5522222',
          phoneRaw: '5522222',
          clienteNome: 'João',
          lastMessageAt: ts(1),
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
          createdAt: ts(1),
          updatedAt: ts(1),
        }),
      ],
    });

    const result = await fetchConversations({ search: 'maria' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('search also matches by phone substring', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        snapshotDoc('a', {
          phone: '5511999999999',
          phoneRaw: '5511999999999',
          lastMessageAt: ts(1),
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
          createdAt: ts(1),
          updatedAt: ts(1),
        }),
        snapshotDoc('b', {
          phone: '5522777777777',
          phoneRaw: '5522777777777',
          lastMessageAt: ts(1),
          lastMessagePreview: '',
          lastMessageDirection: 'in',
          unreadCount: 0,
          createdAt: ts(1),
          updatedAt: ts(1),
        }),
      ],
    });

    const result = await fetchConversations({ search: '99999' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array when there are no conversations', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });
    const result = await fetchConversations();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchConversation
// ---------------------------------------------------------------------------

describe('fetchConversation', () => {
  it('returns the conversation when it exists', async () => {
    (getDoc as Mock).mockResolvedValueOnce({
      id: '5511999999999',
      exists: () => true,
      data: () => ({
        phone: '5511999999999',
        phoneRaw: '5511999999999',
        lastMessageAt: ts(1),
        lastMessagePreview: '',
        lastMessageDirection: 'in',
        unreadCount: 0,
        createdAt: ts(1),
        updatedAt: ts(1),
      }),
    });

    const result = await fetchConversation('5511999999999');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('5511999999999');
  });

  it('returns null when the doc does not exist', async () => {
    (getDoc as Mock).mockResolvedValueOnce({ exists: () => false });
    const result = await fetchConversation('missing');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchMessages
// ---------------------------------------------------------------------------

describe('fetchMessages', () => {
  it('queries by conversationId ordered by timestamp asc', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        snapshotDoc('m1', {
          conversationId: '5511999999999',
          whatsappMessageId: 'wa-1',
          direction: 'in',
          type: 'text',
          text: 'oi',
          timestamp: ts(1),
          createdAt: ts(1),
        }),
      ],
    });

    const result = await fetchMessages('5511999999999');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
    expect(where).toHaveBeenCalledWith('conversationId', '==', '5511999999999');
    expect(orderBy).toHaveBeenCalledWith('timestamp', 'asc');
  });

  it('honors a custom limit', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });
    await fetchMessages('c-1', { limit: 50 });
    expect(firestoreLimit).toHaveBeenCalledWith(50);
  });

  it('applies a "before" cursor via where on timestamp', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });
    const before = ts(1234);
    await fetchMessages('c-1', { before });
    // Either ('timestamp', '<', before) — exact operator allowed to be < or <=
    const calls = (where as Mock).mock.calls;
    const hasBefore = calls.some(([field, op]) => field === 'timestamp' && (op === '<' || op === '<='));
    expect(hasBefore).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// subscribeToConversations
// ---------------------------------------------------------------------------

describe('subscribeToConversations', () => {
  it('subscribes via onSnapshot and forwards mapped conversations to the callback', () => {
    const unsubscribeFn = vi.fn();
    let observerCallback: ((snap: unknown) => void) | null = null;

    (onSnapshot as Mock).mockImplementationOnce((_q: unknown, cb: any) => {
      observerCallback = cb;
      return unsubscribeFn;
    });

    const callback = vi.fn();
    const unsub = subscribeToConversations(callback);

    // Now simulate a snapshot
    observerCallback!({
      docs: [
        snapshotDoc('c1', {
          phone: '551111',
          phoneRaw: '551111',
          lastMessageAt: ts(1),
          lastMessagePreview: 'a',
          lastMessageDirection: 'in',
          unreadCount: 0,
          createdAt: ts(1),
          updatedAt: ts(1),
        }),
      ],
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toHaveLength(1);
    expect(callback.mock.calls[0][0][0].id).toBe('c1');

    // Unsubscribe is wired through
    unsub();
    expect(unsubscribeFn).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// subscribeToMessages
// ---------------------------------------------------------------------------

describe('subscribeToMessages', () => {
  it('subscribes to messages of a conversation and forwards to callback', () => {
    const unsubscribeFn = vi.fn();
    let observerCallback: ((snap: unknown) => void) | null = null;

    (onSnapshot as Mock).mockImplementationOnce((_q: unknown, cb: any) => {
      observerCallback = cb;
      return unsubscribeFn;
    });

    const callback = vi.fn();
    const unsub = subscribeToMessages('5511999999999', callback);

    observerCallback!({
      docs: [
        snapshotDoc('m1', {
          conversationId: '5511999999999',
          whatsappMessageId: 'wa-1',
          direction: 'in',
          type: 'text',
          text: 'oi',
          timestamp: ts(1),
          createdAt: ts(1),
        }),
      ],
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0][0].id).toBe('m1');

    unsub();
    expect(unsubscribeFn).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith('conversationId', '==', '5511999999999');
  });
});

// ---------------------------------------------------------------------------
// subscribeToStatus / getStatus
// ---------------------------------------------------------------------------

describe('subscribeToStatus', () => {
  it('subscribes to whatsapp_status/primary doc', () => {
    const unsubscribeFn = vi.fn();
    let observerCallback: ((snap: unknown) => void) | null = null;

    (onSnapshot as Mock).mockImplementationOnce((_ref: unknown, cb: any) => {
      observerCallback = cb;
      return unsubscribeFn;
    });

    const callback = vi.fn();
    const unsub = subscribeToStatus(callback);

    // Simulate a doc snapshot
    observerCallback!({
      id: 'primary',
      exists: () => true,
      data: () => ({
        instanceId: 'primary',
        state: 'connected',
        updatedAt: ts(1),
      }),
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]?.state).toBe('connected');

    unsub();
    expect(unsubscribeFn).toHaveBeenCalled();
    expect(doc).toHaveBeenCalledWith({}, 'whatsapp_status', 'primary');
  });

  it('forwards null when the status doc does not exist', () => {
    let observerCallback: ((snap: unknown) => void) | null = null;
    (onSnapshot as Mock).mockImplementationOnce((_ref: unknown, cb: any) => {
      observerCallback = cb;
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeToStatus(callback);
    observerCallback!({ exists: () => false });
    expect(callback).toHaveBeenCalledWith(null);
  });
});

describe('getStatus', () => {
  it('returns the parsed status doc when it exists', async () => {
    (getDoc as Mock).mockResolvedValueOnce({
      id: 'primary',
      exists: () => true,
      data: () => ({
        instanceId: 'primary',
        state: 'connected',
        updatedAt: ts(1),
      }),
    });

    const result = await getStatus();
    expect(result).not.toBeNull();
    expect(result!.state).toBe('connected');
  });

  it('returns null when the doc does not exist', async () => {
    (getDoc as Mock).mockResolvedValueOnce({ exists: () => false });
    const result = await getStatus();
    expect(result).toBeNull();
  });
});
