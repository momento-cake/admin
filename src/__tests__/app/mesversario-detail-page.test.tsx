/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mesversario } from '@/types/mesversario';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Timeline pulls the whole month editor in — stub it to a marker.
vi.mock('@/components/mesversarios/MesversarioTimeline', () => ({
  MesversarioTimeline: () => <div data-testid="timeline" />,
}));

// The dialogs are exercised in their own suite — here we only assert they mount
// (gated by permission) and forward the wired-up handlers.
vi.mock('@/components/mesversarios/MesversarioEditDialog', () => ({
  MesversarioEditDialog: ({ open }: any) =>
    open ? <div data-testid="edit-dialog" /> : null,
}));
vi.mock('@/components/mesversarios/DeleteMesversarioDialog', () => ({
  DeleteMesversarioDialog: ({ open }: any) =>
    open ? <div data-testid="delete-dialog" /> : null,
}));

const sampleMesversario: Mesversario = {
  id: 'm1',
  clienteId: 'c1',
  clienteNome: 'Maria',
  clienteTelefone: '119',
  relatedPersonId: 'rp1',
  bebeNome: 'João',
  dataNascimento: '2025-01-15',
  status: 'ATIVO',
  observacoes: '',
  meses: [
    { numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' },
    { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
  ],
  isActive: true,
  createdAt: {} as any,
  updatedAt: {} as any,
  createdBy: 'u1',
  lastModifiedBy: 'u1',
};

const useMesversarioMock = vi.fn();
vi.mock('@/hooks/useMesversario', () => ({
  useMesversario: () => useMesversarioMock(),
}));

const canPerformActionMock = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction: canPerformActionMock }),
}));

import MesversarioDetailPage from '@/app/(dashboard)/orders/mesversarios/[id]/page';

// A thenable React's `use()` unwraps synchronously (status: 'fulfilled'),
// avoiding a Suspense round-trip in the test.
function resolvedParams<T>(value: T): Promise<T> {
  return {
    status: 'fulfilled',
    value,
    then: (cb: (v: T) => unknown) => cb(value),
  } as unknown as Promise<T>;
}

function renderPage() {
  return render(
    <Suspense fallback={<div>loading</div>}>
      <MesversarioDetailPage params={resolvedParams({ id: 'm1' })} />
    </Suspense>
  );
}

describe('MesversarioDetailPage — header actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMesversarioMock.mockReturnValue({
      mesversario: sampleMesversario,
      isLoading: false,
      error: null,
      updateMes: vi.fn(),
      linkPedido: vi.fn(),
      unlinkPedido: vi.fn(),
      updateMesversario: vi.fn(async () => {}),
      deleteMesversario: vi.fn(async () => {}),
    });
  });

  it('shows Editar and Excluir when the user can update and delete', async () => {
    canPerformActionMock.mockReturnValue(true);
    renderPage();
    expect(await screen.findByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
  });

  it('hides both actions when the user has neither permission', async () => {
    canPerformActionMock.mockReturnValue(false);
    renderPage();
    await screen.findByTestId('timeline');
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('hides Excluir for a user who can only update', async () => {
    canPerformActionMock.mockImplementation((_f: string, action: string) => action === 'update');
    renderPage();
    expect(await screen.findByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('opens the edit dialog when Editar is clicked', async () => {
    canPerformActionMock.mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /editar/i }));
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
  });

  it('opens the delete dialog when Excluir is clicked', async () => {
    canPerformActionMock.mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /excluir/i }));
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });
});
