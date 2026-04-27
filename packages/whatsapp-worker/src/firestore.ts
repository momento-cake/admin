/**
 * Firestore initialization for the worker.
 *
 * Uses `firebase-admin` with Application Default Credentials
 * (`GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service-account JSON).
 *
 * Project ID is read from `FIREBASE_PROJECT_ID` for clarity, but the SDK can
 * also pick it up from the service-account file or `GCLOUD_PROJECT`.
 */

import admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

let dbInstance: Firestore | null = null;

export function initFirestore(): Firestore {
  if (dbInstance) return dbInstance;

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  dbInstance = admin.firestore();
  // Strip undefined fields silently instead of throwing. Required because
  // inbound.ts builds message docs with `text: msg.text`, which is undefined
  // for media-only messages, fromMe replays without bodies, and
  // failed-decryption events. Without this flag the entire write rejects with
  // "Cannot use undefined as a Firestore value (found in field text)" — see
  // https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore.firestoresettings.
  dbInstance.settings({ ignoreUndefinedProperties: true });
  return dbInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    throw new Error('Firestore not initialized — call initFirestore() first.');
  }
  return dbInstance;
}
