/**
 * The implementation of file-based auth lives in Baileys
 * (`useMultiFileAuthState`) — that's the whole point of this refactor — so
 * the tests here cover only the thin wrapper: env-var path resolution and
 * the `reset()` helper.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { loadAuthState, resolveAuthDir } from '../auth-state.js';

describe('resolveAuthDir', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.BAILEYS_AUTH_DIR;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.BAILEYS_AUTH_DIR;
    else process.env.BAILEYS_AUTH_DIR = originalEnv;
  });

  it('returns the production default when BAILEYS_AUTH_DIR is unset', () => {
    delete process.env.BAILEYS_AUTH_DIR;
    expect(resolveAuthDir()).toBe(resolve('/app/auth_info_baileys'));
  });

  it('returns the production default when BAILEYS_AUTH_DIR is empty', () => {
    process.env.BAILEYS_AUTH_DIR = '';
    expect(resolveAuthDir()).toBe(resolve('/app/auth_info_baileys'));
  });

  it('returns BAILEYS_AUTH_DIR (resolved to absolute) when set', () => {
    process.env.BAILEYS_AUTH_DIR = '/tmp/custom-auth';
    expect(resolveAuthDir()).toBe(resolve('/tmp/custom-auth'));
  });
});

describe('loadAuthState', () => {
  let tmpDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    originalEnv = process.env.BAILEYS_AUTH_DIR;
    tmpDir = await mkdtemp(join(tmpdir(), 'baileys-auth-test-'));
    process.env.BAILEYS_AUTH_DIR = tmpDir;
  });

  afterEach(async () => {
    if (originalEnv === undefined) delete process.env.BAILEYS_AUTH_DIR;
    else process.env.BAILEYS_AUTH_DIR = originalEnv;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('honors BAILEYS_AUTH_DIR and returns a usable AuthBundle', async () => {
    const bundle = await loadAuthState();
    expect(bundle.authDir).toBe(resolve(tmpDir));
    expect(typeof bundle.saveCreds).toBe('function');
    expect(typeof bundle.reset).toBe('function');
    // Baileys initializes creds on first call; shape includes a few standard fields.
    expect(typeof bundle.state.creds).toBe('object');
    expect(bundle.state.creds).not.toBeNull();
    // keys store should expose Baileys' SignalKeyStore surface.
    expect(typeof bundle.state.keys.get).toBe('function');
    expect(typeof bundle.state.keys.set).toBe('function');
  });

  it('persists creds across reloads (saveCreds writes a file the next load reads back)', async () => {
    const first = await loadAuthState();
    // Mutate something serializable on the creds and save.
    first.state.creds.advSecretKey = 'secret-XYZ';
    await first.saveCreds();

    const second = await loadAuthState();
    expect(second.state.creds.advSecretKey).toBe('secret-XYZ');
  });

  it('reset() removes the auth folder so the next load starts fresh', async () => {
    const bundle = await loadAuthState();
    // Drop a sentinel file so we can be sure the folder existed and was wiped.
    await writeFile(join(bundle.authDir, 'sentinel.txt'), 'x');
    await expect(access(bundle.authDir)).resolves.toBeUndefined();

    await bundle.reset();

    await expect(access(bundle.authDir)).rejects.toThrow();
  });

  it('reset() is idempotent (does not throw if the folder is already gone)', async () => {
    const bundle = await loadAuthState();
    await bundle.reset();
    // Second call should silently succeed thanks to `force: true`.
    await expect(bundle.reset()).resolves.toBeUndefined();
  });
});
