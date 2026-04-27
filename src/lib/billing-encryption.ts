/**
 * AES-256-GCM field-level encryption for billing PII (CPF/CNPJ).
 *
 * Why: LGPD recommends encryption at rest for personal documents. Firestore is
 * encrypted at rest by Google, but we add a project-controlled key on top so a
 * Firebase console reader cannot recover plaintext without the application key.
 *
 * Usage:
 *   - Write path: `encryptPii(plaintext)` -> store the returned string.
 *   - Read path: `decryptPii(stored)` -> plaintext. Backward-compatible: a
 *     value that does not carry the version prefix is returned unchanged
 *     (covers any legacy unencrypted rows during migration).
 *
 * Key:
 *   - `BILLING_ENCRYPTION_KEY` env var: 32-byte key, hex (64 chars) or base64.
 *   - In non-production a deterministic fallback key is derived so dev/test
 *     work without configuration. Production REQUIRES the env var to be set.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ENC_PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.BILLING_ENCRYPTION_KEY;
  if (raw) {
    let buf: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      buf = Buffer.from(raw, 'hex');
    } else {
      buf = Buffer.from(raw, 'base64');
    }
    if (buf.length !== 32) {
      throw new Error('BILLING_ENCRYPTION_KEY must decode to 32 bytes (256 bits)');
    }
    cachedKey = buf;
    return buf;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BILLING_ENCRYPTION_KEY is required in production');
  }

  // Dev/test fallback: deterministic key derived from a literal so behavior is
  // reproducible without configuration. Never used in production (guarded above).
  cachedKey = createHash('sha256').update('momentocake-dev-billing-fallback').digest();
  return cachedKey;
}

export function isEncrypted(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function encryptPii(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // idempotent
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', loadKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptPii(stored: string): string {
  if (!stored) return stored;
  if (!isEncrypted(stored)) return stored; // legacy plaintext passthrough
  const blob = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', loadKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Test-only: clear cached key so process.env changes are picked up. */
export function resetBillingEncryptionForTesting(): void {
  cachedKey = null;
}
