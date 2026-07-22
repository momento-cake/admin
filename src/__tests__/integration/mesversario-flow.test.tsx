/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// The order wizard is out of scope here — stub it to fire onCreated.
vi.mock('@/components/pedidos/PedidoFormDialog', () => ({
  PedidoFormDialog: ({ open, onCreated }: any) =>
    open ? (
      <button
        type="button"
        data-testid="mock-create-pedido"
        onClick={() => onCreated({ id: 'ped-77', numeroPedido: 'PED-0077' })}
      >
        Criar pedido (mock)
      </button>
    ) : null,
}));

vi.mock('@/components/pedidos/ReferenciaImagesEditor', () => ({
  ReferenciaImagesEditor: () => <div data-testid="ref-images" />,
}));

import { useMesversario } from '@/hooks/useMesversario';
import { MesversarioTimeline } from '@/components/mesversarios/MesversarioTimeline';
import type { Mesversario } from '@/types/mesversario';

// Harness that wires the real hook to the timeline, exactly like the detail page.
function Harness({ id }: { id: string }) {
  const { mesversario, isLoading, updateMes, linkPedido } = useMesversario(id);
  if (isLoading || !mesversario) return <div>loading</div>;
  return (
    <MesversarioTimeline
      mesversario={mesversario}
      onUpdateMes={updateMes}
      onLinkPedido={linkPedido}
    />
  );
}

// ---- Stateful in-memory API backing the fetch mock -------------------------
function makeBackend(): Mesversario {
  return {
    id: 'm1',
    clienteId: 'c1',
    clienteNome: 'Maria',
    clienteTelefone: '119',
    relatedPersonId: 'rp1',
    bebeNome: 'João',
    dataNascimento: '2025-01-15',
    status: 'ATIVO',
    meses: [
      { numero: 1, dataComemoracao: '2025-02-15', status: 'ENTREGUE' },
      { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
    ],
    isActive: true,
    createdAt: {} as any,
    updatedAt: {} as any,
    createdBy: 'u1',
    lastModifiedBy: 'u1',
  } as Mesversario;
}

const originalFetch = global.fetch;

describe('mesversario flow (integration)', () => {
  let backend: Mesversario;

  beforeEach(() => {
    backend = makeBackend();
    global.fetch = vi.fn(async (url: string, init?: any) => {
      const method = init?.method ?? 'GET';

      // GET detail
      if (url === '/api/mesversarios/m1' && method === 'GET') {
        return { ok: true, json: async () => ({ success: true, data: backend }) } as any;
      }

      // PUT a single month
      const mesMatch = /\/api\/mesversarios\/m1\/meses\/(\d+)$/.exec(url);
      if (mesMatch && method === 'PUT') {
        const numero = Number(mesMatch[1]);
        const body = JSON.parse(init.body);
        backend = {
          ...backend,
          meses: backend.meses.map((mes) => {
            if (mes.numero !== numero) return mes;
            const next = { ...mes };
            if (body.acordo !== undefined) next.acordo = body.acordo;
            if (body.observacoes !== undefined) next.observacoes = body.observacoes;
            if (body.pedidoId && body.pedidoNumero) {
              next.pedidoId = body.pedidoId;
              next.pedidoNumero = body.pedidoNumero;
              next.status = 'PEDIDO_CRIADO';
            } else if (body.status !== undefined) {
              next.status = body.status;
            }
            return next;
          }),
        };
        return { ok: true, json: async () => ({ success: true, data: backend }) } as any;
      }

      throw new Error(`Unexpected fetch ${method} ${url}`);
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('starts a month agreement then links a created order (PEDIDO_CRIADO)', async () => {
    const user = userEvent.setup();
    render(<Harness id="m1" />);

    // Timeline loads with month 2 pending.
    await waitFor(() => expect(screen.getByText('2º mês')).toBeInTheDocument());

    // --- Edit the agreement for month 2 ---
    const editButtons = screen.getAllByRole('button', { name: /editar acordo/i });
    // Month 2 is the second card.
    await user.click(editButtons[1]);

    const temaInput = await screen.findByLabelText(/^tema$/i);
    await user.type(temaInput, 'Ursinhos');
    await user.click(screen.getByRole('button', { name: /salvar acordo/i }));

    // Agreement is now shown on the month card.
    await waitFor(() => expect(screen.getByText(/Ursinhos/)).toBeInTheDocument());
    expect(backend.meses[1].acordo?.tema).toBe('Ursinhos');

    // --- Create + link an order for month 2 ---
    const createButtons = screen.getAllByRole('button', { name: /criar pedido/i });
    await user.click(createButtons[1]);
    await user.click(screen.getByTestId('mock-create-pedido'));

    // The month moves to PEDIDO_CRIADO and stores the order number.
    await waitFor(() => expect(screen.getByText('Pedido PED-0077')).toBeInTheDocument());
    expect(screen.getByText('Pedido criado')).toBeInTheDocument();
    expect(backend.meses[1].status).toBe('PEDIDO_CRIADO');
    expect(backend.meses[1].pedidoNumero).toBe('PED-0077');
  });
});
