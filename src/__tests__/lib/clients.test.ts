/**
 * Unit tests for findClientByPhone in src/lib/clients.ts.
 *
 * Phone matching has to tolerate the messy reality of stored phones:
 * - top-level Client.phone may be formatted any way
 * - contactMethods may carry a phone or whatsapp value
 * - the same phone may live on multiple active clients
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getDocs, Timestamp } from 'firebase/firestore';
import { findClientByPhone } from '@/lib/clients';

vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({ db: {} }));

function makeDoc(id: string, data: Record<string, unknown>) {
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

describe('findClientByPhone', () => {
  it('returns null when phone cannot be normalized', async () => {
    const result = await findClientByPhone('not-a-phone');
    expect(result).toBeNull();
    // No Firestore call should be made for invalid input.
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('returns null for empty string', async () => {
    const result = await findClientByPhone('');
    expect(result).toBeNull();
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('matches client by top-level phone field (formatted)', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'Maria',
          phone: '(11) 99999-9999',
          contactMethods: [],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('11999999999');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('c1');
  });

  it('matches client by contactMethods entry of type "phone"', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'João',
          contactMethods: [
            { id: 'cm-1', type: 'phone', value: '+55 11 98888-8888', isPrimary: true },
          ],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('5511988888888');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('c1');
  });

  it('matches client by contactMethods entry of type "whatsapp"', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'Ana',
          contactMethods: [
            { id: 'cm-1', type: 'whatsapp', value: '11977777777', isPrimary: true },
          ],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('+55 11 97777-7777');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('c1');
  });

  it('ignores contactMethods of unrelated types (email, instagram)', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'Ana',
          contactMethods: [
            // value happens to look like a phone but the type is email; should NOT match
            { id: 'cm-1', type: 'email', value: '5511966666666', isPrimary: false },
            { id: 'cm-2', type: 'instagram', value: '11966666666', isPrimary: false },
          ],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('5511966666666');
    expect(result).toBeNull();
  });

  it('returns null when no client matches', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'Outro',
          phone: '11955555555',
          contactMethods: [],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('5511944444444');
    expect(result).toBeNull();
  });

  it('returns null when there are no clients at all', async () => {
    (getDocs as Mock).mockResolvedValueOnce({ docs: [] });

    const result = await findClientByPhone('5511944444444');
    expect(result).toBeNull();
  });

  it('returns the most recently updated client when multiple match', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('older', {
          type: 'person',
          name: 'Older',
          phone: '5511933333333',
          contactMethods: [],
          isActive: true,
          createdAt: ts(100),
          updatedAt: ts(100),
        }),
        makeDoc('newer', {
          type: 'person',
          name: 'Newer',
          phone: '5511933333333',
          contactMethods: [],
          isActive: true,
          createdAt: ts(50),
          updatedAt: ts(500),
        }),
        makeDoc('mid', {
          type: 'person',
          name: 'Mid',
          phone: '5511933333333',
          contactMethods: [],
          isActive: true,
          createdAt: ts(200),
          updatedAt: ts(300),
        }),
      ],
    });

    const result = await findClientByPhone('5511933333333');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('newer');
  });

  it('falls back to createdAt when updatedAt is missing for tie-breaking', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('old-no-updated', {
          type: 'person',
          name: 'A',
          phone: '5511922222222',
          contactMethods: [],
          isActive: true,
          createdAt: ts(100),
        }),
        makeDoc('new-no-updated', {
          type: 'person',
          name: 'B',
          phone: '5511922222222',
          contactMethods: [],
          isActive: true,
          createdAt: ts(900),
        }),
      ],
    });

    const result = await findClientByPhone('5511922222222');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('new-no-updated');
  });

  it('matches when target has +55 prefix and stored value does not', async () => {
    (getDocs as Mock).mockResolvedValueOnce({
      docs: [
        makeDoc('c1', {
          type: 'person',
          name: 'X',
          phone: '11911111111',
          contactMethods: [],
          isActive: true,
          createdAt: ts(1),
        }),
      ],
    });

    const result = await findClientByPhone('+5511911111111');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('c1');
  });
});
