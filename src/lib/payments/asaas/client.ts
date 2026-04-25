import { PaymentProviderError } from '../types';

export interface AsaasClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body: unknown): Promise<T>;
}

export interface AsaasClientConfig {
  apiKey: string;
  baseUrl: string;
}

interface AsaasErrorBody {
  errors?: Array<{ code?: string; description?: string }>;
}

function buildUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

/**
 * Thin fetch wrapper for the Asaas v3 REST API.
 *
 * - Authenticates via the `access_token` header (Asaas v3 does NOT use Bearer auth).
 * - Always sends `Content-Type: application/json`.
 * - Parses the JSON response body and returns it.
 * - Throws a {@link PaymentProviderError} on non-2xx, surfacing Asaas
 *   `errors[0].code`/`description` when available.
 */
export function createAsaasClient(config: AsaasClientConfig): AsaasClient {
  const { apiKey, baseUrl } = config;
  if (!apiKey) {
    throw new Error('Asaas API key is required');
  }
  if (!baseUrl) {
    throw new Error('Asaas base URL is required');
  }

  const headers: Record<string, string> = {
    access_token: apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const url = buildUrl(baseUrl, path);
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);
    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const errBody = (json ?? {}) as AsaasErrorBody;
      const first = errBody.errors?.[0];
      const code = first?.code || `http_${response.status}`;
      const message =
        first?.description ||
        response.statusText ||
        `Asaas request failed with status ${response.status}`;
      throw new PaymentProviderError('asaas', code, message, response.status);
    }

    return (json as T) ?? (undefined as unknown as T);
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  };
}
