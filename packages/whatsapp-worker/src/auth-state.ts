/**
 * Firestore-backed adapter for Baileys' multi-device auth state.
 *
 * Mirrors the contract of Baileys' built-in `useMultiFileAuthState`, which
 * stores `creds.json` and per-key files on disk. We persist to Firestore so
 * the worker can be redeployed without re-pairing.
 *
 * Layout:
 *   whatsapp_sessions/{instanceId}                 -> { creds: { json: <BufferJSON-encoded creds> } }
 *   whatsapp_sessions/{instanceId}/keys/{type}-{id} -> { json: <BufferJSON-encoded value> }
 *
 * Buffers in Baileys' state are serialized via Baileys' `BufferJSON.replacer`
 * / `BufferJSON.reviver` which round-trip Buffer instances through a tagged
 * `{ type: 'Buffer', data: 'base64...' }` shape.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataSet,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';

const SESSIONS_COLLECTION = 'whatsapp_sessions';

interface StoredJson {
  json: string;
}

function encode(value: unknown): StoredJson {
  return { json: JSON.stringify(value, BufferJSON.replacer) };
}

function decode<T>(stored: StoredJson | undefined): T | null {
  if (!stored?.json) return null;
  return JSON.parse(stored.json, BufferJSON.reviver) as T;
}

export interface FirestoreAuthState {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

export async function createFirestoreAuthState(
  db: Firestore,
  instanceId: string,
): Promise<FirestoreAuthState> {
  const sessionRef = db.collection(SESSIONS_COLLECTION).doc(instanceId);
  const keysRef = sessionRef.collection('keys');

  // Load creds (or initialize new ones).
  let creds: AuthenticationCreds;
  const sessionSnap = await sessionRef.get();
  if (sessionSnap.exists) {
    const stored = sessionSnap.data() as { creds?: StoredJson } | undefined;
    creds = decode<AuthenticationCreds>(stored?.creds) ?? initAuthCreds();
  } else {
    creds = initAuthCreds();
  }

  const keyDocId = (type: string, id: string) => `${type}-${id}`;

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        await Promise.all(
          ids.map(async (id) => {
            const snap = await keysRef.doc(keyDocId(type, id)).get();
            const stored = snap.exists ? (snap.data() as StoredJson) : undefined;
            const value = decode<SignalDataTypeMap[T]>(stored);
            if (value) result[id] = value;
          }),
        );
        return result;
      },
      set: async (data: SignalDataSet): Promise<void> => {
        const tasks: Array<Promise<unknown>> = [];
        for (const type of Object.keys(data) as Array<keyof SignalDataSet>) {
          const byId = data[type];
          if (!byId) continue;
          for (const id of Object.keys(byId)) {
            const value = (byId as Record<string, unknown>)[id];
            const docRef = keysRef.doc(keyDocId(String(type), id));
            if (value === null || value === undefined) {
              tasks.push(docRef.delete().catch(() => undefined));
            } else {
              tasks.push(docRef.set(encode(value)));
            }
          }
        }
        await Promise.all(tasks);
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    await sessionRef.set({ creds: encode(state.creds) }, { merge: true });
  };

  return { state, saveCreds };
}
