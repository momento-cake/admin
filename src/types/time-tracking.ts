/**
 * Time Tracking Types
 *
 * Data model for the Controle de Ponto (REP-P) system.
 * Compliant with CLT Art. 73/74, Portaria 671/2021, and CCT Panificação SP 2025/2026.
 *
 * Key labor rules encoded in types:
 * - Night hour (hora noturna reduzida): 52 min 30 sec = 1 hour (CLT Art. 73)
 * - Overtime premium: 55% (CCT SP)
 * - Night premium: 37% (CCT SP)
 * - Rest day premium: 100% (CLT)
 * - Minimum hourly rate: R$ 9.68 (CCT SP)
 * - Minimum lunch break: 30 minutes (CCT SP)
 */

// ---------------------------------------------------------------------------
// Enums & Literal Types
// ---------------------------------------------------------------------------

/** Clock marking types in daily sequence order */
export type MarkingType = 'clock_in' | 'lunch_out' | 'lunch_in' | 'clock_out';

/** How a marking was created */
export type MarkingSource = 'clock' | 'manual';

/** Daily time entry status */
export type TimeEntryStatus =
  | 'incomplete'
  | 'complete'
  | 'absent'
  | 'justified_absence'
  | 'day_off';

/** Audit log action types */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'manual_create'
  | 'manual_update';

/** Lunch break compensation modes per CCT */
export type LunchCompensation =
  | 'late_entry'
  | 'early_exit'
  | 'weekly_off'
  | 'payment_55';

/** Holiday scope */
export type HolidayType = 'national' | 'state' | 'municipal';

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  capturedAt: Date;
}

// ---------------------------------------------------------------------------
// TimeMarking
// ---------------------------------------------------------------------------

export interface TimeMarking {
  id: string;
  type: MarkingType;
  timestamp: Date;

  /** Geolocation captured at clock time (recorded, not enforced) */
  geolocation?: GeoLocation;

  /** How this marking was created */
  source: MarkingSource;

  /** If edited, keeps the original timestamp */
  originalTimestamp?: Date;

  createdAt: Date;
  /** UID of creator (employee self or admin) */
  createdBy: string;
}

// ---------------------------------------------------------------------------
// TimeEntry Summary
// ---------------------------------------------------------------------------

export interface TimeEntrySummary {
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  /** Regular hours up to 8h (480 min) */
  regularMinutes: number;
  /** Minutes above 8h */
  overtimeMinutes: number;
  /** Minutes between 22:00-05:00 (in real minutes, not reduced) */
  nightMinutes: number;
  isRestDay: boolean;
  isHoliday: boolean;
  status: TimeEntryStatus;
}

// ---------------------------------------------------------------------------
// TimeEntry
// ---------------------------------------------------------------------------

export interface TimeEntry {
  id: string;
  /** Reference to users collection */
  userId: string;
  /** ISO date string 'YYYY-MM-DD' */
  date: string;

  /** Clock markings (typically 4: entry, lunch-out, lunch-in, exit) */
  markings: TimeMarking[];

  /** Computed summary, updated on each marking */
  summary: TimeEntrySummary;

  createdAt: Date;
  updatedAt: Date;
  /** UID of who last modified this entry */
  lastModifiedBy: string;
  /** True if entire entry was manually created by admin */
  isManualEntry: boolean;
}

// ---------------------------------------------------------------------------
// TimeEntry Audit Log (IMMUTABLE - no update, no delete)
// ---------------------------------------------------------------------------

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface TimeEntryAuditLog {
  id: string;
  /** Reference to time_entries */
  timeEntryId: string;
  /** Employee whose entry was modified */
  userId: string;
  /** UID of who performed the action */
  performedBy: string;
  /** Display name for readability */
  performedByName: string;

  action: AuditAction;
  changes: AuditChange[];

  /** Required for manual edits */
  reason?: string;

  timestamp: Date;
}

// ---------------------------------------------------------------------------
// WorkSchedule
// ---------------------------------------------------------------------------

export interface DaySchedule {
  isWorkDay: boolean;
  /** HH:mm format, e.g. "06:00" */
  expectedStart?: string;
  /** HH:mm format, e.g. "14:00" */
  expectedEnd?: string;
  /** Lunch break duration in minutes (min 30) */
  expectedBreakMinutes?: number;
}

/**
 * Weekly schedule keyed by day of week (0=Sunday, 6=Saturday).
 * Uses a Record instead of a plain object for type safety.
 */
export type WeeklySchedule = Record<number, DaySchedule>;

export interface WorkSchedule {
  id: string;
  /** Reference to users collection */
  userId: string;

  /** Schedule name, e.g. "Turno Manhã" */
  name: string;
  /** R$/hora (minimum R$ 9.68 per CCT SP) */
  hourlyRate: number;

  /** Expected schedule per day of week */
  weeklySchedule: WeeklySchedule;

  /** Minimum lunch break in minutes (30 per CCT) */
  lunchBreakMinimum: number;
  /** How lunch break time is compensated */
  lunchCompensation: LunchCompensation;

  /** When this schedule takes effect */
  effectiveFrom: Date;
  /** When this schedule ends (null/undefined = current) */
  effectiveTo?: Date;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// WorkplaceLocation
// ---------------------------------------------------------------------------

export interface WorkplaceLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Geofence radius for reference (meters) */
  radiusMeters: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Holiday
// ---------------------------------------------------------------------------

export interface Holiday {
  id: string;
  /** ISO date string 'YYYY-MM-DD' */
  date: string;
  name: string;
  type: HolidayType;
  year: number;

  createdAt: Date;
  createdBy: string;
}

// ---------------------------------------------------------------------------
// Payroll Calculation (computed, not stored in Firestore)
// ---------------------------------------------------------------------------

export interface PayrollCalculation {
  employeeId: string;
  period: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };

  // Hours breakdown
  regularHours: number;
  overtimeHours: number;
  /**
   * Night hours in reduced hours (1 night hour = 52 min 30 sec real time).
   * Formula: nightHours = actualNightMinutes / 52.5
   */
  nightHours: number;
  restDayHours: number;

  // Rate calculations per CCT SP
  hourlyRate: number;
  /** hourlyRate * 1.55 */
  overtimeRate: number;
  /** hourlyRate * 1.37 */
  nightRate: number;
  /** hourlyRate * 2.00 */
  restDayRate: number;

  // Monetary values
  regularPay: number;
  overtimePay: number;
  /** Night premium = nightHours * (nightRate - hourlyRate) */
  nightPremiumPay: number;
  restDayPay: number;

  // DSR (Descanso Semanal Remunerado)
  dsrValue: number;
  /** True if DSR was lost due to unjustified absence in the week */
  dsrLost: boolean;

  // Cesta Básica eligibility (Cláusula 19ª CCT)
  cestaBasicaEligible: boolean;

  // Totals
  grossPay: number;

  // Attendance metrics
  totalWorkDays: number;
  daysPresent: number;
  daysAbsent: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  tardiness: {
    count: number;
    totalMinutes: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum hourly rate per CCT Panificação SP (R$) */
export const MIN_HOURLY_RATE = 9.68;

/** Night hour duration in real minutes (CLT Art. 73) */
export const NIGHT_HOUR_MINUTES = 52.5;

/** Minimum lunch break in minutes (CCT SP) */
export const MIN_LUNCH_BREAK_MINUTES = 30;

/** Overtime multiplier (CCT SP: 55% premium) */
export const OVERTIME_MULTIPLIER = 1.55;

/** Night premium multiplier (CCT SP: 37% premium) */
export const NIGHT_MULTIPLIER = 1.37;

/** Rest day multiplier (CLT: 100% premium) */
export const REST_DAY_MULTIPLIER = 2.0;

/** Regular work day in minutes (8 hours) */
export const REGULAR_DAY_MINUTES = 480;

/** Night period start hour (22:00) */
export const NIGHT_PERIOD_START = 22;

/** Night period end hour (05:00) */
export const NIGHT_PERIOD_END = 5;

/** Cesta básica: max unjustified absences before losing benefit */
export const CESTA_BASICA_MAX_ABSENCES = 0;

/** Cesta básica: max tardiness events before losing benefit */
export const CESTA_BASICA_MAX_TARDINESS_COUNT = 5;

/** Cesta básica: max total tardiness minutes before losing benefit */
export const CESTA_BASICA_MAX_TARDINESS_MINUTES = 60;
