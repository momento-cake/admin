/**
 * Thin wrapper around Baileys' built-in `useMultiFileAuthState`.
 *
 * Why a wrapper at all?
 *  - Centralizes the auth-folder path resolution (env var + sensible default)
 *    so the worker entrypoint and tests share one source of truth.
 *  - Adds a `reset()` helper that wipes the folder. We call this on
 *    `DisconnectReason.loggedOut` so the next worker start emits a fresh QR
 *    instead of trying to reuse a now-invalid session.
 *
 * Why not our own Firestore-backed adapter? We had one (this file's previous
 * incarnation). It produced subtle libsignal state inconsistencies — visible
 * as `MessageCounterError`, `PreKey` and `SessionError` failures decrypting
 * fromMe messages from other linked devices. Baileys' maintainers
 * specifically warn against custom auth adapters in production; the
 * file-based path is the well-trodden one.
 *
 * Persistence: the auth folder lives outside the worker's working tree
 * (default `/app/auth_info_baileys`) and is mounted from the host so the
 * pairing survives redeploys. Path is configurable via `BAILEYS_AUTH_DIR`.
 */

import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import type { AuthenticationState } from '@whiskeysockets/baileys';

const DEFAULT_AUTH_DIR = '/app/auth_info_baileys';

export interface AuthBundle {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  /** Absolute path to the auth folder Baileys is reading/writing. */
  authDir: string;
  /**
   * Recursively removes the auth folder so the next `loadAuthState()` call
   * (typically at next worker start) returns a freshly-initialized state and
   * Baileys re-emits a QR for pairing.
   */
  reset: () => Promise<void>;
}

/**
 * Resolve the auth folder from `BAILEYS_AUTH_DIR` (falling back to the
 * production default), then hand off to Baileys' `useMultiFileAuthState`.
 *
 * The folder is created on-demand by `useMultiFileAuthState` if it doesn't
 * exist, so callers don't need to pre-create it.
 */
export async function loadAuthState(): Promise<AuthBundle> {
  const authDir = resolveAuthDir();
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  return {
    state,
    saveCreds,
    authDir,
    reset: async () => {
      await rm(authDir, { recursive: true, force: true });
    },
  };
}

/**
 * Exposed for tests — production callers should use `loadAuthState()`.
 */
export function resolveAuthDir(): string {
  const fromEnv = process.env.BAILEYS_AUTH_DIR;
  return resolve(fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_AUTH_DIR);
}
