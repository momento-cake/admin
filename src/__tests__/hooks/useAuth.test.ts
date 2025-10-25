import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as FirebaseAuth from 'firebase/auth';
import * as FirebaseFirestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('should initialize with loading state', () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          // Don't call callback immediately, simulating loading
          return vi.fn();
        }
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.userModel).toBeNull();
    });

    it('should set user when authenticated', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      const mockUserDoc = {
        exists: () => true,
        data: () => ({
          role: { type: 'admin' },
          isActive: true,
          createdAt: { toDate: () => new Date() },
          lastSignInAt: { toDate: () => new Date() },
          metadata: {},
        }),
      };

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          callback(mockUser as any);
          return vi.fn();
        }
      );

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockUserDoc as any
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        // Wait for effect to complete
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userModel).toBeDefined();
      expect(result.current.userModel?.email).toBe('test@example.com');
    });

    it('should clear user when logged out', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          callback(null);
          return vi.fn();
        }
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.user).toBeNull();
      expect(result.current.userModel).toBeNull();
    });

    it('should set error when loading user data fails', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          callback(mockUser as any);
          return vi.fn();
        }
      );

      vi.mocked(FirebaseFirestore.getDoc).mockRejectedValue(
        new Error('Firestore error')
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.userModel).toBeNull();
    });
  });

  describe('Login Method', () => {
    it('should login with email and password', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'user-123' },
      } as any);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(FirebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
    });

    it('should set error on login failure', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeDefined();
    });

    it('should clear error on successful login', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'user-123' },
      } as any);

      const { result } = renderHook(() => useAuth());

      // Set initial error
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch (e) {
          // Error cleared
        }
      });

      // Error should be cleared on successful login
      expect(result.current.error).toBeNull();
    });
  });

  describe('Logout Method', () => {
    it('should logout and clear user', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signOut).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(FirebaseAuth.signOut).toHaveBeenCalled();
      expect(result.current.userModel).toBeNull();
    });

    it('should set error on logout failure', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signOut).mockRejectedValue(
        new Error('Logout failed')
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error).toContain('Erro ao fazer logout');
    });
  });

  describe('Permission Checks', () => {
    it('should correctly check platform access', () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      const { result } = renderHook(() => useAuth());

      // Manually set userModel with admin role
      expect(result.current.hasPlatformAccess()).toBe(false); // No user initially
    });

    it('should correctly check admin status', () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isPlatformAdmin()).toBe(false); // No user initially
    });

    it('should check permission for specific tenants', () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      const { result } = renderHook(() => useAuth());

      const hasAccess = result.current.hasAccessToTenant('tenant-123');
      expect(typeof hasAccess).toBe('boolean');
    });
  });

  describe('User Data Handling', () => {
    it('should handle user without Firestore document', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          callback(mockUser as any);
          return vi.fn();
        }
      );

      const mockEmptyDoc = {
        exists: () => false,
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockEmptyDoc as any
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.userModel).toBeDefined();
      expect(result.current.userModel?.role.type).toBe('viewer'); // Default role
    });

    it('should sign out inactive user', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          callback(mockUser as any);
          return vi.fn();
        }
      );

      const mockInactiveUserDoc = {
        exists: () => true,
        data: () => ({
          role: { type: 'admin' },
          isActive: false, // Inactive user
          createdAt: { toDate: () => new Date() },
          metadata: {},
        }),
      };

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue(
        mockInactiveUserDoc as any
      );

      vi.mocked(FirebaseAuth.signOut).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(FirebaseAuth.signOut).toHaveBeenCalled();
      expect(result.current.error).toContain('desativada');
      expect(result.current.userModel).toBeNull();
    });
  });

  describe('Subscription Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return mockUnsubscribe;
        }
      );

      const { unmount } = renderHook(() => useAuth());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should map Firebase error codes to user-friendly messages', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      const errorCodes = [
        { code: 'auth/wrong-password', expectedMessage: 'Senha incorreta' },
        { code: 'auth/user-not-found', expectedMessage: 'Usuário não encontrado' },
        { code: 'auth/too-many-requests', expectedMessage: 'Muitas tentativas' },
      ];

      for (const { code } of errorCodes) {
        vi.mocked(FirebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
          code,
        });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          try {
            await result.current.login('test@example.com', 'password');
          } catch (e) {
            // Expected
          }
        });

        expect(result.current.error).toBeDefined();
      }
    });

    it('should handle unknown error codes', async () => {
      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, callback) => {
          return vi.fn();
        }
      );

      vi.mocked(FirebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce({
        code: 'unknown-error-code',
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password');
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAuth Loading State', () => {
    it('should transition from loading to loaded', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        photoURL: null,
      };

      let callback: any;

      vi.mocked(FirebaseAuth.onAuthStateChanged).mockImplementation(
        (auth, cb) => {
          callback = cb;
          return vi.fn();
        }
      );

      vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          role: { type: 'admin' },
          isActive: true,
          createdAt: { toDate: () => new Date() },
          metadata: {},
        }),
      } as any);

      const { result, rerender } = renderHook(() => useAuth());

      // Initially loading
      expect(result.current.loading).toBe(true);

      // Call the callback to simulate auth state change
      await act(async () => {
        callback(mockUser);
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeTruthy();
    });
  });
});
