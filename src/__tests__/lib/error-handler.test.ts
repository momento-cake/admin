import { describe, it, expect } from 'vitest';
import {
  handleError,
  formatErrorMessage,
  isPermissionError,
  isNotFoundError,
  isNetworkError,
} from '@/lib/error-handler';

describe('error-handler', () => {
  describe('handleError', () => {
    it('maps Firebase auth code to Portuguese message', () => {
      const error = { code: 'auth/invalid-email', message: 'Invalid email' };
      const result = handleError(error);

      expect(result.code).toBe('auth/invalid-email');
      expect(result.message).toBe('Email inválido');
      expect(result.details).toBe('Invalid email');
    });

    it('maps Firestore permission-denied code to Portuguese message', () => {
      const error = { code: 'permission-denied', message: 'Missing or insufficient permissions' };
      const result = handleError(error);

      expect(result.message).toBe('Você não tem permissão para realizar esta ação');
    });

    it('maps a Firebase pattern embedded in message string', () => {
      const error = new Error('5 NOT_FOUND: document missing');
      const result = handleError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Documento não encontrado');
    });

    it('preserves the original message of a plain Error with no Firebase code', () => {
      const error = new Error(
        'Pedido tem saldo em aberto. Registre o pagamento antes de marcar como entregue.'
      );
      const result = handleError(error);

      expect(result.message).toBe(
        'Pedido tem saldo em aberto. Registre o pagamento antes de marcar como entregue.'
      );
      expect(result.message).not.toBe('Erro desconhecido. Por favor, tente novamente');
    });

    it('preserves a generic permission-denied API message', () => {
      const error = new Error('Sem permissão para atualizar pedidos');
      const result = handleError(error);

      expect(result.message).toBe('Sem permissão para atualizar pedidos');
    });

    it('falls back to generic message for non-Error values without a usable message', () => {
      const result = handleError({ foo: 'bar' });

      expect(result.message).toBe('Erro desconhecido. Por favor, tente novamente');
    });

    it('falls back to generic message for an Error with empty message', () => {
      const result = handleError(new Error(''));

      expect(result.message).toBe('Erro desconhecido. Por favor, tente novamente');
    });

    it('falls back to generic message for non-Error plain objects with unknown code', () => {
      // Plain objects (not Error instances) with unrecognized codes are treated
      // as untrusted; we do not surface their raw message verbatim.
      const error = { code: 'custom-code', message: 'Custom message' };
      const result = handleError(error);

      expect(result.message).toBe('Erro desconhecido. Por favor, tente novamente');
    });

    it('returns null/undefined safely', () => {
      expect(handleError(null).message).toBe('Erro desconhecido. Por favor, tente novamente');
      expect(handleError(undefined).message).toBe('Erro desconhecido. Por favor, tente novamente');
    });
  });

  describe('formatErrorMessage', () => {
    it('returns the user-facing message for a plain Error', () => {
      const error = new Error('Pedido tem saldo em aberto.');

      expect(formatErrorMessage(error)).toBe('Pedido tem saldo em aberto.');
    });

    it('returns the mapped Portuguese message for a Firebase code', () => {
      expect(formatErrorMessage({ code: 'permission-denied' })).toBe(
        'Você não tem permissão para realizar esta ação'
      );
    });

    it('returns the generic fallback for unknown shapes', () => {
      expect(formatErrorMessage({})).toBe('Erro desconhecido. Por favor, tente novamente');
    });
  });

  describe('isPermissionError', () => {
    it('detects permission errors by code', () => {
      expect(isPermissionError({ code: 'permission-denied' })).toBe(true);
      expect(isPermissionError({ code: 'PERMISSION_DENIED' })).toBe(true);
    });

    it('detects permission errors by message substring', () => {
      expect(isPermissionError(new Error('access denied'))).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isPermissionError(new Error('something else'))).toBe(false);
      expect(isPermissionError(null)).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('detects not found errors', () => {
      expect(isNotFoundError({ code: 'not-found' })).toBe(true);
      expect(isNotFoundError(new Error('not found in collection'))).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isNotFoundError(new Error('other'))).toBe(false);
      expect(isNotFoundError(null)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('detects network errors', () => {
      expect(isNetworkError({ code: 'unavailable' })).toBe(true);
      expect(isNetworkError(new Error('timeout exceeded'))).toBe(true);
    });

    it('returns false otherwise', () => {
      expect(isNetworkError(new Error('other'))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });
});
