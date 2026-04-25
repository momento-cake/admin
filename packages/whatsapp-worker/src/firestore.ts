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
  return dbInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    throw new Error('Firestore not initialized — call initFirestore() first.');
  }
  return dbInstance;
}
