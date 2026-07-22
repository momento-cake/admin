'use client';

import { useCallback, useEffect, useState } from 'react';
import { MesversarioDashboardEntry } from '@/types/mesversario';
import { parseApiResponse, formatErrorMessage } from '@/lib/error-handler';

interface UseMesversariosDashboardResult {
  entries: MesversarioDashboardEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * The dashboard feed: one next-due month per active baby, sorted by proximity.
 */
export function useMesversariosDashboard(): UseMesversariosDashboardResult {
  const [entries, setEntries] = useState<MesversarioDashboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mesversarios/dashboard');
      const data = await parseApiResponse<MesversarioDashboardEntry[]>(response);
      setEntries(data ?? []);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, refresh: load };
}
