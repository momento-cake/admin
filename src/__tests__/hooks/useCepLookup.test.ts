import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCepLookup } from '@/hooks/useCepLookup';

describe('useCepLookup', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns initial state: not loading, no error', () => {
    const { result } = renderHook(() => useCepLookup());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns null and sets no error for a CEP shorter than 8 digits', async () => {
    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('123');
    });

    expect(value).toBeNull();
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('strips non-digits from CEP and calls the ViaCEP endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });

    const { result } = renderHook(() => useCepLookup());

    await act(async () => {
      await result.current.lookup('01310-100');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01310100/json/'
    );
  });

  it('returns address data on a successful lookup', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });

    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('01310-100');
    });

    expect(value).toEqual({
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      localidade: 'São Paulo',
      uf: 'SP',
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error "CEP não encontrado" when ViaCEP returns erro:true', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ erro: true }),
    });

    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('00000000');
    });

    expect(value).toBeNull();
    expect(result.current.error).toBe('CEP não encontrado');
    expect(result.current.loading).toBe(false);
  });

  it('sets error "Erro ao buscar CEP" when the fetch throws', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('01310100');
    });

    expect(value).toBeNull();
    expect(result.current.error).toBe('Erro ao buscar CEP');
    expect(result.current.loading).toBe(false);
  });

  it('sets loading=true while the request is in flight', async () => {
    let resolveFetch: (v: any) => void = () => {};
    (global.fetch as any).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useCepLookup());

    let lookupPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      lookupPromise = result.current.lookup('01310100');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolveFetch({
        json: async () => ({
          cep: '01310-100',
          logradouro: 'Av X',
          bairro: 'Y',
          localidade: 'Z',
          uf: 'SP',
        }),
      });
      await lookupPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('reset() clears error state after a failed lookup', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ erro: true }),
    });

    const { result } = renderHook(() => useCepLookup());

    await act(async () => {
      await result.current.lookup('00000000');
    });

    expect(result.current.error).toBe('CEP não encontrado');

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns empty strings for fields missing from the ViaCEP response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ cep: '01310-100' }), // all other fields missing
    });

    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('01310100');
    });

    expect(value).toEqual({
      cep: '01310-100',
      logradouro: '',
      bairro: '',
      localidade: '',
      uf: '',
    });
  });

  it('handles an empty-string CEP gracefully', async () => {
    const { result } = renderHook(() => useCepLookup());

    let value: Awaited<ReturnType<typeof result.current.lookup>> | undefined;
    await act(async () => {
      value = await result.current.lookup('');
    });

    expect(value).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears previous error when a new lookup starts', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ json: async () => ({ erro: true }) })
      .mockResolvedValueOnce({
        json: async () => ({
          cep: '01310-100',
          logradouro: 'Av Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      });

    const { result } = renderHook(() => useCepLookup());

    await act(async () => {
      await result.current.lookup('00000000');
    });
    expect(result.current.error).toBe('CEP não encontrado');

    await act(async () => {
      await result.current.lookup('01310100');
    });

    expect(result.current.error).toBeNull();
  });
});
