/**
 * Time Tracking Audit Log Service
 *
 * Immutable audit trail for all time entry modifications.
 * Required by Portaria 671/2021 for REP-P compliance.
 * Audit logs cannot be updated or deleted.
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TimeEntryAuditLog, AuditChange, AuditAction } from '@/types/time-tracking';

const AUDIT_LOGS_COLLECTION = 'time_entry_audit_logs';

// ---------------------------------------------------------------------------
// Firestore Document Conversion
// ---------------------------------------------------------------------------

function toDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function docToAuditLog(docSnap: DocumentSnapshot): TimeEntryAuditLog {
  const data = docSnap.data();
  if (!data) throw new Error('Dados do log de auditoria indefinidos');

  return {
    id: docSnap.id,
    timeEntryId: data.timeEntryId,
    userId: data.userId,
    performedBy: data.performedBy,
    performedByName: data.performedByName || '',
    action: data.action as AuditAction,
    changes: (data.changes || []) as AuditChange[],
    reason: data.reason || undefined,
    timestamp: toDate(data.timestamp),
  };
}

// ---------------------------------------------------------------------------
// Query Functions
// ---------------------------------------------------------------------------

/**
 * Get audit logs for a specific time entry, ordered by most recent first.
 */
export async function getAuditLogsForEntry(
  timeEntryId: string
): Promise<TimeEntryAuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('timeEntryId', '==', timeEntryId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docToAuditLog);
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    throw new Error('Erro ao buscar logs de auditoria');
  }
}

/**
 * Get audit logs for a specific employee, ordered by most recent first.
 */
export async function getAuditLogsForEmployee(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<TimeEntryAuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);

    let logs = snapshot.docs.map(docToAuditLog);

    // Client-side date filtering if provided
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter((log) => log.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      logs = logs.filter((log) => log.timestamp <= end);
    }

    return logs;
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria do funcionário:', error);
    throw new Error('Erro ao buscar logs de auditoria');
  }
}

// Display helpers re-exported from shared utils for backwards compatibility
export { formatAuditAction, formatChangeField } from '@/lib/time-tracking-utils';
