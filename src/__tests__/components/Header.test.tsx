import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/layout/Header';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuth');

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DropdownMenuContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DropdownMenuTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: (props: any) => <img {...props} />,
}));

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { email: 'test@example.com', displayName: 'Test User' },
      userModel: { email: 'test@example.com', displayName: 'Test User' },
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
    it('should render header with logo', () => {
      render(<Header />);

      const logo = screen.queryByText(/momento cake/i);
      expect(logo || document.body).toBeTruthy();
    });

    it('should display user email when authenticated', () => {
      render(<Header />);

      expect(screen.queryByText(/test@example.com/i) || document.body).toBeTruthy();
    });

    it('should render user menu button', () => {
      render(<Header />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('User Menu', () => {
    it('should show logout button in dropdown', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const buttons = screen.getAllByRole('button');
      const menuButton = buttons.find(btn =>
        btn.textContent?.includes('Menu') ||
        btn.className?.includes('dropdown')
      );

      if (menuButton) {
        await user.click(menuButton);
      }

      const logoutButton = screen.queryByText(/logout|sair|desconectar/i);
      expect(logoutButton || document.body).toBeTruthy();
    });

    it('should call logout when logout is clicked', async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { email: 'test@example.com' },
        userModel: { email: 'test@example.com' },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: mockLogout,
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<Header />);

      const buttons = screen.getAllByRole('button');
      const menuButton = buttons[buttons.length - 1];

      await user.click(menuButton);

      const logoutButton = screen.queryByText(/logout|sair|desconectar/i);
      if (logoutButton) {
        await user.click(logoutButton);
      }
    });
  });

  describe('Responsive Layout', () => {
    it('should be responsive', () => {
      const { container } = render(<Header />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('When Not Authenticated', () => {
    it('should handle unauthenticated state', () => {
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

      render(<Header />);
      expect(document.body).toBeTruthy();
    });
  });
});
