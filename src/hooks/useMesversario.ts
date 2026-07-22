'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mesversario, UpdateMesData, UpdateMesversarioData } from '@/types/mesversario';
import { parseApiResponse, formatErrorMessage, logError } from '@/lib/error-handler';

interface UseMesversarioResult {
  mesversario: Mesversario | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateMes: (numero: number, patch: UpdateMesData) => Promise<void>;
  linkPedido: (numero: number, pedidoId: string, pedidoNumero: string) => Promise<void>;
  unlinkPedido: (numero: number) => Promise<void>;
  updateMesversario: (data: UpdateMesversarioData) => Promise<void>;
}

/**
 * Load a single mesversario and mutate its months. After each month mutation we
 * refetch so the timeline reflects server-stamped fields (atualizadoEm, image
 * upload metadata, status transitions).
 */
export function useMesversario(id: string): UseMesversarioResult {
  const [mesversario, setMesversario] = useState<Mesversario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/mesversarios/${id}`);
      const data = await parseApiResponse<Mesversario>(response);
      setMesversario(data);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/mesversarios/${id}`);
      const data = await parseApiResponse<Mesversario>(response);
      setMesversario(data);
    } catch (err) {
      logError('useMesversario.refresh', err);
      throw err;
    }
  }, [id]);

  const putMes = useCallback(
    async (numero: number, body: Record<string, unknown>) => {
      const response = await fetch(`/api/mesversarios/${id}/meses/${numero}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await parseApiResponse<Mesversario>(response);
      await refresh();
    },
    [id, refresh]
  );

  const updateMes = useCallback(
    (numero: number, patch: UpdateMesData) => putMes(numero, { ...patch }),
    [putMes]
  );

  const linkPedido = useCallback(
    (numero: number, pedidoId: string, pedidoNumero: string) =>
      putMes(numero, { pedidoId, pedidoNumero }),
    [putMes]
  );

  const unlinkPedido = useCallback(
    (numero: number) => putMes(numero, { desvincular: true }),
    [putMes]
  );

  const updateMesversario = useCallback(
    async (data: UpdateMesversarioData) => {
      const response = await fetch(`/api/mesversarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await parseApiResponse<Mesversario>(response);
      await refresh();
    },
    [id, refresh]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    mesversario,
    isLoading,
    error,
    refresh,
    updateMes,
    linkPedido,
    unlinkPedido,
    updateMesversario,
  };
}
