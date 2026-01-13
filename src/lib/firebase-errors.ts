/**
 * Firebase error handling utilities for MomentoCake Admin
 */

export interface FirebaseErrorInfo {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userMessage: string
  retryable: boolean
}

/**
 * Enhanced Firebase error mapping with user-friendly messages
 */
export function handleFirebaseError(error: { code?: string; message?: string }): FirebaseErrorInfo {
  const code = error?.code || 'unknown-error'
  
  const errorMap: Record<string, Omit<FirebaseErrorInfo, 'code'>> = {
    // Authentication errors
    'auth/user-not-found': {
      message: 'User account not found',
      severity: 'medium',
      userMessage: 'Usuário não encontrado. Verifique suas credenciais.',
      retryable: false
    },
    'auth/wrong-password': {
      message: 'Invalid password',
      severity: 'medium',
      userMessage: 'Senha incorreta. Tente novamente.',
      retryable: true
    },
    'auth/invalid-credential': {
      message: 'Invalid credentials provided',
      severity: 'medium',
      userMessage: 'Credenciais inválidas. Verifique email e senha.',
      retryable: true
    },
    'auth/too-many-requests': {
      message: 'Too many failed login attempts',
      severity: 'high',
      userMessage: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
      retryable: true
    },
    'auth/user-disabled': {
      message: 'User account has been disabled',
      severity: 'high',
      userMessage: 'Sua conta foi desativada. Entre em contato com o administrador.',
      retryable: false
    },
    'auth/email-already-in-use': {
      message: 'Email address is already registered',
      severity: 'medium',
      userMessage: 'Este email já está em uso. Tente fazer login ou use outro email.',
      retryable: false
    },
    'auth/weak-password': {
      message: 'Password is too weak',
      severity: 'low',
      userMessage: 'A senha é muito fraca. Use pelo menos 8 caracteres.',
      retryable: true
    },
    'auth/invalid-email': {
      message: 'Invalid email format',
      severity: 'low',
      userMessage: 'Formato de email inválido.',
      retryable: true
    },
    'auth/requires-recent-login': {
      message: 'Sensitive operation requires recent login',
      severity: 'medium',
      userMessage: 'Para esta operação, você precisa fazer login novamente.',
      retryable: true
    },
    'auth/network-request-failed': {
      message: 'Network connection failed',
      severity: 'high',
      userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
      retryable: true
    },

    // Firestore errors
    'permission-denied': {
      message: 'Insufficient permissions for operation',
      severity: 'high',
      userMessage: 'Você não tem permissão para realizar esta operação.',
      retryable: false
    },
    'not-found': {
      message: 'Document or collection not found',
      severity: 'medium',
      userMessage: 'Recurso não encontrado.',
      retryable: false
    },
    'already-exists': {
      message: 'Document already exists',
      severity: 'low',
      userMessage: 'Este item já existe.',
      retryable: false
    },
    'resource-exhausted': {
      message: 'Firebase quota exceeded',
      severity: 'critical',
      userMessage: 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.',
      retryable: true
    },
    'failed-precondition': {
      message: 'Operation precondition failed',
      severity: 'medium',
      userMessage: 'Operação não pôde ser concluída devido a conflito de dados.',
      retryable: true
    },
    'aborted': {
      message: 'Operation was aborted due to conflict',
      severity: 'medium',
      userMessage: 'Operação cancelada devido a conflito. Tente novamente.',
      retryable: true
    },
    'out-of-range': {
      message: 'Operation out of valid range',
      severity: 'low',
      userMessage: 'Dados fora do intervalo válido.',
      retryable: true
    },
    'unimplemented': {
      message: 'Operation not implemented',
      severity: 'critical',
      userMessage: 'Funcionalidade não disponível.',
      retryable: false
    },
    'internal': {
      message: 'Internal server error',
      severity: 'critical',
      userMessage: 'Erro interno do servidor. Tente novamente em alguns minutos.',
      retryable: true
    },
    'unavailable': {
      message: 'Service temporarily unavailable',
      severity: 'high',
      userMessage: 'Serviço temporariamente indisponível. Tente novamente.',
      retryable: true
    },
    'data-loss': {
      message: 'Unrecoverable data loss',
      severity: 'critical',
      userMessage: 'Perda de dados detectada. Entre em contato com o suporte.',
      retryable: false
    },
    'unauthenticated': {
      message: 'User not authenticated',
      severity: 'high',
      userMessage: 'Sessão expirada. Faça login novamente.',
      retryable: true
    }
  }

  const errorInfo = errorMap[code] || {
    message: `Unknown Firebase error: ${code}`,
    severity: 'medium' as const,
    userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
    retryable: true
  }

  return {
    code,
    ...errorInfo
  }
}

/**
 * Retry configuration for different error severities
 */
export const retryConfig = {
  low: { attempts: 2, delay: 1000 },
  medium: { attempts: 3, delay: 2000 },
  high: { attempts: 3, delay: 5000 },
  critical: { attempts: 1, delay: 0 }
}

/**
 * Enhanced error logging for debugging and monitoring
 */
export function logFirebaseError(error: { code?: string; message?: string; stack?: string }, operation: string, context?: Record<string, unknown>) {
  const errorInfo = handleFirebaseError(error)
  
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    code: errorInfo.code,
    severity: errorInfo.severity,
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    retryable: errorInfo.retryable,
    context: context || {},
    stack: error?.stack
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔥 Firebase Error [${errorInfo.severity.toUpperCase()}]`)
    console.error('Operation:', operation)
    console.error('Code:', errorInfo.code)
    console.error('Message:', errorInfo.message)
    console.error('User Message:', errorInfo.userMessage)
    if (context) console.error('Context:', context)
    console.groupEnd()
  }

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production' && errorInfo.severity === 'critical') {
    // TODO: Integrate with monitoring service (e.g., Sentry, LogRocket)
    console.error('Critical Firebase Error:', logData)
  }

  return errorInfo
}

/**
 * Retry wrapper for Firebase operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: { code?: string; message?: string; stack?: string } | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (caughtError) {
      const error = caughtError as { code?: string; message?: string; stack?: string }
      lastError = error
      const errorInfo = handleFirebaseError(error)

      // Don't retry if error is not retryable
      if (!errorInfo.retryable) {
        logFirebaseError(error, operationName, { attempt, final: true })
        throw caughtError
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        logFirebaseError(error, operationName, { attempt, final: true })
        throw caughtError
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      logFirebaseError(error, operationName, { attempt, retrying: true, delay })

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}