/**
 * Error Handler Utility
 *
 * Maps Firebase/Firestore errors to user-friendly Portuguese messages
 * and provides consistent error handling across the application
 */

export interface AppError {
  code: string;
  message: string;
  details?: string;
}

/**
 * One field-level validation error as returned by every Pedidos API route on Zod failure.
 */
export interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * Typed Error thrown by `parseApiResponse` so callers can inspect HTTP status
 * and the structured `details` payload (validation array or an object such as
 * `{ total, totalPago, saldo }` returned by the ENTREGUE gate).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Map of Firestore error codes to Portuguese user messages
 */
const firebaseErrorMap: Record<string, string> = {
  // Firebase Auth errors
  'auth/invalid-email': 'Email inválido',
  'auth/user-not-found': 'Usuário não encontrado',
  'auth/wrong-password': 'Senha incorreta',
  'auth/user-disabled': 'Usuário desativado',
  'auth/invalid-login-credentials': 'Credenciais inválidas',

  // Firestore permission errors
  'permission-denied': 'Você não tem permissão para realizar esta ação',
  'PERMISSION_DENIED': 'Você não tem permissão para realizar esta ação',

  // Firestore document errors
  'not-found': 'Documento não encontrado',
  'NOT_FOUND': 'Documento não encontrado',

  // Firestore general errors
  'internal': 'Erro interno. Por favor, tente novamente',
  'INTERNAL': 'Erro interno. Por favor, tente novamente',
  'unavailable': 'Serviço indisponível. Por favor, tente novamente mais tarde',
  'UNAVAILABLE': 'Serviço indisponível. Por favor, tente novamente mais tarde',
  'deadline-exceeded': 'Tempo limite excedido. Por favor, tente novamente',
  'DEADLINE_EXCEEDED': 'Tempo limite excedido. Por favor, tente novamente',

  // Network errors
  'network-error': 'Erro de conexão. Por favor, verifique sua internet',
  'NETWORK_ERROR': 'Erro de conexão. Por favor, verifique sua internet',

  // Specific product errors
  'product-not-found': 'Produto não encontrado',
  'category-not-found': 'Categoria não encontrada',
  'subcategory-not-found': 'Subcategoria não encontrada',
  'recipe-not-found': 'Receita não encontrada',
  'package-not-found': 'Embalagem não encontrada',

  // Validation errors
  'invalid-input': 'Dados inválidos. Por favor, verifique o formulário',
  'missing-required-field': 'Campo obrigatório não preenchido',

  // Firestore specific
  'already-exists': 'Este registro já existe',
  'ALREADY_EXISTS': 'Este registro já existe',
};

/**
 * Convert any error to AppError with user-friendly message
 */
export function handleError(error: any): AppError {
  if (!error) {
    return {
      code: 'unknown-error',
      message: 'Erro desconhecido. Por favor, tente novamente',
      details: String(error),
    };
  }

  const rawMessage = typeof error.message === 'string' ? error.message : '';

  // Map a known Firestore/Firebase code to its Portuguese message
  if (error.code && firebaseErrorMap[error.code]) {
    return {
      code: error.code,
      message: firebaseErrorMap[error.code],
      details: rawMessage,
    };
  }

  // Map by pattern when the message embeds a known Firebase token (e.g. "5 NOT_FOUND ...")
  if (rawMessage) {
    for (const [key, value] of Object.entries(firebaseErrorMap)) {
      if (rawMessage.includes(key)) {
        return {
          code: key,
          message: value,
          details: rawMessage,
        };
      }
    }
  }

  // Preserve the original message for plain Errors (typically thrown from API
  // responses with already-localized text, e.g. "Pedido tem saldo em aberto").
  // We require an Error instance so we don't surface raw third-party error
  // payloads with technical strings.
  if (error instanceof Error && rawMessage) {
    return {
      code: (error as Error & { code?: string }).code || 'unknown-error',
      message: rawMessage,
      details: rawMessage,
    };
  }

  // Fallback for unknown errors
  return {
    code: 'unknown-error',
    message: 'Erro desconhecido. Por favor, tente novamente',
    details: error instanceof Error ? rawMessage : String(error),
  };
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.message || '';
  return (
    code.includes('permission') ||
    code.includes('PERMISSION') ||
    code.includes('denied')
  );
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.message || '';
  return (
    code.includes('not-found') ||
    code.includes('NOT_FOUND') ||
    code.includes('not found')
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.message || '';
  return (
    code.includes('network') ||
    code.includes('NETWORK') ||
    code.includes('unavailable') ||
    code.includes('UNAVAILABLE') ||
    code.includes('timeout')
  );
}

/**
 * Format error message for display
 * Returns main message + optional details
 */
export function formatErrorMessage(error: any): string {
  const appError = handleError(error);
  return appError.message;
}

/**
 * Log error for debugging (server-side safe)
 */
export function logError(context: string, error: any): void {
  const appError = handleError(error);
  console.error(`[${context}] Error:`, {
    code: appError.code,
    message: appError.message,
    details: appError.details,
    originalError: error
  });
}

/**
 * Format a ValidationDetail[] (Zod errors from the API) into a multi-line
 * Portuguese string suitable for a toast description. Returns null if the
 * argument is not a non-empty array of recognizable details.
 */
export function formatValidationErrors(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null;
  const lines = details
    .filter(
      (d): d is ValidationDetail =>
        d !== null &&
        typeof d === 'object' &&
        typeof (d as { message?: unknown }).message === 'string'
    )
    .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message));
  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Parse a `fetch` Response that follows the project's `{ success, data?, error?, details? }`
 * convention. Throws an `ApiError` with the HTTP status and any structured
 * `details` if the response is not successful, otherwise returns `result.data`
 * (or the whole JSON when `data` is absent).
 *
 * Use at every Pedidos call site instead of hand-rolling
 * `if (!result.success) throw new Error(result.error)`. The thrown ApiError
 * carries the exact server message (already in Portuguese) and the structured
 * payload (validation array, ENTREGUE saldo breakdown, etc.) so callers can
 * render rich descriptions.
 */
export async function parseApiResponse<T = unknown>(
  response: Response
): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response — fall through with payload=null
  }

  const obj =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;

  const success = obj?.success;
  if (response.ok && success !== false) {
    return (obj && 'data' in obj ? (obj.data as T) : (payload as T));
  }

  const message =
    (obj && typeof obj.error === 'string' && obj.error) ||
    `Erro ${response.status}. Por favor, tente novamente.`;
  throw new ApiError(message, response.status, obj?.details);
}

/**
 * Build a toast description that combines the error message with structured
 * context where available — validation arrays, ENTREGUE saldo breakdown,
 * etc. Falls back to `formatErrorMessage` for plain errors.
 */
export function describeError(error: unknown): string {
  if (error instanceof ApiError && error.details !== undefined) {
    const validation = formatValidationErrors(error.details);
    if (validation) return validation;

    if (
      error.details &&
      typeof error.details === 'object' &&
      'saldo' in (error.details as object)
    ) {
      const d = error.details as { total?: number; totalPago?: number; saldo?: number };
      const fmt = (n: unknown) =>
        typeof n === 'number'
          ? new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(n)
          : '-';
      return `${error.message}\nSaldo em aberto: ${fmt(d.saldo)} • Total: ${fmt(d.total)} • Pago: ${fmt(d.totalPago)}`;
    }
  }
  return formatErrorMessage(error);
}
