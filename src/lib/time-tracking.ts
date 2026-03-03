/**
 * Time Tracking Service
 *
 * Core CRUD and clock operations for the Controle de Ponto system.
 * Uses Firebase client SDK (matching clients.ts pattern).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  TimeEntry,
  TimeMarking,
  TimeEntrySummary,
  TimeEntryAuditLog,
  AuditChange,
  MarkingType,
  GeoLocation,
} from '@/types/time-tracking';
import { calculateEntrySummary } from '@/lib/time-tracking-calculations';
import { getNextMarkingType, formatMarkingType } from '@/lib/time-tracking-utils';
import { format } from 'date-fns';

export { getNextMarkingType, formatMarkingType };

const TIME_ENTRIES_COLLECTION = 'time_entries';
const AUDIT_LOGS_COLLECTION = 'time_entry_audit_logs';

// ---------------------------------------------------------------------------
// Firestore Document Conversion
// ---------------------------------------------------------------------------

function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function docToTimeEntry(docSnap: DocumentSnapshot): TimeEntry {
  const data = docSnap.data();
  if (!data) throw new Error('Dados do registro de ponto indefinidos');

  return {
    id: docSnap.id,
    userId: data.userId,
    date: data.date,
    markings: (data.markings || []).map((m: any) => ({
      id: m.id,
      type: m.type,
      timestamp: toDate(m.timestamp),
      geolocation: m.geolocation
        ? {
            latitude: m.geolocation.latitude,
            longitude: m.geolocation.longitude,
            accuracy: m.geolocation.accuracy,
            capturedAt: toDate(m.geolocation.capturedAt),
          }
        : undefined,
      source: m.source,
      originalTimestamp: m.originalTimestamp ? toDate(m.originalTimestamp) : undefined,
      createdAt: toDate(m.createdAt),
      createdBy: m.createdBy,
    })),
    summary: {
      totalWorkedMinutes: data.summary?.totalWorkedMinutes || 0,
      totalBreakMinutes: data.summary?.totalBreakMinutes || 0,
      regularMinutes: data.summary?.regularMinutes || 0,
      overtimeMinutes: data.summary?.overtimeMinutes || 0,
      nightMinutes: data.summary?.nightMinutes || 0,
      isRestDay: data.summary?.isRestDay || false,
      isHoliday: data.summary?.isHoliday || false,
      status: data.summary?.status || 'incomplete',
    },
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastModifiedBy: data.lastModifiedBy,
    isManualEntry: data.isManualEntry || false,
  };
}

// ---------------------------------------------------------------------------
// Marking Order Validation
// ---------------------------------------------------------------------------

const MARKING_ORDER: MarkingType[] = ['clock_in', 'lunch_out', 'lunch_in', 'clock_out'];

/**
 * Validate that a marking type is valid given the current markings.
 */
function validateMarkingOrder(existingMarkings: TimeMarking[], newType: MarkingType): string | null {
  const existingTypes = existingMarkings.map((m) => m.type);

  // Cannot duplicate a marking
  if (existingTypes.includes(newType)) {
    return `Marcação "${formatMarkingType(newType)}" já foi registrada hoje`;
  }

  // Must follow the order
  const newIndex = MARKING_ORDER.indexOf(newType);
  for (let i = 0; i < newIndex; i++) {
    if (!existingTypes.includes(MARKING_ORDER[i])) {
      return `Registre "${formatMarkingType(MARKING_ORDER[i])}" antes de "${formatMarkingType(newType)}"`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Generate unique marking ID
// ---------------------------------------------------------------------------

function generateMarkingId(): string {
  return `mk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Core Service Functions
// ---------------------------------------------------------------------------

/**
 * Get today's date as ISO string (YYYY-MM-DD).
 */
function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get today's time entry for a user. Returns null if none exists.
 */
export async function getTodayEntry(userId: string): Promise<TimeEntry | null> {
  const today = getTodayDate();
  return getTimeEntryByDate(userId, today);
}

/**
 * Get a time entry for a specific user and date.
 */
export async function getTimeEntryByDate(
  userId: string,
  date: string
): Promise<TimeEntry | null> {
  try {
    const q = query(
      collection(db, TIME_ENTRIES_COLLECTION),
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    return docToTimeEntry(snapshot.docs[0]);
  } catch (error) {
    console.error('Erro ao buscar registro de ponto:', error);
    throw new Error('Erro ao buscar registro de ponto');
  }
}

/**
 * Get a single time entry by ID.
 */
export async function getTimeEntry(entryId: string): Promise<TimeEntry> {
  try {
    const docSnap = await getDoc(doc(db, TIME_ENTRIES_COLLECTION, entryId));

    if (!docSnap.exists()) {
      throw new Error('Registro de ponto não encontrado');
    }

    return docToTimeEntry(docSnap);
  } catch (error) {
    if (error instanceof Error && error.message.includes('não encontrado')) throw error;
    console.error('Erro ao buscar registro de ponto:', error);
    throw new Error('Erro ao buscar registro de ponto');
  }
}

/**
 * Get time entries for a user within a date range.
 */
export async function getTimeEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<TimeEntry[]> {
  try {
    const q = query(
      collection(db, TIME_ENTRIES_COLLECTION),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docToTimeEntry);
  } catch (error) {
    console.error('Erro ao buscar registros de ponto:', error);
    throw new Error('Erro ao buscar registros de ponto');
  }
}

/**
 * Get all employees' entries for a specific date (admin view).
 */
export async function getAllEmployeesEntries(date: string): Promise<TimeEntry[]> {
  try {
    const q = query(
      collection(db, TIME_ENTRIES_COLLECTION),
      where('date', '==', date),
      orderBy('userId', 'asc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docToTimeEntry);
  } catch (error) {
    console.error('Erro ao buscar registros de todos os funcionários:', error);
    throw new Error('Erro ao buscar registros de ponto dos funcionários');
  }
}

// ---------------------------------------------------------------------------
// Clock Operations
// ---------------------------------------------------------------------------

interface ClockOptions {
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

/**
 * Clock in - creates a new TimeEntry for today or adds the clock_in marking.
 */
export async function clockIn(userId: string, options?: ClockOptions): Promise<TimeEntry> {
  return performClockOperation(userId, 'clock_in', options);
}

/**
 * Clock lunch out.
 */
export async function clockLunchOut(userId: string, options?: ClockOptions): Promise<TimeEntry> {
  return performClockOperation(userId, 'lunch_out', options);
}

/**
 * Clock lunch in (return from lunch).
 */
export async function clockLunchIn(userId: string, options?: ClockOptions): Promise<TimeEntry> {
  return performClockOperation(userId, 'lunch_in', options);
}

/**
 * Clock out.
 */
export async function clockOut(userId: string, options?: ClockOptions): Promise<TimeEntry> {
  return performClockOperation(userId, 'clock_out', options);
}

/**
 * Perform a clock operation (generic handler for all marking types).
 */
async function performClockOperation(
  userId: string,
  type: MarkingType,
  options?: ClockOptions
): Promise<TimeEntry> {
  const today = getTodayDate();
  const now = new Date();

  // Check for existing entry today
  let existingEntry = await getTimeEntryByDate(userId, today);

  // Build the marking
  const marking: TimeMarking = {
    id: generateMarkingId(),
    type,
    timestamp: now,
    source: 'clock',
    createdAt: now,
    createdBy: userId,
  };

  if (options?.geolocation) {
    marking.geolocation = {
      latitude: options.geolocation.latitude,
      longitude: options.geolocation.longitude,
      accuracy: options.geolocation.accuracy,
      capturedAt: now,
    };
  }

  if (existingEntry) {
    // Validate marking order
    const validationError = validateMarkingOrder(existingEntry.markings, type);
    if (validationError) {
      throw new Error(validationError);
    }

    // Add marking to existing entry
    const updatedMarkings = [...existingEntry.markings, marking];
    const updatedSummary = calculateEntrySummary(updatedMarkings);

    const docRef = doc(db, TIME_ENTRIES_COLLECTION, existingEntry.id);
    await updateDoc(docRef, {
      markings: updatedMarkings.map(markingToFirestore),
      summary: updatedSummary,
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId,
    });

    // Create audit log
    await createAuditLog({
      timeEntryId: existingEntry.id,
      userId,
      performedBy: userId,
      performedByName: '', // Will be filled by the API route
      action: 'update',
      changes: [
        {
          field: `markings.${type}`,
          oldValue: null,
          newValue: { type, timestamp: now.toISOString() },
        },
      ],
    });

    return {
      ...existingEntry,
      markings: updatedMarkings,
      summary: updatedSummary,
      updatedAt: now,
      lastModifiedBy: userId,
    };
  } else {
    // Only clock_in can create a new entry
    if (type !== 'clock_in') {
      throw new Error('Registre a entrada antes de realizar outras marcações');
    }

    const newMarkings = [marking];
    const summary = calculateEntrySummary(newMarkings);

    const entryData = {
      userId,
      date: today,
      markings: newMarkings.map(markingToFirestore),
      summary,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastModifiedBy: userId,
      isManualEntry: false,
    };

    const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), entryData);

    // Create audit log for new entry
    await createAuditLog({
      timeEntryId: docRef.id,
      userId,
      performedBy: userId,
      performedByName: '',
      action: 'create',
      changes: [
        {
          field: 'entry',
          oldValue: null,
          newValue: { date: today, type: 'clock_in' },
        },
      ],
    });

    return {
      id: docRef.id,
      userId,
      date: today,
      markings: newMarkings,
      summary,
      createdAt: now,
      updatedAt: now,
      lastModifiedBy: userId,
      isManualEntry: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Admin: Update Time Entry
// ---------------------------------------------------------------------------

/**
 * Update a time entry (admin operation). Creates an audit log entry.
 */
export async function updateTimeEntry(
  entryId: string,
  data: {
    markings?: TimeMarking[];
    summary?: Partial<TimeEntrySummary>;
  },
  performedBy: string,
  performedByName: string,
  reason: string
): Promise<TimeEntry> {
  try {
    const existing = await getTimeEntry(entryId);

    const changes: AuditChange[] = [];

    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
      lastModifiedBy: performedBy,
    };

    if (data.markings) {
      // Track changes in markings
      changes.push({
        field: 'markings',
        oldValue: existing.markings.map((m) => ({
          type: m.type,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        })),
        newValue: data.markings.map((m) => ({
          type: m.type,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        })),
      });

      // Recalculate summary with new markings
      const newSummary = calculateEntrySummary(data.markings);
      updateData.markings = data.markings.map(markingToFirestore);
      updateData.summary = newSummary;
    }

    if (data.summary?.status) {
      changes.push({
        field: 'summary.status',
        oldValue: existing.summary.status,
        newValue: data.summary.status,
      });
      if (!data.markings) {
        updateData['summary.status'] = data.summary.status;
      }
    }

    const docRef = doc(db, TIME_ENTRIES_COLLECTION, entryId);
    await updateDoc(docRef, updateData);

    // Create immutable audit log
    await createAuditLog({
      timeEntryId: entryId,
      userId: existing.userId,
      performedBy,
      performedByName,
      action: 'manual_update',
      changes,
      reason,
    });

    // Fetch and return updated entry
    return await getTimeEntry(entryId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('não encontrado')) throw error;
    console.error('Erro ao atualizar registro de ponto:', error);
    throw new Error('Erro ao atualizar registro de ponto');
  }
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

async function createAuditLog(
  data: Omit<TimeEntryAuditLog, 'id' | 'timestamp'>
): Promise<void> {
  try {
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
      ...data,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    // Audit log creation should not block the main operation
    console.error('Erro ao criar log de auditoria:', error);
  }
}

// ---------------------------------------------------------------------------
// Firestore Conversion Helpers
// ---------------------------------------------------------------------------

function markingToFirestore(marking: TimeMarking): Record<string, any> {
  return {
    id: marking.id,
    type: marking.type,
    timestamp: marking.timestamp instanceof Date
      ? Timestamp.fromDate(marking.timestamp)
      : marking.timestamp,
    geolocation: marking.geolocation
      ? {
          latitude: marking.geolocation.latitude,
          longitude: marking.geolocation.longitude,
          accuracy: marking.geolocation.accuracy,
          capturedAt: marking.geolocation.capturedAt instanceof Date
            ? Timestamp.fromDate(marking.geolocation.capturedAt)
            : marking.geolocation.capturedAt,
        }
      : null,
    source: marking.source,
    originalTimestamp: marking.originalTimestamp
      ? (marking.originalTimestamp instanceof Date
          ? Timestamp.fromDate(marking.originalTimestamp)
          : marking.originalTimestamp)
      : null,
    createdAt: marking.createdAt instanceof Date
      ? Timestamp.fromDate(marking.createdAt)
      : marking.createdAt,
    createdBy: marking.createdBy,
  };
}
