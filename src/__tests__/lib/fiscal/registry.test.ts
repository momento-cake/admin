import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FiscalConfig } from '@/lib/fiscal/types';

const loadFiscalConfig = vi.fn();
vi.mock('@/lib/fiscal/config', () => ({
  loadFiscalConfig: () => loadFiscalConfig(),
}));

// The provider factory is stubbed so we can count how often a provider is
// (re)built and confirm caching keys off the config, not the call count.
const createNfeWizardProvider = vi.fn();
vi.mock('@/lib/fiscal/nfewizard', () => ({
  createNfeWizardProvider: (config: FiscalConfig) => createNfeWizardProvider(config),
}));

import { getFiscalProvider, resetFiscalProviderForTesting } from '@/lib/fiscal/registry';

function config(overrides: Partial<FiscalConfig> = {}): FiscalConfig {
  return {
    ambiente: 'homologacao',
    issuer: {
      cnpj: '12345678000199',
      razaoSocial: 'Momento Cake',
      nomeFantasia: 'Momento Cake',
      inscricaoEstadual: '111',
      crt: 1,
      logradouro: 'Rua A',
      numero: '1',
      bairro: 'Centro',
      municipio: 'Sao Paulo',
      codigoMunicipioIbge: '3550308',
      uf: 'SP',
      cep: '01001000',
    },
    taxProfile: {
      cfop: '5102',
      ncm: '19059090',
      unidade: 'UN',
      origem: '0',
      csosn: '102',
      naturezaOperacao: 'Venda',
    },
    serieNfe: 1,
    serieNfce: 1,
    cert: { pfx: Buffer.from('pfx'), password: 'secret' },
    ...overrides,
  };
}

beforeEach(() => {
  resetFiscalProviderForTesting();
  vi.clearAllMocks();
  createNfeWizardProvider.mockImplementation(() => ({ name: 'nfewizard' }));
});

describe('getFiscalProvider', () => {
  it('builds a provider from the loaded config', async () => {
    loadFiscalConfig.mockResolvedValue(config());
    const provider = await getFiscalProvider();
    expect(provider.name).toBe('nfewizard');
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached provider when the config is unchanged', async () => {
    loadFiscalConfig.mockResolvedValue(config());
    const a = await getFiscalProvider();
    const b = await getFiscalProvider();
    expect(a).toBe(b);
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the provider when the config changes (ambiente)', async () => {
    loadFiscalConfig.mockResolvedValueOnce(config({ ambiente: 'homologacao' }));
    await getFiscalProvider();
    loadFiscalConfig.mockResolvedValueOnce(config({ ambiente: 'producao' }));
    await getFiscalProvider();
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(2);
  });

  it('rebuilds when the certificate password changes', async () => {
    loadFiscalConfig.mockResolvedValueOnce(config());
    await getFiscalProvider();
    loadFiscalConfig.mockResolvedValueOnce(
      config({ cert: { pfx: Buffer.from('pfx'), password: 'rotated' } }),
    );
    await getFiscalProvider();
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(2);
  });

  it('rebuilds when a same-length certificate is swapped (content hash)', async () => {
    // Both buffers are 3 bytes — a byteLength key would not detect the swap.
    loadFiscalConfig.mockResolvedValueOnce(
      config({ cert: { pfx: Buffer.from('AAA'), password: 'p' } }),
    );
    await getFiscalProvider();
    loadFiscalConfig.mockResolvedValueOnce(
      config({ cert: { pfx: Buffer.from('BBB'), password: 'p' } }),
    );
    await getFiscalProvider();
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(2);
  });

  it('resetFiscalProviderForTesting forces a rebuild', async () => {
    loadFiscalConfig.mockResolvedValue(config());
    await getFiscalProvider();
    resetFiscalProviderForTesting();
    await getFiscalProvider();
    expect(createNfeWizardProvider).toHaveBeenCalledTimes(2);
  });
});
