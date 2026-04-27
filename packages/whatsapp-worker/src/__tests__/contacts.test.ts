import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleContactsUpsert, pickContactName } from '../contacts.js';
import type { ContactInput } from '../contacts.js';

interface MockState {
  conversations: Map<string, Record<string, unknown>>;
  writeLog: Array<{ kind: string; id: string; data: unknown }>;
}

/**
 * Firestore-like mock supporting only the chains used by handleContactsUpsert:
 *   whatsapp_conversations.doc(id).{get,update}
 */
function buildDb(state: MockState) {
  return {
    collection: vi.fn((name: string) => {
      if (name !== 'whatsapp_conversations') {
        return { doc: vi.fn() };
      }
      return {
        doc: vi.fn((id: string) => ({
          id,
          get: vi.fn(async () => {
            const data = state.conversations.get(id);
            return { exists: data !== undefined, data: () => data, id };
          }),
          update: vi.fn(async (data: Record<string, unknown>) => {
            const existing = state.conversations.get(id) ?? {};
            state.conversations.set(id, { ...existing, ...data });
            state.writeLog.push({ kind: 'update', id, data });
          }),
        })),
      };
    }),
  };
}

describe('pickContactName', () => {
  it('prefers user-saved name over notify and verifiedName', () => {
    expect(
      pickContactName({ name: 'Maria Silva', notify: 'Maria', verifiedName: 'Maria S.' }),
    ).toBe('Maria Silva');
  });

  it('falls back to notify when name is missing', () => {
    expect(pickContactName({ notify: 'Maria', verifiedName: 'Maria S.' })).toBe('Maria');
  });

  it('falls back to verifiedName when name and notify are missing', () => {
    expect(pickContactName({ verifiedName: 'Bakery Co.' })).toBe('Bakery Co.');
  });

  it('returns undefined when all fields are missing', () => {
    expect(pickContactName({})).toBeUndefined();
  });

  it('returns undefined when all fields are empty/whitespace strings', () => {
    expect(pickContactName({ name: '', notify: '   ', verifiedName: '\t' })).toBeUndefined();
  });

  it('trims whitespace from the chosen name', () => {
    expect(pickContactName({ name: '  Maria Silva  ' })).toBe('Maria Silva');
  });

  it('skips empty fields and uses the next non-empty one', () => {
    expect(pickContactName({ name: '', notify: 'Maria' })).toBe('Maria');
  });
});

describe('handleContactsUpsert', () => {
  let state: MockState;
  let db: ReturnType<typeof buildDb>;

  beforeEach(() => {
    state = { conversations: new Map(), writeLog: [] };
    db = buildDb(state);
  });

  it('updates whatsappName on existing conversation when current value is missing', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      // no whatsappName
    });

    const contacts: ContactInput[] = [
      { id: '5511999999999@s.whatsapp.net', name: 'Maria Silva' },
    ];

    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      contacts,
    );

    expect(result.updated).toBe(1);
    expect(result.scanned).toBe(1);
    const conv = state.conversations.get('5511999999999');
    expect(conv?.whatsappName).toBe('Maria Silva');
    expect(conv?.updatedAt).toBeInstanceOf(Date);
  });

  it('updates whatsappName when current value is empty string', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      whatsappName: '',
    });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Maria');
  });

  it('updates whatsappName when current value is whitespace-only', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      whatsappName: '   ',
    });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', notify: 'Maria' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Maria');
  });

  it('does NOT overwrite an existing non-empty whatsappName', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
      whatsappName: 'Existing Name From Inbound',
    });

    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', name: 'Different Name' }],
    );

    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    const conv = state.conversations.get('5511999999999');
    expect(conv?.whatsappName).toBe('Existing Name From Inbound');
  });

  it('does NOT create a conversation when one does not exist (skips silently)', async () => {
    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', name: 'Maria' }],
    );

    expect(result.scanned).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(state.conversations.size).toBe(0);
  });

  it('skips group/broadcast/status JIDs', async () => {
    state.conversations.set('120363012345', {
      id: '120363012345',
      phone: '120363012345',
    });

    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [
        { id: '120363012345@g.us', name: 'Family Group' },
        { id: 'status@broadcast', name: 'Status' },
      ],
    );

    expect(result.scanned).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(2);
    // Conversation untouched.
    expect(state.conversations.get('120363012345')?.whatsappName).toBeUndefined();
  });

  it('skips contacts where no name field has content', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
    });

    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', name: '', notify: '   ' }],
    );

    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('handles @lid JIDs the same as @s.whatsapp.net', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
    });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@lid', name: 'Maria via LID' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Maria via LID');
  });

  it('handles JIDs with :device suffix', async () => {
    state.conversations.set('5511999999999', {
      id: '5511999999999',
      phone: '5511999999999',
    });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999:42@s.whatsapp.net', name: 'Maria' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Maria');
  });

  it('processes multiple contacts in a single batch', async () => {
    state.conversations.set('5511111111111', { id: '5511111111111', phone: '5511111111111' });
    state.conversations.set('5511222222222', { id: '5511222222222', phone: '5511222222222' });
    state.conversations.set('5511333333333', {
      id: '5511333333333',
      phone: '5511333333333',
      whatsappName: 'Already Named',
    });

    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [
        { id: '5511111111111@s.whatsapp.net', name: 'A' },
        { id: '5511222222222@s.whatsapp.net', notify: 'B' },
        { id: '5511333333333@s.whatsapp.net', name: 'Should Not Apply' },
        { id: '5511444444444@s.whatsapp.net', name: 'No Conv Yet' }, // skipped
      ],
    );

    expect(result.scanned).toBe(4);
    expect(result.updated).toBe(2);
    expect(result.skipped).toBe(2);
    expect(state.conversations.get('5511111111111')?.whatsappName).toBe('A');
    expect(state.conversations.get('5511222222222')?.whatsappName).toBe('B');
    expect(state.conversations.get('5511333333333')?.whatsappName).toBe('Already Named');
  });

  it('continues batch when a single contact entry throws', async () => {
    // Build a db that throws on the first doc lookup but succeeds on the second.
    state.conversations.set('5511999999999', { id: '5511999999999', phone: '5511999999999' });
    let callCount = 0;
    const throwingDb = {
      collection: vi.fn(() => ({
        doc: vi.fn((id: string) => {
          callCount += 1;
          if (callCount === 1) {
            return {
              get: vi.fn(async () => {
                throw new Error('simulated firestore failure');
              }),
            };
          }
          return {
            id,
            get: vi.fn(async () => {
              const data = state.conversations.get(id);
              return { exists: data !== undefined, data: () => data, id };
            }),
            update: vi.fn(async (data: Record<string, unknown>) => {
              const existing = state.conversations.get(id) ?? {};
              state.conversations.set(id, { ...existing, ...data });
            }),
          };
        }),
      })),
    };

    const result = await handleContactsUpsert(
      throwingDb as unknown as FirebaseFirestore.Firestore,
      [
        { id: '5511777777777@s.whatsapp.net', name: 'Throws' },
        { id: '5511999999999@s.whatsapp.net', name: 'Recovers' },
      ],
    );

    expect(result.scanned).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Recovers');
  });

  it('handles an empty contact array', async () => {
    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [],
    );
    expect(result).toEqual({ scanned: 0, updated: 0, skipped: 0 });
  });

  it('falls back to notify when name is missing', async () => {
    state.conversations.set('5511999999999', { id: '5511999999999', phone: '5511999999999' });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', notify: 'Self-Reported Name' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Self-Reported Name');
  });

  it('falls back to verifiedName when name and notify are missing', async () => {
    state.conversations.set('5511999999999', { id: '5511999999999', phone: '5511999999999' });

    await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: '5511999999999@s.whatsapp.net', verifiedName: 'Bakery Co.' }],
    );

    expect(state.conversations.get('5511999999999')?.whatsappName).toBe('Bakery Co.');
  });

  it('skips contacts with no id', async () => {
    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ name: 'Orphan' }],
    );

    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('skips contacts whose phone fails normalization', async () => {
    const result = await handleContactsUpsert(
      db as unknown as FirebaseFirestore.Firestore,
      [{ id: 'garbage@s.whatsapp.net', name: 'X' }],
    );

    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(0);
  });
});
