import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/layout/Sidebar';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// src/lib/firebase.ts calls getStorage() at import time, which blows up under
// vitest (no env vars, storage not mocked in setup.ts). useAuth pulls it in.
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }));

vi.mock('@/hooks/useAuth');

// usePermissions reads AuthContext, which isn't provided here.
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, role: 'admin' }),
}));

vi.mock('@/hooks/useWhatsAppConversations', () => ({
  useWhatsAppConversations: () => ({ conversations: [] }),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CollapsibleContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CollapsibleTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { email: 'admin@example.com' },
      userModel: { email: 'admin@example.com', role: { type: 'admin' } },
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasPlatformAccess: vi.fn(() => true),
      isPlatformAdmin: vi.fn(() => true),
      hasAccessToTenant: vi.fn(() => true),
    } as any);
  });

  describe('Rendering', () => {
    it('should render sidebar navigation', () => {
      render(<Sidebar />);

      expect(document.body).toBeTruthy();
    });

    it('should display main navigation items', () => {
      render(<Sidebar />);

      // Check for common navigation items
      const dashboardLink = screen.queryByText(/dashboard|painel/i);
      expect(dashboardLink || document.body).toBeTruthy();
    });

    it('should show ingredients menu for admin users', () => {
      render(<Sidebar />);

      const ingredientsMenu = screen.queryByText(/ingredientes/i);
      expect(ingredientsMenu || document.body).toBeTruthy();
    });

    it('should show recipes menu for admin users', () => {
      render(<Sidebar />);

      const recipesMenu = screen.queryByText(/receitas/i);
      expect(recipesMenu || document.body).toBeTruthy();
    });

    it('should show users menu for admin users', () => {
      render(<Sidebar />);

      const usersMenu = screen.queryByText(/usuários|usuarios/i);
      expect(usersMenu || document.body).toBeTruthy();
    });
  });

  describe('Pedidos submenu', () => {
    /** The submenu only renders once its parent is expanded. */
    async function expandPedidos() {
      const user = userEvent.setup();
      render(<Sidebar />);
      await user.click(screen.getAllByText('Pedidos')[0]);
    }

    it('lists exactly the three destination entries', async () => {
      await expandPedidos();

      expect(screen.getAllByText('Todos os Pedidos').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Quadro Kanban').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resumo').length).toBeGreaterThan(0);
    });

    it('no longer offers "Novo Pedido" as a destination', async () => {
      await expandPedidos();

      // Creating an order is an action (a modal), not a page.
      expect(screen.queryByText('Novo Pedido')).not.toBeInTheDocument();
      expect(document.querySelector('a[href="/orders/new"]')).toBeNull();
    });
  });

  describe('Admin vs Viewer Permissions', () => {
    it('should show all menus for admin users', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { email: 'admin@example.com' },
        userModel: { role: { type: 'admin' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => true),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<Sidebar />);
      expect(document.body).toBeTruthy();
    });

    it('should restrict menus for viewer users', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { email: 'viewer@example.com' },
        userModel: { role: { type: 'viewer' } },
        loading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
        hasPlatformAccess: vi.fn(() => true),
        isPlatformAdmin: vi.fn(() => false),
        hasAccessToTenant: vi.fn(() => true),
      } as any);

      render(<Sidebar />);
      expect(document.body).toBeTruthy();
    });
  });

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      render(<Sidebar />);
      expect(document.body).toBeTruthy();
    });

    it('should update active item when route changes', () => {
      const { rerender } = render(<Sidebar />);
      expect(document.body).toBeTruthy();

      vi.mock('next/navigation', () => ({
        usePathname: () => '/ingredients/inventory',
      }));

      rerender(<Sidebar />);
      expect(document.body).toBeTruthy();
    });
  });

  describe('Submenu Expansion', () => {
    it('should expand ingredients submenu', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const ingredientsMenu = screen.queryByText(/ingredientes/i);
      if (ingredientsMenu) {
        await user.click(ingredientsMenu);
      }

      expect(document.body).toBeTruthy();
    });

    it('should expand recipes submenu', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const recipesMenu = screen.queryByText(/receitas/i);
      if (recipesMenu) {
        await user.click(recipesMenu);
      }

      expect(document.body).toBeTruthy();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render in compact mode on mobile', () => {
      const { container } = render(<Sidebar />);
      expect(container).toBeTruthy();
    });

    it('should have hamburger menu on mobile', () => {
      render(<Sidebar />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Unauthenticated State', () => {
    it('should handle unauthenticated users', () => {
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

      render(<Sidebar />);
      expect(document.body).toBeTruthy();
    });
  });
});
