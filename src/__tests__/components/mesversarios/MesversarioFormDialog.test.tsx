/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Drive client selection directly.
vi.mock('@/components/pedidos/ClienteSelector', () => ({
  ClienteSelector: ({ onSelect }: any) => (
    <button
      type="button"
      data-testid="mock-select-client"
      onClick={() => onSelect({ id: 'client-1', nome: 'Maria Silva', telefone: '119' })}
    >
      Selecionar cliente
    </button>
  ),
}));

import { MesversarioFormDialog } from '@/components/mesversarios/MesversarioFormDialog';

const originalFetch = global.fetch;

function mockClientFetch(relatedPersons: any[]) {
  global.fetch = vi.fn(async (url: string, init?: any) => {
    if (typeof url === 'string' && url.includes('/api/clients/') && (!init || init.method !== 'PUT')) {
      return { ok: true, json: async () => ({ success: true, data: { relatedPersons } }) } as any;
    }
    if (typeof url === 'string' && url.includes('/api/clients/') && init?.method === 'PUT') {
      return { ok: true, json: async () => ({ success: true, data: {} }) } as any;
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as any;
}

describe('MesversarioFormDialog', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('creates a mesversario for an existing child', async () => {
    mockClientFetch([
      { id: 'rp-1', name: 'João', relationship: 'child', birthDate: '2025-01-15' },
      { id: 'rp-x', name: 'Vovó', relationship: 'parent' },
    ]);
    const createMesversario = vi.fn(async () => ({ id: 'new-1' }));
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(
      <MesversarioFormDialog
        open
        onOpenChange={vi.fn()}
        createMesversario={createMesversario}
        onCreated={onCreated}
      />
    );

    await user.click(screen.getByTestId('mock-select-client'));
    // Children load; the existing child is pre-selected. Submit.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /criar mesversário/i })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: /criar mesversário/i }));

    await waitFor(() => expect(createMesversario).toHaveBeenCalled());
    const payload = createMesversario.mock.calls[0][0];
    expect(payload.clienteId).toBe('client-1');
    expect(payload.relatedPersonId).toBe('rp-1');
    expect(payload.bebeNome).toBe('João');
    expect(payload.dataNascimento).toBe('2025-01-15');
    expect(onCreated).toHaveBeenCalledWith({ id: 'new-1' });
  });

  it('creates a child inline when the client has none, then creates the mesversario', async () => {
    mockClientFetch([]); // no children
    const createMesversario = vi.fn(async () => ({ id: 'new-2' }));
    const user = userEvent.setup();

    render(
      <MesversarioFormDialog open onOpenChange={vi.fn()} createMesversario={createMesversario} />
    );

    await user.click(screen.getByTestId('mock-select-client'));

    // The inline new-child form should appear (default selection is "new child").
    const nameInput = await screen.findByLabelText(/nome do bebê/i);
    await user.type(nameInput, 'Ana');
    const birthInput = screen.getByLabelText(/data de nascimento/i);
    await user.type(birthInput, '2025-03-10');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /criar mesversário/i })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: /criar mesversário/i }));

    await waitFor(() => expect(createMesversario).toHaveBeenCalled());
    const payload = createMesversario.mock.calls[0][0];
    expect(payload.bebeNome).toBe('Ana');
    expect(payload.dataNascimento).toBe('2025-03-10');
    expect(payload.relatedPersonId).toBeTruthy();

    // A PUT to persist the child on the client must have happened.
    const putCall = (global.fetch as any).mock.calls.find(
      (c: any) => c[1]?.method === 'PUT'
    );
    expect(putCall).toBeTruthy();
    const putBody = JSON.parse(putCall[1].body);
    expect(putBody.relatedPersons.some((p: any) => p.name === 'Ana' && p.relationship === 'child')).toBe(true);
  });

  it('keeps submit disabled until a client is chosen', () => {
    render(
      <MesversarioFormDialog open onOpenChange={vi.fn()} createMesversario={vi.fn() as any} />
    );
    expect(screen.getByRole('button', { name: /criar mesversário/i })).toBeDisabled();
  });
});
