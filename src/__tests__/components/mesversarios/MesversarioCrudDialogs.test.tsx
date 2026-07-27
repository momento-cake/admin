/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Radix Dialog/AlertDialog/Select are portal + pointer heavy in jsdom — render
// lightweight stand-ins that keep the component's own logic under test.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, disabled }: any) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import { MesversarioEditDialog } from '@/components/mesversarios/MesversarioEditDialog';
import { DeleteMesversarioDialog } from '@/components/mesversarios/DeleteMesversarioDialog';
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
    observacoes: 'nota inicial',
    meses: [baseMes(1, { status: 'ENTREGUE' }), baseMes(2)],
    isActive: true,
    createdAt: {} as any,
    updatedAt: {} as any,
    createdBy: 'u1',
    lastModifiedBy: 'u1',
    ...over,
  }) as Mesversario;

describe('MesversarioEditDialog', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('prefills the fields from the mesversário', () => {
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onSave={vi.fn(async () => {})}
      />
    );
    expect(screen.getByLabelText(/nome do bebê/i)).toHaveValue('João');
    expect(screen.getByLabelText(/data de nascimento/i)).toHaveValue('2025-01-15');
    expect(screen.getByLabelText(/observações/i)).toHaveValue('nota inicial');
    expect(screen.getByTestId('status-select')).toHaveValue('ATIVO');
  });

  it('shows the recompute warning only after the birth date changes', async () => {
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onSave={vi.fn(async () => {})}
      />
    );
    expect(screen.queryByText(/12 datas serão recalculadas/i)).not.toBeInTheDocument();

    const birth = screen.getByLabelText(/data de nascimento/i);
    await user.clear(birth);
    await user.type(birth, '2025-02-20');

    expect(screen.getByText(/12 datas serão recalculadas/i)).toBeInTheDocument();
  });

  it('submits only the changed fields as a minimal patch', async () => {
    const onSave = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={onOpenChange}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );

    const name = screen.getByLabelText(/nome do bebê/i);
    await user.clear(name);
    await user.type(name, 'João Pedro');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ bebeNome: 'João Pedro' }));
  });

  it('includes the birth date in the patch when it changes', async () => {
    const onSave = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );

    const birth = screen.getByLabelText(/data de nascimento/i);
    await user.clear(birth);
    await user.type(birth, '2025-02-20');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ dataNascimento: '2025-02-20' }));
  });

  it('submits a status change selected from the dropdown', async () => {
    const onSave = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );
    await user.selectOptions(screen.getByTestId('status-select'), 'CONCLUIDO');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ status: 'CONCLUIDO' }));
  });

  it('submits an observações change (from an empty starting value)', async () => {
    const onSave = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario({ observacoes: undefined })}
        onSave={onSave}
      />
    );
    await user.type(screen.getByLabelText(/observações/i), 'Combinar entrega');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ observacoes: 'Combinar entrega' })
    );
  });

  it('closes via the Cancelar button without saving', async () => {
    const onSave = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={onOpenChange}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes without calling onSave when nothing changed', async () => {
    const onSave = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={onOpenChange}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('surfaces an error toast when saving fails', async () => {
    const { toast } = await import('sonner');
    const onSave = vi.fn(async () => {
      throw new Error('boom');
    });
    const user = userEvent.setup();
    render(
      <MesversarioEditDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onSave={onSave}
      />
    );
    const name = screen.getByLabelText(/nome do bebê/i);
    await user.clear(name);
    await user.type(name, 'Outro');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

describe('DeleteMesversarioDialog', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('warns how many linked orders will be detached', () => {
    render(
      <DeleteMesversarioDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario({
          meses: [
            baseMes(1, { pedidoId: 'p1', pedidoNumero: 'PED-0001' }),
            baseMes(2, { pedidoId: 'p2', pedidoNumero: 'PED-0002' }),
            baseMes(3),
          ],
        })}
        onConfirm={vi.fn(async () => {})}
      />
    );
    expect(screen.getByText(/2 pedido\(s\) vinculado\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Os pedidos serão mantidos/i)).toBeInTheDocument();
  });

  it('does not warn when no orders are linked', () => {
    render(
      <DeleteMesversarioDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario({ meses: [baseMes(1), baseMes(2)] })}
        onConfirm={vi.fn(async () => {})}
      />
    );
    expect(screen.queryByText(/pedido\(s\) vinculado\(s\)/i)).not.toBeInTheDocument();
  });

  it('calls onConfirm when the destructive action is confirmed', async () => {
    const onConfirm = vi.fn(async () => {});
    const user = userEvent.setup();
    render(
      <DeleteMesversarioDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onConfirm={onConfirm}
      />
    );
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('surfaces an error toast when the deletion fails', async () => {
    const { toast } = await import('sonner');
    const onConfirm = vi.fn(async () => {
      throw new Error('boom');
    });
    const user = userEvent.setup();
    render(
      <DeleteMesversarioDialog
        open
        onOpenChange={vi.fn()}
        mesversario={sampleMesversario()}
        onConfirm={onConfirm}
      />
    );
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
