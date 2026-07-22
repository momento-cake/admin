/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// PedidoFormDialog pulls in the whole order wizard — stub it to a lightweight
// surface that just exposes the onCreated callback.
vi.mock('@/components/pedidos/PedidoFormDialog', () => ({
  PedidoFormDialog: ({ open, onCreated }: any) =>
    open ? (
      <button
        type="button"
        data-testid="mock-create-pedido"
        onClick={() => onCreated({ id: 'ped-9', numeroPedido: 'PED-0009' })}
      >
        Simular criação de pedido
      </button>
    ) : null,
}));

// ReferenciaImagesEditor reaches for Firebase storage — stub it out.
vi.mock('@/components/pedidos/ReferenciaImagesEditor', () => ({
  ReferenciaImagesEditor: () => <div data-testid="ref-images" />,
}));

import { MesStatusBadge } from '@/components/mesversarios/MesStatusBadge';
import { MesversariosList } from '@/components/mesversarios/MesversariosList';
import { MesversarioCard } from '@/components/mesversarios/MesversarioCard';
import { MesversarioMesCard } from '@/components/mesversarios/MesversarioMesCard';
import type { Mesversario, MesversarioMes } from '@/types/mesversario';

const baseMes = (numero: number, over: Partial<MesversarioMes> = {}): MesversarioMes => ({
  numero,
  dataComemoracao: `2025-0${Math.min(numero + 1, 9)}-15`,
  status: 'PENDENTE',
  ...over,
});

const sampleMesversario = (over: Partial<Mesversario> = {}): Mesversario =>
  ({
    id: 'm1',
    clienteId: 'c1',
    clienteNome: 'Maria',
    clienteTelefone: '119',
    relatedPersonId: 'rp1',
    bebeNome: 'João',
    dataNascimento: '2025-01-15',
    status: 'ATIVO',
    meses: [
      baseMes(1, { status: 'ENTREGUE' }),
      baseMes(2, { status: 'PENDENTE' }),
      baseMes(3, { status: 'PENDENTE' }),
    ],
    isActive: true,
    createdAt: {} as any,
    updatedAt: {} as any,
    createdBy: 'u1',
    lastModifiedBy: 'u1',
    ...over,
  }) as Mesversario;

describe('MesStatusBadge', () => {
  it('renders the pt-BR label for a status', () => {
    render(<MesStatusBadge status="PEDIDO_CRIADO" />);
    expect(screen.getByText('Pedido criado')).toBeInTheDocument();
  });
});

describe('MesversariosList', () => {
  it('shows the empty state with a "Novo mesversário" action', async () => {
    const onNew = vi.fn();
    render(<MesversariosList mesversarios={[]} onNew={onNew} />);
    const btn = screen.getByRole('button', { name: /novo mesversário/i });
    await userEvent.click(btn);
    expect(onNew).toHaveBeenCalled();
  });

  it('renders one card per mesversario', () => {
    render(
      <MesversariosList
        mesversarios={[sampleMesversario({ id: 'm1', bebeNome: 'João' }), sampleMesversario({ id: 'm2', bebeNome: 'Ana' })]}
      />
    );
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
});

describe('MesversarioCard', () => {
  it('shows progress and the next-due month', () => {
    // Pin "today" before the sample milestones so months 2/3 are still ahead;
    // the next-due is the nearest upcoming pending month (month 2).
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, 9, 0, 0)); // 2025-01-01
    try {
      render(<MesversarioCard mesversario={sampleMesversario()} />);
      expect(screen.getByText('João')).toBeInTheDocument();
      // 1 of 12 months delivered
      expect(screen.getByText('1/12 meses')).toBeInTheDocument();
      // Next due is month 2
      expect(screen.getByText('2º mês')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('links to the detail page', () => {
    render(<MesversarioCard mesversario={sampleMesversario()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/orders/mesversarios/m1');
  });

  it('shows the concluded state when every month is settled', () => {
    render(
      <MesversarioCard
        mesversario={sampleMesversario({
          meses: [baseMes(1, { status: 'ENTREGUE' }), baseMes(2, { status: 'PULADO' })],
        })}
      />
    );
    expect(screen.getByText(/jornada concluída/i)).toBeInTheDocument();
  });
});

describe('MesversarioMesCard', () => {
  const noop = vi.fn(async () => {});

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('highlights month 12 as the 1-year milestone', () => {
    render(
      <MesversarioMesCard
        mes={baseMes(12, { dataComemoracao: '2026-01-15' })}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={noop}
        onLinkPedido={noop}
      />
    );
    expect(screen.getByText('1 ano 🎉')).toBeInTheDocument();
  });

  it('saves an agreement (tema/sabor) through onUpdateMes', async () => {
    const onUpdateMes = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioMesCard
        mes={baseMes(1)}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={onUpdateMes}
        onLinkPedido={noop}
      />
    );

    await user.click(screen.getByRole('button', { name: /editar acordo/i }));
    await user.type(screen.getByLabelText(/^tema$/i), 'Safari');
    await user.type(screen.getByLabelText(/^sabor$/i), 'Ninho');
    await user.click(screen.getByRole('button', { name: /salvar acordo/i }));

    await waitFor(() => expect(onUpdateMes).toHaveBeenCalled());
    const [numero, patch] = onUpdateMes.mock.calls[0];
    expect(numero).toBe(1);
    expect(patch.acordo.tema).toBe('Safari');
    expect(patch.acordo.sabor).toBe('Ninho');
  });

  it('surfaces an error toast when saving the status fails', async () => {
    const { toast } = await import('sonner');
    const onUpdateMes = vi.fn(async () => {
      throw new Error('fail');
    });
    const user = userEvent.setup();
    render(
      <MesversarioMesCard
        mes={baseMes(1)}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={onUpdateMes}
        onLinkPedido={noop}
      />
    );
    await user.click(screen.getByRole('button', { name: /avançar status/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('renders an existing agreement summary', () => {
    render(
      <MesversarioMesCard
        mes={baseMes(3, {
          status: 'ACORDADO',
          acordo: {
            tema: 'Circo',
            sabor: 'Cenoura',
            notas: 'sem nozes',
            imagensReferencia: [
              { id: 'i1', url: 'u', storagePath: 's', uploadedAt: {} as any, uploadedBy: 'u' },
            ],
          },
        })}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={noop}
        onLinkPedido={noop}
      />
    );
    expect(screen.getByText('Circo')).toBeInTheDocument();
    expect(screen.getByText('Cenoura')).toBeInTheDocument();
    expect(screen.getByText('sem nozes')).toBeInTheDocument();
    expect(screen.getByText(/1 imagem/)).toBeInTheDocument();
  });

  it('saves a status change through onUpdateMes', async () => {
    const onUpdateMes = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioMesCard
        mes={baseMes(1)}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={onUpdateMes}
        onLinkPedido={noop}
      />
    );

    await user.click(screen.getByRole('button', { name: /avançar status/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(onUpdateMes).toHaveBeenCalled());
    const [numero, patch] = onUpdateMes.mock.calls[0];
    expect(numero).toBe(1);
    expect(patch).toHaveProperty('status');
  });

  it('links a created pedido to the month', async () => {
    const onLinkPedido = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioMesCard
        mes={baseMes(2)}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={noop}
        onLinkPedido={onLinkPedido}
      />
    );

    await user.click(screen.getByRole('button', { name: /criar pedido/i }));
    await user.click(screen.getByTestId('mock-create-pedido'));

    await waitFor(() =>
      expect(onLinkPedido).toHaveBeenCalledWith(2, 'ped-9', 'PED-0009')
    );
  });

  it('hides "Criar pedido" once a pedido is linked', () => {
    render(
      <MesversarioMesCard
        mes={baseMes(2, { status: 'PEDIDO_CRIADO', pedidoId: 'p1', pedidoNumero: 'PED-0001' })}
        clienteId="c1"
        clienteNome="Maria"
        onUpdateMes={noop}
        onLinkPedido={noop}
      />
    );
    expect(screen.queryByRole('button', { name: /criar pedido/i })).not.toBeInTheDocument();
    expect(screen.getByText('Pedido PED-0001')).toBeInTheDocument();
  });
});
