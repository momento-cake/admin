'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { TimeEntry, MarkingType } from '@/types/time-tracking';
import { getNextMarkingType } from '@/lib/time-tracking-utils';

interface ClockOptions {
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: Date;
  };
}

interface UseTimeTrackingReturn {
  todayEntry: TimeEntry | null;
  loading: boolean;
  error: string | null;
  clockIn: (options?: ClockOptions) => Promise<void>;
  clockLunchOut: (options?: ClockOptions) => Promise<void>;
  clockLunchIn: (options?: ClockOptions) => Promise<void>;
  clockOut: (options?: ClockOptions) => Promise<void>;
  nextAction: MarkingType | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing today's time entry and clock operations.
 * Calls the API routes for server-side validation and persistence.
 */
export function useTimeTracking(): UseTimeTrackingReturn {
  const { user } = useAuthContext();
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayEntry = useCallback(async () => {
    if (!user) {
      setTodayEntry(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api/time-tracking?userId=${user.uid}&startDate=${today}&endDate=${today}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao buscar registro de ponto');
      }

      const result = await response.json();
      const entries = result.data as TimeEntry[];
      setTodayEntry(entries.length > 0 ? entries[0] : null);
    } catch (err) {
      console.error('Erro ao buscar registro de hoje:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar registro de ponto');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayEntry();
  }, [fetchTodayEntry]);

  const performClockOperation = useCallback(
    async (type: MarkingType, options?: ClockOptions) => {
      try {
        setError(null);

        const body: Record<string, any> = { type };
        if (options?.geolocation) {
          body.geolocation = {
            latitude: options.geolocation.latitude,
            longitude: options.geolocation.longitude,
            accuracy: options.geolocation.accuracy,
            capturedAt: options.geolocation.capturedAt.toISOString(),
          };
        }

        const response = await fetch('/api/time-tracking/clock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao registrar ponto');
        }

        setTodayEntry(result.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao registrar ponto';
        setError(message);
        throw err;
      }
    },
    []
  );

  const nextAction = todayEntry
    ? getNextMarkingType(todayEntry.markings)
    : ('clock_in' as MarkingType);

  return {
    todayEntry,
    loading,
    error,
    clockIn: (options?: ClockOptions) => performClockOperation('clock_in', options),
    clockLunchOut: (options?: ClockOptions) => performClockOperation('lunch_out', options),
    clockLunchIn: (options?: ClockOptions) => performClockOperation('lunch_in', options),
    clockOut: (options?: ClockOptions) => performClockOperation('clock_out', options),
    nextAction,
    refresh: fetchTodayEntry,
  };
}

// ---------------------------------------------------------------------------
// useTimeEntries - Fetch entries for calendar/list views
// ---------------------------------------------------------------------------

interface UseTimeEntriesReturn {
  entries: TimeEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseTimeEntriesOptions {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Hook for fetching time entries for calendar and list views.
 */
export function useTimeEntries(options?: UseTimeEntriesOptions): UseTimeEntriesReturn {
  const { user } = useAuthContext();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user || !options?.startDate || !options?.endDate) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: options.startDate,
        endDate: options.endDate,
      });

      if (options.userId) {
        params.set('userId', options.userId);
      }

      const response = await fetch(`/api/time-tracking?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao buscar registros de ponto');
      }

      const result = await response.json();
      setEntries(result.data as TimeEntry[]);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar registros de ponto');
    } finally {
      setLoading(false);
    }
  }, [user, options?.userId, options?.startDate, options?.endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
  };
}
