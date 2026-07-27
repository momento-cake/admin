/**
 * Fiscal provider registry. Mirrors `src/lib/payments/registry.ts`, but async:
 * building the provider needs the fiscal config (certificate + settings) which
 * is loaded from Firestore/Storage.
 *
 * The provider is cached and only rebuilt when the config changes — a new
 * ambiente, série, certificate, or tax profile produces a different key, so an
 * admin editing fiscal settings transparently gets a fresh provider.
 */
import { createHash } from 'crypto';
import type { FiscalProvider } from './provider';
import type { FiscalConfig } from './types';
import { loadFiscalConfig } from './config';
import { createNfeWizardProvider } from './nfewizard';

let cached: { key: string; provider: FiscalProvider } | null = null;

/** Fingerprint of the config fields that require rebuilding the provider. */
function configKey(config: FiscalConfig): string {
  return JSON.stringify({
    ambiente: config.ambiente,
    serieNfe: config.serieNfe,
    serieNfce: config.serieNfce,
    cnpj: config.issuer.cnpj,
    crt: config.issuer.crt,
    taxProfile: config.taxProfile,
    cscId: config.csc?.id,
    certPassword: config.cert.password,
    // Hash the certificate bytes so a same-length cert swap (e.g. a renewed A1
    // with an identical file size) still busts the cache.
    certHash: createHash('sha256').update(config.cert.pfx).digest('hex'),
  });
}

export async function getFiscalProvider(): Promise<FiscalProvider> {
  const config = await loadFiscalConfig();
  const key = configKey(config);
  if (cached && cached.key === key) {
    return cached.provider;
  }
  const provider = createNfeWizardProvider(config);
  cached = { key, provider };
  return provider;
}

export function resetFiscalProviderForTesting() {
  cached = null;
}
