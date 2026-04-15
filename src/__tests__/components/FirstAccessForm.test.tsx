import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstAccessForm } from '@/components/auth/FirstAccessForm';

const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled, className, variant, size }: any) => (
    <button onClick={onClick} type={type || 'button'} disabled={disabled} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

const mockInvitationResponse = {
  valid: true,
  invitation: {
    id: 'inv-1',
    email: 'user@example.com',
    name: 'João Silva',
    role: 'viewer',
    token: 'tok-abc',
    invitedBy: 'admin',
    expiresAt: new Date(Date.now() + 86400000),
  },
};

async function advanceToRegistrationStep(fetchMock: ReturnType<typeof vi.fn>) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => mockInvitationResponse,
  });

  const emailInput = screen.getByPlaceholderText('seu@email.com');
  await userEvent.type(emailInput, 'user@example.com');

  const verifyButton = screen.getByRole('button', { name: /verificar convite/i });
  await userEvent.click(verifyButton);

  await waitFor(() => {
    expect(screen.getByText(/complete seu registro/i)).toBeInTheDocument();
  });
}

async function fillRegistrationForm() {
  const firstNameInput = screen.getByPlaceholderText('João');
  const lastNameInput = screen.getByPlaceholderText('Silva');
  await userEvent.clear(firstNameInput);
  await userEvent.type(firstNameInput, 'João');
  await userEvent.clear(lastNameInput);
  await userEvent.type(lastNameInput, 'Silva');

  const passwordInputs = document.querySelectorAll('input[type="password"]');
  await userEvent.type(passwordInputs[0] as HTMLInputElement, 'Senha123');
  await userEvent.type(passwordInputs[1] as HTMLInputElement, 'Senha123');

  const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
  await userEvent.click(checkbox);
}

describe('FirstAccessForm', () => {
  const onBack = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('onSuccess callback on successful registration', () => {
    it('calls onSuccess and does NOT call router.push after successful registration', async () => {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

      render(<FirstAccessForm onBack={onBack} onSuccess={onSuccess} />);

      await advanceToRegistrationStep(fetchMock);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await fillRegistrationForm();

      const submitButton = screen.getByRole('button', { name: /criar conta/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('error handling on failed registration', () => {
    it('shows error alert and does NOT call onSuccess when registration fails', async () => {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

      render(<FirstAccessForm onBack={onBack} onSuccess={onSuccess} />);

      await advanceToRegistrationStep(fetchMock);

      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email já cadastrado' }),
      });

      await fillRegistrationForm();

      const submitButton = screen.getByRole('button', { name: /criar conta/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email já cadastrado')).toBeInTheDocument();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('back button', () => {
    it('calls onBack when back button is clicked on the email step', async () => {
      render(<FirstAccessForm onBack={onBack} onSuccess={onSuccess} />);

      const backButton = screen.getByRole('button', { name: /^$/i, hidden: true });
      if (!backButton) {
        const allButtons = screen.getAllByRole('button');
        const arrowBackButton = allButtons.find(b => b.className?.includes('absolute'));
        expect(arrowBackButton).toBeDefined();
        await userEvent.click(arrowBackButton!);
      } else {
        await userEvent.click(backButton);
      }

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
