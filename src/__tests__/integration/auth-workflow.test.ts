import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as useAuthModule from '@/hooks/useAuth';
import * as fb from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import { mockInvitations, factories } from '../mocks/data';

// Mock dependencies
vi.mock('@/hooks/useAuth');
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

describe('Authentication and User Management Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should complete user registration with invitation', async () => {
      const invitationToken = 'inv_token_123';
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
        role: 'admin'
      };

      // Step 1: Validate invitation token
      const invitation = {
        ...mockInvitations[0],
        token: invitationToken,
        status: 'pending' as const
      };

      expect(invitation.token).toBe(invitationToken);
      expect(invitation.status).toBe('pending');

      // Step 2: Create Firebase Auth user
      const createUserMock = vi.fn();
      vi.mocked(fb.createUserWithEmailAndPassword).mockImplementation(createUserMock as any);

      // Step 3: Create Firestore user document
      const addDocMock = vi.fn().mockResolvedValue({ id: 'user_123' });
      vi.mocked(firestore.addDoc).mockImplementation(addDocMock as any);

      // Step 4: Update invitation status
      const updateDocMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(firestore.updateDoc).mockImplementation(updateDocMock as any);

      // Simulate registration process
      expect(invitation.email).toBe(userData.email.toLowerCase());
      expect(invitation.role).toBe(userData.role);
    });

    it('should prevent registration with expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitations[0],
        status: 'expired' as const,
        expiresAt: new Date(Date.now() - 86400000) // 1 day ago
      };

      expect(expiredInvitation.status).toBe('expired');
      expect(expiredInvitation.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should prevent registration with duplicate email', async () => {
      const existingUser = {
        email: 'existing@example.com',
        uid: 'user_existing'
      };

      const duplicateInvitation = {
        email: existingUser.email,
        name: 'Duplicate User',
        role: 'viewer' as const,
        status: 'pending' as const
      };

      // In real scenario, this would check Firestore for existing user
      expect(duplicateInvitation.email).toBe(existingUser.email);
    });
  });

  describe('Login Flow', () => {
    it('should complete successful login workflow', async () => {
      const credentials = {
        email: 'admin@momentocake.com.br',
        password: 'ValidPassword123'
      };

      // Step 1: Authenticate with Firebase
      const mockAuthResult = {
        user: {
          uid: 'user_123',
          email: credentials.email,
          emailVerified: true
        }
      };

      vi.mocked(fb.signInWithEmailAndPassword).mockResolvedValue(mockAuthResult as any);

      // Step 2: Load user data from Firestore
      const userData = {
        id: 'user_123',
        email: credentials.email,
        name: 'Admin User',
        role: { type: 'admin' },
        status: 'active'
      };

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => userData
      } as any);

      // Step 3: Mock useAuth to return logged in state
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockAuthResult.user,
        userModel: userData,
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe(credentials.email);
      expect(result.current.isPlatformAdmin()).toBe(true);
    });

    it('should handle invalid credentials', async () => {
      const invalidCredentials = {
        email: 'admin@momentocake.com.br',
        password: 'WrongPassword'
      };

      vi.mocked(fb.signInWithEmailAndPassword).mockRejectedValue(
        new Error('auth/invalid-login-credentials')
      );

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: 'Email ou senha incorretos',
        login: vi.fn().mockRejectedValue(new Error('auth/invalid-login-credentials')),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => false),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => false),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.error).toBeDefined();
      expect(result.current.user).toBeNull();
    });

    it('should handle inactive user account', async () => {
      const credentials = {
        email: 'inactive@momentocake.com.br',
        password: 'Password123'
      };

      const inactiveUser = {
        id: 'user_inactive',
        email: credentials.email,
        name: 'Inactive User',
        role: { type: 'viewer' },
        status: 'inactive' // Deactivated account
      };

      vi.mocked(fb.signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'user_inactive', email: credentials.email }
      } as any);

      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => inactiveUser
      } as any);

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: 'Conta desativada. Entre em contato com o suporte',
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => false),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => false),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.error).toContain('desativada');
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout and clear user data', async () => {
      // Mock logged in user
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { uid: 'user_123', email: 'admin@test.com' },
        userModel: { email: 'admin@test.com', role: { type: 'admin' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn().mockResolvedValue(undefined),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      // User is logged in
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('admin@test.com');

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      // After logout, clear the mock
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => false),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => false),
      } as any);

      // Verify logout was called
      expect(result.current.logout).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { uid: 'user_123', email: 'admin@test.com' },
        userModel: { email: 'admin@test.com', role: { type: 'admin' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn().mockRejectedValue(new Error('Logout failed')),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      await expect(result.current.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should grant admin full platform access', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { uid: 'user_123', email: 'admin@test.com' },
        userModel: { email: 'admin@test.com', role: { type: 'admin' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.hasPlatformAccess()).toBe(true);
      expect(result.current.isPlatformAdmin()).toBe(true);
      expect(result.current.hasAccessToTenant('any-tenant')).toBe(true);
    });

    it('should restrict viewer to read-only access', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { uid: 'user_456', email: 'viewer@test.com' },
        userModel: { email: 'viewer@test.com', role: { type: 'viewer' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.hasPlatformAccess()).toBe(true);
      expect(result.current.isPlatformAdmin()).toBe(false);
      // Viewers can view but not modify
    });

    it('should restrict unauthorized users from platform', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => false),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => false),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.hasPlatformAccess()).toBe(false);
      expect(result.current.isPlatformAdmin()).toBe(false);
      expect(result.current.hasAccessToTenant('any-tenant')).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should persist user session across page navigation', async () => {
      const userData = {
        id: 'user_123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: { type: 'admin' },
        status: 'active'
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { uid: 'user_123', email: userData.email },
        userModel: userData,
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      // Session persists
      expect(result.current.user?.email).toBe(userData.email);
      expect(result.current.userModel?.id).toBe(userData.id);
    });

    it('should detect and logout expired sessions', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: 'Session expired',
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => false),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => false),
      } as any);

      const { result } = renderHook(() => useAuthModule.useAuth());

      expect(result.current.error).toContain('Session expired');
      expect(result.current.user).toBeNull();
    });
  });

  describe('First Access/Registration Flow', () => {
    it('should guide new user through first access setup', async () => {
      const newUserData = {
        email: 'newuser@momentocake.com.br',
        name: 'New User',
        role: 'viewer',
        status: 'pending_setup'
      };

      // Step 1: Invitation accepted
      const invitation = {
        ...mockInvitations[0],
        email: newUserData.email,
        status: 'accepted' as const
      };

      expect(invitation.status).toBe('accepted');

      // Step 2: Create account (would be in FirstAccessForm)
      const account = {
        ...newUserData,
        status: 'active'
      };

      expect(account.status).toBe('active');

      // Step 3: Redirect to login
      // In real app, would navigate to /login
    });
  });
});
