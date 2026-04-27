import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPaymentProvider,
  resetPaymentProviderForTesting,
} from '@/lib/payments/registry';

// The Asaas provider factory will throw on import if its API client is
// instantiated without an API key, so the registry test seeds the key first
// and then mutates the webhook token to exercise the production guard.

describe('getPaymentProvider — webhookToken production guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPaymentProviderForTesting();
    process.env.ASAAS_API_KEY = 'test-key';
    process.env.PAYMENT_PROVIDER = 'asaas';
    delete process.env.ASAAS_WEBHOOK_TOKEN;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    resetPaymentProviderForTesting();
    process.env = { ...originalEnv };
  });

  it('throws in production when ASAAS_WEBHOOK_TOKEN is missing', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(() => getPaymentProvider()).toThrow(/ASAAS_WEBHOOK_TOKEN/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('throws in production when ASAAS_WEBHOOK_TOKEN is empty', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', '');
    try {
      expect(() => getPaymentProvider()).toThrow(/ASAAS_WEBHOOK_TOKEN/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns a provider in development when ASAAS_WEBHOOK_TOKEN is missing', () => {
    vi.stubEnv('NODE_ENV', 'development');
    try {
      const provider = getPaymentProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('asaas');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns a provider in test when ASAAS_WEBHOOK_TOKEN is missing', () => {
    vi.stubEnv('NODE_ENV', 'test');
    try {
      const provider = getPaymentProvider();
      expect(provider).toBeDefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns a provider in production when ASAAS_WEBHOOK_TOKEN is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ASAAS_WEBHOOK_TOKEN', 'production-token');
    try {
      const provider = getPaymentProvider();
      expect(provider).toBeDefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
