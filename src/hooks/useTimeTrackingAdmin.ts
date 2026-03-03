'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { TimeEntry, TimeMarking } from '@/types/time-tracking';
import { format } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmployeeStatus {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  entry: TimeEntry | null;
  status: 'on_time' | 'late' | 'absent' | 'on_lunch' | 'not_clocked_out' | 'complete';
}

interface UseTimeTrackingAdminReturn {
  employees: EmployeeStatus[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  refresh: () => Promise<void>;
  updateEntry: (
    entryId: string,
    markings: TimeMarking[],
    reason: string
  ) => Promise<void>;
  justifyAbsence: (
    entryId: string,
    status: 'justified_absence' | 'absent',
    reason: string
  ) => Promise<void>;
  stats: {
    onTime: number;
    late: number;
    absent: number;
    onLunch: number;
    notClockedOut: number;
    complete: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Determine employee status from their time entry
// ---------------------------------------------------------------------------

function determineStatus(entry: TimeEntry | null): EmployeeStatus['status'] {
  if (!entry || entry.markings.length === 0) return 'absent';

  const types = entry.markings.map((m) => m.type);
  const hasClockIn = types.includes('clock_in');
  const hasLunchOut = types.includes('lunch_out');
  const hasLunchIn = types.includes('lunch_in');
  const hasClockOut = types.includes('clock_out');

  if (hasClockIn && hasLunchOut && hasLunchIn && hasClockOut) return 'complete';
  if (hasClockIn && hasLunchOut && !hasLunchIn) return 'on_lunch';
  if (hasClockIn && !hasClockOut) return 'not_clocked_out';

  return 'on_time';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Admin hook for fetching all employees' time tracking status for a given date.
 */
export function useTimeTrackingAdmin(): UseTimeTrackingAdminReturn {
  const { user } = useAuthContext();
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const fetchEmployeesStatus = useCallback(async () => {
    if (!user) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all entries for the selected date (admin API)
      const entriesResponse = await fetch(
        `/api/time-tracking?date=${selectedDate}`
      );

      if (!entriesResponse.ok) {
        const data = await entriesResponse.json();
        throw new Error(data.error || 'Erro ao buscar registros');
      }

      const entriesResult = await entriesResponse.json();
      const entries: TimeEntry[] = entriesResult.data || [];

      // Fetch all active users directly from Firestore
      // (same pattern used by UsersList.tsx)
      let users: Array<{
        uid: string;
        displayName?: string;
        email: string;
        role: { type: string };
      }> = [];

      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const roleType = data.role?.type;
        if (roleType === 'producao' || roleType === 'admin') {
          users.push({
            uid: doc.id,
            displayName: data.displayName,
            email: data.email,
            role: data.role || { type: 'producao' },
          });
        }
      });

      // Build employee status list
      const entryMap = new Map<string, TimeEntry>();
      for (const entry of entries) {
        entryMap.set(entry.userId, entry);
      }

      const employeeStatuses: EmployeeStatus[] = users.map((u) => {
        const entry = entryMap.get(u.uid) || null;
        return {
          userId: u.uid,
          displayName: u.displayName || u.email,
          email: u.email,
          role: u.role?.type || 'producao',
          entry,
          status: determineStatus(entry),
        };
      });

      // Also include entries for users not in the users list (edge case)
      for (const entry of entries) {
        if (!employeeStatuses.find((e) => e.userId === entry.userId)) {
          employeeStatuses.push({
            userId: entry.userId,
            displayName: entry.userId,
            email: '',
            role: 'producao',
            entry,
            status: determineStatus(entry),
          });
        }
      }

      setEmployees(employeeStatuses);
    } catch (err) {
      console.error('Erro ao buscar status dos funcionarios:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao buscar status dos funcionarios'
      );
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    fetchEmployeesStatus();
  }, [fetchEmployeesStatus]);

  // Admin: update an entry's markings
  const updateEntry = useCallback(
    async (
      entryId: string,
      markings: TimeMarking[],
      reason: string
    ) => {
      const response = await fetch(`/api/time-tracking/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markings, reason }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar registro');
      }

      // Refresh the list
      await fetchEmployeesStatus();
    },
    [fetchEmployeesStatus]
  );

  // Admin: justify absence (update status)
  const justifyAbsence = useCallback(
    async (
      entryId: string,
      status: 'justified_absence' | 'absent',
      reason: string
    ) => {
      const response = await fetch(`/api/time-tracking/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: { status }, reason }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao justificar falta');
      }

      await fetchEmployeesStatus();
    },
    [fetchEmployeesStatus]
  );

  // Compute stats
  const stats = {
    onTime: employees.filter((e) => e.status === 'on_time').length,
    late: employees.filter((e) => e.status === 'late').length,
    absent: employees.filter((e) => e.status === 'absent').length,
    onLunch: employees.filter((e) => e.status === 'on_lunch').length,
    notClockedOut: employees.filter((e) => e.status === 'not_clocked_out').length,
    complete: employees.filter((e) => e.status === 'complete').length,
    total: employees.length,
  };

  return {
    employees,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    refresh: fetchEmployeesStatus,
    updateEntry,
    justifyAbsence,
    stats,
  };
}
