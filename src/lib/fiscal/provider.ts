import type {
  FiscalCancelInput,
  FiscalCancelResult,
  FiscalEmitInput,
  FiscalEmitResult,
  FiscalProviderName,
  FiscalQueryResult,
} from './types';

/**
 * Provider-agnostic fiscal emission interface. One `emit` handles both models
 * (the model is carried on the input), so the online (NF-e 55) and in-store
 * (NFC-e 65) flows share a single code path.
 *
 * Mirrors the `PaymentProvider` shape in `src/lib/payments/provider.ts`.
 * `cancelNf` / `queryNf` are declared from day one so the API surface and UI
 * wiring stay stable; the initial NFeWizard adapter may throw
 * `FiscalProviderError('nfewizard', 'not_implemented', ...)` for them.
 */
export interface FiscalProvider {
  readonly name: FiscalProviderName;

  emit(input: FiscalEmitInput): Promise<FiscalEmitResult>;

  cancelNf(input: FiscalCancelInput): Promise<FiscalCancelResult>;

  queryNf(accessKey: string): Promise<FiscalQueryResult>;
}
