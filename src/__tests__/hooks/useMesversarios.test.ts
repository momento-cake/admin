import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMesversarios } from '@/hooks/useMesversarios';
import { useMesversario } from '@/hooks/useMesversario';
import { useMesversariosDashboard } from '@/hooks/useMesversariosDashboard';
import type { Mesversario, MesversarioDashboardEntry } from '@/types/mesversario';

const originalFetch = global.fetch;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const sampleMesversario = (overrides: Partial<Mesversario> = {}): Mesversario =>
  ({
    id: 'm1',
    clienteId: 'c1',
    clienteNome: 'Maria',
    relatedPersonId: 'rp1',
    bebeNome: 'João',
    dataNascimento: '2025-01-15',
    status: 'ATIVO',
    meses: [
      { numero: 1, dataComemoracao: '2025-02-15', status: 'PENDENTE' },
      { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
    ],
    isActive: true,
    createdAt: {} as any,
    updatedAt: {} as any,
    createdBy: 'u1',
    lastModifiedBy: 'u1',
    ...overrides,
  }) as Mesversario;

describe('useMesversarios', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loads the list on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: true, data: [sampleMesversario()] })
    );

    const { result } = renderHook(() => useMesversarios());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mesversarios).toHaveLength(1);
    expect(result.current.mesversarios[0].bebeNome).toBe('João');
    expect(global.fetch).toHaveBeenCalledWith('/api/mesversarios');
  });

  it('passes a status filter through to the query string', async () => {
    (global.fetch as any).mockResolvedValue(jsonResponse({ success: true, data: [] }));
    renderHook(() => useMesversarios('CONCLUIDO'));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/mesversarios?status=CONCLUIDO')
    );
  });

  it('surfaces an error when the request fails', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: false, error: 'boom' }, false, 500)
    );
    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('createMesversario POSTs and refreshes the list', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [] })) // initial load
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'new-1' } })) // POST
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [sampleMesversario({ id: 'new-1' })] })); // refresh

    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: { id: string } | undefined;
    await act(async () => {
      created = await result.current.createMesversario({
        clienteId: 'c1',
        clienteNome: 'Maria',
        relatedPersonId: 'rp1',
        bebeNome: 'João',
        dataNascimento: '2025-01-15',
      });
    });

    expect(created?.id).toBe('new-1');
    const postCall = (global.fetch as any).mock.calls[1];
    expect(postCall[0]).toBe('/api/mesversarios');
    expect(postCall[1].method).toBe('POST');
    await waitFor(() => expect(result.current.mesversarios).toHaveLength(1));
  });

  it('refresh rethrows when the list request fails', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [] }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'boom' }, false, 500));
    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.refresh()).rejects.toBeTruthy();
  });

  it('updateMesversario PUTs to the detail endpoint and refreshes', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [sampleMesversario()] })) // load
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() })) // PUT
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: [sampleMesversario({ bebeNome: 'Ana' })] })
      ); // refresh

    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateMesversario('m1', { bebeNome: 'Ana' });
    });

    const putCall = (global.fetch as any).mock.calls[1];
    expect(putCall[0]).toBe('/api/mesversarios/m1');
    expect(putCall[1].method).toBe('PUT');
    await waitFor(() => expect(result.current.mesversarios[0].bebeNome).toBe('Ana'));
  });

  it('deleteMesversario DELETEs and refreshes the list', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [sampleMesversario()] })) // load
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'ok' })) // DELETE
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [] })); // refresh

    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteMesversario('m1');
    });

    const delCall = (global.fetch as any).mock.calls[1];
    expect(delCall[0]).toBe('/api/mesversarios/m1');
    expect(delCall[1].method).toBe('DELETE');
    await waitFor(() => expect(result.current.mesversarios).toHaveLength(0));
  });

  it('deleteMesversario throws when the request fails', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: [sampleMesversario()] }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'boom' }, false, 500));

    const { result } = renderHook(() => useMesversarios());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.deleteMesversario('m1')).rejects.toBeTruthy();
  });
});

describe('useMesversario', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loads a single mesversario by id', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: true, data: sampleMesversario() })
    );
    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mesversario?.id).toBe('m1');
    expect(global.fetch).toHaveBeenCalledWith('/api/mesversarios/m1');
  });

  it('updateMes PUTs to the month endpoint and refreshes', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() })) // load
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() })) // PUT
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: sampleMesversario({
            meses: [
              { numero: 1, dataComemoracao: '2025-02-15', status: 'ACORDADO' },
              { numero: 2, dataComemoracao: '2025-03-15', status: 'PENDENTE' },
            ],
          }),
        })
      ); // refresh

    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateMes(1, { status: 'ACORDADO' });
    });

    const putCall = (global.fetch as any).mock.calls[1];
    expect(putCall[0]).toBe('/api/mesversarios/m1/meses/1');
    expect(putCall[1].method).toBe('PUT');
    await waitFor(() =>
      expect(result.current.mesversario?.meses[0].status).toBe('ACORDADO')
    );
  });

  it('updateMesversario PUTs to the detail endpoint and refreshes', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: sampleMesversario({ status: 'CONCLUIDO' }) })
      );

    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateMesversario({ status: 'CONCLUIDO' });
    });

    const putCall = (global.fetch as any).mock.calls[1];
    expect(putCall[0]).toBe('/api/mesversarios/m1');
    expect(putCall[1].method).toBe('PUT');
    await waitFor(() => expect(result.current.mesversario?.status).toBe('CONCLUIDO'));
  });

  it('surfaces an error when the single-load request fails', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: false, error: 'nope' }, false, 404)
    );
    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('refresh rethrows when the request fails', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'boom' }, false, 500));
    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.refresh()).rejects.toBeTruthy();
  });

  it('deleteMesversario DELETEs the detail endpoint', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() })) // load
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'ok' })); // DELETE

    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteMesversario();
    });

    const delCall = (global.fetch as any).mock.calls[1];
    expect(delCall[0]).toBe('/api/mesversarios/m1');
    expect(delCall[1].method).toBe('DELETE');
  });

  it('deleteMesversario throws when the request fails', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: 'boom' }, false, 500));

    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.deleteMesversario()).rejects.toBeTruthy();
  });

  it('linkPedido PUTs pedido link to the month endpoint', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: sampleMesversario() }));

    const { result } = renderHook(() => useMesversario('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.linkPedido(2, 'ped-1', 'PED-0001');
    });

    const putCall = (global.fetch as any).mock.calls[1];
    expect(putCall[0]).toBe('/api/mesversarios/m1/meses/2');
    const bodyObj = JSON.parse(putCall[1].body);
    expect(bodyObj.pedidoId).toBe('ped-1');
    expect(bodyObj.pedidoNumero).toBe('PED-0001');
  });
});

describe('useMesversariosDashboard', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('derives dashboard entries from the active list', async () => {
    const entry: MesversarioDashboardEntry = {
      clienteId: 'c1',
      clienteNome: 'Maria',
      mesversarioId: 'm1',
      bebeNome: 'João',
      numero: 1,
      dataComemoracao: '2025-02-15',
      status: 'PENDENTE',
      daysUntil: 5,
      relativeLabel: 'Em 5 dias',
    };
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: true, data: [entry] })
    );

    const { result } = renderHook(() => useMesversariosDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].bebeNome).toBe('João');
    expect(global.fetch).toHaveBeenCalledWith('/api/mesversarios/dashboard');
  });

  it('surfaces an error when the dashboard request fails', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ success: false, error: 'boom' }, false, 500)
    );
    const { result } = renderHook(() => useMesversariosDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.entries).toHaveLength(0);
  });
});
