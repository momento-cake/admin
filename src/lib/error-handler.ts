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
