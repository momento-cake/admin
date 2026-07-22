'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Mesversario,
  MesversarioStatus,
  CreateMesversarioData,
  UpdateMesversarioData,
} from '@/types/mesversario';
import { parseApiResponse, formatErrorMessage, logError } from '@/lib/error-handler';

interface UseMesversariosResult {
  mesversarios: Mesversario[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMesversario: (data: CreateMesversarioData) => Promise<{ id: string }>;
  updateMesversario: (id: string, data: UpdateMesversarioData) => Promise<void>;
  deleteMesversario: (id: string) => Promise<void>;
}

/**
 * List active mesversarios (optionally filtered by status), with create +
 * refresh. Mirrors the fetch/parseApiResponse pattern used across the app.
 */
export function useMesversarios(status?: MesversarioStatus): UseMesversariosResult {
  const [mesversarios, setMesversarios] = useState<Mesversario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = status ? `/api/mesversarios?status=${status}` : '/api/mesversarios';
      const response = await fetch(url);
      const data = await parseApiResponse<Mesversario[]>(response);
      setMesversarios(data ?? []);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  const refresh = useCallback(async () => {
    try {
      const url = status ? `/api/mesversarios?status=${status}` : '/api/mesversarios';
      const response = await fetch(url);
      const data = await parseApiResponse<Mesversario[]>(response);
      setMesversarios(data ?? []);
    } catch (err) {
      logError('useMesversarios.refresh', err);
      throw err;
    }
  }, [status]);

  const createMesversario = useCallback(
    async (data: CreateMesversarioData): Promise<{ id: string }> => {
      const response = await fetch('/api/mesversarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await parseApiResponse<{ id: string }>(response);
      await refresh();
      return result;
    },
    [refresh]
  );

  const updateMesversario = useCallback(
    async (id: string, data: UpdateMesversarioData): Promise<void> => {
      const response = await fetch(`/api/mesversarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await parseApiResponse(response);
      await refresh();
    },
    [refresh]
  );

  const deleteMesversario = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/mesversarios/${id}`, { method: 'DELETE' });
      await parseApiResponse(response);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    mesversarios,
    isLoading,
    error,
    refresh,
    createMesversario,
    updateMesversario,
    deleteMesversario,
  };
}
