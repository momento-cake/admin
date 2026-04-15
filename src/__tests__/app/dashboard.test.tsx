import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as useAuthModule from '@/hooks/useAuth';
import * as usePermissionsModule from '@/hooks/usePermissions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({
    userModel: null,
    loading: false,
  })),
}));

vi.mock('@/components/dashboard/DashboardShortcuts', () => ({
  DashboardShortcuts: () => <div data-testid="dashboard-shortcuts" />,
}));

const MOCK_STATS_PAYLOAD = {
  success: true,
  stats: { users: 3, clients: 5, ingredients: 10, recipes: 2, products: 4 },
};

const MOCK_STATS_EMPTY = {
  success: true,
  stats: { users: 0, clients: 0, ingredients: 0, recipes: 0, products: 0 },
};

function makeUserModel(role: 'admin' | 'atendente' | 'producao') {
  return {
    uid: 'uid-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: { type: role },
    isActive: true,
    metadata: {},
  } as any;
}

function mockPermissionsFor(role: 'admin' | 'atendente' | 'producao') {
  const adminFeatures = ['dashboard', 'users', 'clients', 'ingredients', 'recipes', 'products', 'packaging', 'images', 'orders', 'reports', 'settings', 'time_tracking'];
  const atendenteFeatures = ['dashboard', 'clients', 'images', 'orders', 'time_tracking'];
  const producaoFeatures = ['dashboard', 'time_tracking'];

  const accessible = role === 'admin' ? adminFeatures : role === 'atendente' ? atendenteFeatures : producaoFeatures;

  return {
    loading: false,
    role,
    isAdmin: role === 'admin',
    isAtendente: role === 'atendente',
    isProducao: role === 'producao',
    canAccess: (feature: string) => accessible.includes(feature),
    canPerformAction: vi.fn(() => true),
    canAccessPath: vi.fn(() => true),
    accessibleFeatures: accessible,
    effectivePermissions: {},
    canModifyPermissions: vi.fn(() => false),
    user: makeUserModel(role),
  } as any;
}

async function renderDashboard() {
  const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
  return render(<DashboardPage />);
}

describe('DashboardPage role-based rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(MOCK_STATS_PAYLOAD),
    } as any);
  });

  describe('admin role', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        userModel: makeUserModel('admin'),
        loading: false,
      } as any);
      vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(
        mockPermissionsFor('admin')
      );
    });

    it('renders all 5 StatCards', async () => {
      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Usuários')).toBeInTheDocument();
        expect(screen.getByText('Clientes')).toBeInTheDocument();
        expect(screen.getByText('Produtos')).toBeInTheDocument();
        expect(screen.getByText('Ingredientes')).toBeInTheDocument();
        expect(screen.getByText('Receitas')).toBeInTheDocument();
      });
    });

    it('renders Quick Actions card', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_STATS_EMPTY),
      } as any);
      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
      });
    });

    it('Usuários StatCard has href when role is admin', async () => {
      await renderDashboard();
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /usuários/i });
        expect(link).toHaveAttribute('href', '/users');
      });
    });
  });

  describe('atendente role', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        userModel: makeUserModel('atendente'),
        loading: false,
      } as any);
      vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(
        mockPermissionsFor('atendente')
      );
    });

    it('renders Clientes StatCard', async () => {
      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Clientes')).toBeInTheDocument();
      });
    });

    it('does NOT render Usuários, Produtos, Ingredientes, Receitas StatCards', async () => {
      await renderDashboard();
      await waitFor(() => {
        expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
        expect(screen.queryByText('Produtos')).not.toBeInTheDocument();
        expect(screen.queryByText('Ingredientes')).not.toBeInTheDocument();
        expect(screen.queryByText('Receitas')).not.toBeInTheDocument();
      });
    });

    it('Quick Actions shows only clients nudge when stats are zero', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_STATS_EMPTY),
      } as any);
      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
        expect(screen.getByText('Adicionar Primeiro Cliente')).toBeInTheDocument();
        expect(screen.queryByText('Cadastrar Ingredientes')).not.toBeInTheDocument();
        expect(screen.queryByText('Criar Primeira Receita')).not.toBeInTheDocument();
      });
    });
  });

  describe('producao role', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        userModel: makeUserModel('producao'),
        loading: false,
      } as any);
      vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(
        mockPermissionsFor('producao')
      );
    });

    it('renders NO StatCards', async () => {
      await renderDashboard();
      await waitFor(() => {
        expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
        expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
        expect(screen.queryByText('Produtos')).not.toBeInTheDocument();
        expect(screen.queryByText('Ingredientes')).not.toBeInTheDocument();
        expect(screen.queryByText('Receitas')).not.toBeInTheDocument();
      });
    });

    it('Quick Actions card is hidden entirely', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_STATS_EMPTY),
      } as any);
      await renderDashboard();
      await waitFor(() => {
        expect(screen.queryByText('Ações Rápidas')).not.toBeInTheDocument();
      });
    });

    it('Quick Actions card stays hidden even when clients and recipes exist', async () => {
      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByText('Ações Rápidas')).not.toBeInTheDocument();
      expect(screen.queryByText('Sistema Configurado!')).not.toBeInTheDocument();
    });
  });

  describe('Usuários StatCard href gating', () => {
    it('has no href for atendente even if users feature were accessible', async () => {
      const atendenteWithUsers = {
        ...mockPermissionsFor('atendente'),
        isAdmin: false,
        canAccess: (feature: string) => ['dashboard', 'clients', 'users'].includes(feature),
      };
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        userModel: makeUserModel('atendente'),
        loading: false,
      } as any);
      vi.mocked(usePermissionsModule.usePermissions).mockReturnValue(atendenteWithUsers);

      await renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('Usuários')).toBeInTheDocument();
      });
      const links = screen.queryAllByRole('link', { name: /usuários/i });
      expect(links.length).toBe(0);
    });
  });
});
