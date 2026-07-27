/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let mockIsAdmin = false;
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: mockIsAdmin }),
}));

// The form does its own fetching; stub it so the guard test stays isolated.
vi.mock('@/components/settings/FiscalSettings', () => ({
  FiscalSettings: () => <div data-testid="fiscal-settings-form" />,
}));

import FiscalPage from '@/app/(dashboard)/settings/fiscal/page';

describe('Fiscal settings page guard', () => {
  it('renders the restricted message for non-admins', () => {
    mockIsAdmin = false;
    render(<FiscalPage />);
    expect(screen.getByText(/Acesso restrito a administradores/i)).toBeInTheDocument();
    expect(screen.queryByTestId('fiscal-settings-form')).not.toBeInTheDocument();
  });

  it('renders the form and breadcrumb for admins', () => {
    mockIsAdmin = true;
    render(<FiscalPage />);
    expect(screen.getByTestId('fiscal-settings-form')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configurações/i })).toBeInTheDocument();
  });
});
