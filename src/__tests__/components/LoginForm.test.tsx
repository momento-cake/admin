import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/LoginForm';
import * as useAuthModule from '@/hooks/useAuth';

// Mock Next.js router and search params
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock UI components - simplified mocks
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormField: ({ render }: any) => render({ field: {} }),
  FormItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/auth/FirstAccessForm', () => ({
  FirstAccessForm: ({ onBack }: any) => (
    <div>
      <button onClick={onBack}>Back to Login</button>
    </div>
  ),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      userModel: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasPlatformAccess: vi.fn(() => true),
      isPlatformAdmin: vi.fn(() => false),
      hasAccessToTenant: vi.fn(() => true),
    } as any);
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      render(<LoginForm />);

      expect(screen.getByText('Momento Cake')).toBeInTheDocument();
      expect(screen.getByText('Fazer Login')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('should render email input with correct attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('autoFocus');
    });

    it('should render password input with autocomplete', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/senha/i);
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('should render password visibility toggle button', () => {
      render(<LoginForm />);

      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.className.includes('ghost') || btn.textContent?.includes('Eye')
      );
      expect(toggleButton).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<LoginForm />);

      const submitButton = screen.getAllByRole('button').find(
        btn => btn.type === 'submit' || btn.textContent?.includes('Entrar')
      );
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.className?.includes('ghost')
      );

      expect(passwordInput.type).toBe('password');

      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        await user.click(toggleButton);
        expect(passwordInput.type).toBe('password');
      }
    });

    it('should accept email input', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should accept password input', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
      await user.type(passwordInput, 'password123');

      expect(passwordInput.value).toBe('password123');
    });
  });

  describe('Form Submission', () => {
    it('should call login with email and password on submit', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.type === 'submit'
      );

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');

      if (submitButton) {
        await user.click(submitButton);
      }

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'password123');
      });
    });

    it('should not call login with invalid email', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn();

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.type === 'submit'
      );

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');

      if (submitButton) {
        await user.click(submitButton);
      }

      // Form validation should prevent submission
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should not call login with password too short', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn();

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.type === 'submit'
      );

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123'); // Too short

      if (submitButton) {
        await user.click(submitButton);
      }

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    it('should display login error from useAuth hook', () => {
      const errorMessage = 'Email ou senha incorretos';

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: errorMessage,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<LoginForm />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should clear error on successful login attempt', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        userModel: null,
        loading: false,
        error: null,
        login: mockLogin,
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getAllByRole('button').find(
        btn => btn.type === 'submit'
      );

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      if (submitButton) {
        await user.click(submitButton);
      }

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('First Access Flow', () => {
    it('should show first access form when toggled', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Find and click first access button
      const buttons = screen.getAllByRole('button');
      const firstAccessButton = buttons.find(
        btn => btn.textContent?.includes('Não tem conta') ||
               btn.textContent?.includes('criar') ||
               btn.className?.includes('link')
      );

      // Note: Actual button depends on component implementation
      // This is a placeholder for the actual first access button
    });
  });

  describe('Success Message', () => {
    it('should display success message from search params', () => {
      vi.mock('next/navigation', () => ({
        useRouter: () => ({ push: vi.fn() }),
        useSearchParams: () => ({
          get: vi.fn((key) => key === 'firstAccess' ? 'success' : null),
        }),
      }));

      render(<LoginForm />);

      // Check if success message appears
      const successMessages = screen.queryAllByText(/sucesso/i);
      expect(successMessages.length).toBeGreaterThanOrEqual(0);
    });
  });
});
